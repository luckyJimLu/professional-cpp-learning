// Starter: safely demonstrates a logical capacity leak after cancellation.
// Deterministic host exercise: no device I/O, threads, exceptions or real sleep.
#include <algorithm>
#include <array>
#include <cassert>
#include <chrono>
#include <cstddef>
#include <cstdint>
#include <iostream>
#include <limits>
#include <optional>
#include <string_view>

namespace modem {
using Time = std::chrono::milliseconds;
using namespace std::chrono_literals;
constexpr std::size_t kCapacity = 2;
constexpr std::size_t kPayloadCapacity = 8;

enum class Status {
  kOk,
  kPending,
  kFull,
  kInvalidArgument,
  kInvalidTime,
  kClosed,
  kNotFound,
  kCancelled,
  kTimeout,
  kTransportError,
  kIdExhausted
};
struct Result {
  Status status;
  std::uint64_t id = 0;  // Nonzero only for an accepted request or its terminal result.
};

class FakeTransport {
public:
  explicit FakeTransport(Time latency = 1ms) : latency_(latency) {
    assert(latency >= 0ms);
  }
  void FailNext() {
    fail_next_ = true;
  }
  void Begin(std::string_view payload, Time now) {
    assert(!active_ && payload.size() <= payload_.size());
    std::copy(payload.begin(), payload.end(), payload_.begin());
    size_ = payload.size();
    started_ = now;
    active_ = true;
    failing_ = fail_next_;
    fail_next_ = false;
    ++begins_;
  }
  [[nodiscard]] bool Ready(Time now) const {
    assert(active_ && now >= started_);
    return now - started_ >= latency_;
  }
  Status Finish() {
    assert(active_);
    active_ = false;
    return failing_ ? Status::kTransportError : Status::kOk;
  }
  void Abort() {
    if (active_) {
      active_ = false;
      ++aborts_;
    }
  }
  [[nodiscard]] std::string_view LastPayload() const {
    return {payload_.data(), size_};
  }
  [[nodiscard]] std::size_t Begins() const {
    return begins_;
  }
  [[nodiscard]] std::size_t Aborts() const {
    return aborts_;
  }

private:
  Time latency_;
  Time started_{};
  std::array<char, kPayloadCapacity> payload_{};
  std::size_t size_ = 0;
  std::size_t begins_ = 0;
  std::size_t aborts_ = 0;
  bool active_ = false;
  bool fail_next_ = false;
  bool failing_ = false;
};

// One channel borrows one transport exclusively. Transport must outlive channel.
class Channel {
public:
  explicit Channel(FakeTransport& transport) : transport_(transport) {}
  ~Channel() {
    Close();
  }
  Channel(const Channel&) = delete;
  Channel& operator=(const Channel&) = delete;
  Channel(Channel&&) = delete;
  Channel& operator=(Channel&&) = delete;

  [[nodiscard]] Result Submit(std::string_view payload, Time now, Time timeout) {
    if (closed_) return {Status::kClosed};
    if (payload.empty() || payload.size() > kPayloadCapacity || timeout <= 0ms)
      return {Status::kInvalidArgument};
    if (!Advance(now)) return {Status::kInvalidTime};
    const auto free =
        std::find_if(slots_.begin(), slots_.end(), [](const Slot& slot) { return !slot.used; });
    if (free == slots_.end()) return {Status::kFull};
    if (next_id_ == std::numeric_limits<std::uint64_t>::max())
      return {Status::kIdExhausted};  // Never wrap and reuse a live/historical ID.
    *free = {};
    std::copy(payload.begin(), payload.end(), free->payload.begin());
    free->size = payload.size();
    free->queued_at = now;
    free->timeout = timeout;
    free->id = next_id_++;
    free->used = true;
    return {Status::kOk, free->id};
  }

  // At most one terminal result per call. Deadline wins at an exact tie.
  [[nodiscard]] Result Poll(Time now) {
    if (closed_) return {Status::kClosed};
    if (!Advance(now)) return {Status::kInvalidTime};
    Slot* first = nullptr;
    for (auto& slot : slots_) {
      if (slot.used && !slot.cancelled && (!first || slot.id < first->id)) first = &slot;
    }
    if (!first) return {Status::kPending};
    const auto id = first->id;
    if (now - first->queued_at >= first->timeout) {
      Abort(id);
      *first = {};
      return {Status::kTimeout, id};
    }
    if (!active_) {
      transport_.Begin({first->payload.data(), first->size}, now);
      active_ = id;
    }
    if (!transport_.Ready(now)) return {Status::kPending};
    const auto status = transport_.Finish();
    active_.reset();
    *first = {};
    return {status, id};
  }

  // Cancellation itself is terminal; Poll must not later complete this ID again.
  [[nodiscard]] Result Cancel(std::uint64_t id) {
    if (closed_) return {Status::kClosed};
    for (auto& slot : slots_) {
      if (slot.used && !slot.cancelled && slot.id == id) {
        Abort(id);
        slot.cancelled = true;  // TODO: terminal cancellation must release capacity.
        return {Status::kCancelled, id};
      }
    }
    return {Status::kNotFound};
  }
  void Close() {
    if (closed_) return;
    if (active_) transport_.Abort();
    active_.reset();
    slots_ = {};
    closed_ = true;
  }
  [[nodiscard]] std::size_t Size() const {
    return static_cast<std::size_t>(
        std::count_if(slots_.begin(), slots_.end(), [](const Slot& slot) { return slot.used; }));
  }

private:
  struct Slot {
    std::array<char, kPayloadCapacity> payload{};
    std::size_t size = 0;
    std::uint64_t id = 0;
    Time queued_at{};
    Time timeout{};
    bool used = false;
    bool cancelled = false;
  };
  bool Advance(Time now) {
    if (now < clock_) return false;
    clock_ = now;
    return true;
  }
  void Abort(std::uint64_t id) {
    if (active_ == id) {
      transport_.Abort();
      active_.reset();
    }
  }
  FakeTransport& transport_;
  std::array<Slot, kCapacity> slots_{};
  std::optional<std::uint64_t> active_;
  Time clock_{};
  std::uint64_t next_id_ = 1;
  bool closed_ = false;
};

void CheckNormalAndSnapshot() {
  FakeTransport transport(2ms);
  Channel channel(transport);
  std::array<char, 2> input{'A', 'T'};
  const auto first = channel.Submit({input.data(), input.size()}, 0ms, 10ms);
  assert(first.status == Status::kOk && first.id != 0);
  input[0] = 'X';  // Caller may immediately reuse its input.
  assert(channel.Poll(0ms).status == Status::kPending);
  assert(transport.LastPayload() == "AT");
  const auto second = channel.Submit("B", 0ms, 10ms);
  assert(second.status == Status::kOk && second.id != first.id);
  assert(channel.Submit("C", 0ms, 10ms).status == Status::kFull);
  assert(channel.Size() == kCapacity);
  assert(channel.Poll(1ms).status == Status::kPending);
  const auto done = channel.Poll(2ms);
  assert(done.status == Status::kOk && done.id == first.id);
  assert(channel.Poll(2ms).status == Status::kPending);
  assert(transport.LastPayload() == "B");
  assert(channel.Poll(4ms).id == second.id);
  assert(channel.Size() == 0 && channel.Poll(4ms).status == Status::kPending);
}

void CheckArgumentsAndFailures() {
  FakeTransport transport(2ms);
  Channel channel(transport);
  assert(channel.Submit("", 0ms, 1ms).status == Status::kInvalidArgument);
  assert(channel.Submit("123456789", 0ms, 1ms).status == Status::kInvalidArgument);
  assert(channel.Submit("AT", 0ms, 0ms).status == Status::kInvalidArgument);
  assert(channel.Submit("AT", -1ms, 1ms).status == Status::kInvalidTime);
  assert(channel.Size() == 0);
  transport.FailNext();
  const auto request = channel.Submit("12345678", 0ms, 10ms);
  assert(request.status == Status::kOk);  // Exactly maximum payload size.
  assert(channel.Poll(0ms).status == Status::kPending);
  assert(channel.Poll(-1ms).status == Status::kInvalidTime);
  const auto failed = channel.Poll(2ms);
  assert(failed.status == Status::kTransportError && failed.id == request.id);
  assert(channel.Size() == 0 && channel.Cancel(request.id).status == Status::kNotFound);
}

void CheckDeadlines() {
  FakeTransport transport(2ms);
  Channel channel(transport);
  const auto first = channel.Submit("A", 0ms, 10ms);
  const auto queued = channel.Submit("B", 0ms, 1ms);
  assert(channel.Poll(0ms).status == Status::kPending);
  assert(channel.Poll(2ms).id == first.id);
  const auto expired = channel.Poll(2ms);
  assert(expired.status == Status::kTimeout && expired.id == queued.id);
  assert(transport.Begins() == 1);  // Expired while queued; never sent.
  const auto tie = channel.Submit("C", 2ms, 2ms);
  assert(channel.Poll(2ms).status == Status::kPending);
  const auto deadline = channel.Poll(4ms);
  assert(deadline.status == Status::kTimeout && deadline.id == tie.id);
  assert(transport.Aborts() == 1);
  assert(channel.Cancel(tie.id).status == Status::kNotFound);
  assert(channel.Poll(5ms).status == Status::kPending);  // No duplicate terminal result.
}

bool CheckCancellationRecovery() {
  bool recovered = true;
  for (const bool cancel_active : std::array{false, true}) {
    FakeTransport transport(2ms);
    Channel channel(transport);
    const auto first = channel.Submit("A", 0ms, 10ms);
    const auto second = channel.Submit("B", 0ms, 10ms);
    if (cancel_active) assert(channel.Poll(0ms).status == Status::kPending);
    const auto cancelled_id = cancel_active ? first.id : second.id;
    const auto cancelled = channel.Cancel(cancelled_id);
    assert(cancelled.status == Status::kCancelled && cancelled.id == cancelled_id);
    assert(channel.Cancel(cancelled_id).status == Status::kNotFound);
    assert(transport.Aborts() == (cancel_active ? 1U : 0U));
    const auto replacement = channel.Submit("C", 0ms, 10ms);
    recovered = recovered && channel.Size() == kCapacity && replacement.status == Status::kOk;
    channel.Close();
    assert(channel.Size() == 0);  // Even the starter safely releases all storage on close.
  }
  return recovered;
}

void CheckClose() {
  FakeTransport transport(10ms);
  {
    Channel channel(transport);
    assert(channel.Submit("AT", 0ms, 20ms).status == Status::kOk);
    assert(channel.Poll(0ms).status == Status::kPending);
    channel.Close();
    assert(transport.Aborts() == 1 && channel.Size() == 0);
    channel.Close();
    assert(transport.Aborts() == 1);
    assert(channel.Submit("AT", 0ms, 20ms).status == Status::kClosed);
    assert(channel.Poll(0ms).status == Status::kClosed);
    assert(channel.Cancel(1).status == Status::kClosed);
  }
  assert(transport.Aborts() == 1);
  {
    Channel channel(transport);
    assert(channel.Submit("AT", 0ms, 20ms).status == Status::kOk);
    assert(channel.Poll(0ms).status == Status::kPending);
  }  // Destruction also closes an active request.
  assert(transport.Aborts() == 2);
}
}  // namespace modem

int main() {
  modem::CheckNormalAndSnapshot();
  modem::CheckArgumentsAndFailures();
  modem::CheckDeadlines();
  modem::CheckClose();
  const bool recovered = modem::CheckCancellationRecovery();
  std::cout << "Common contract checks passed\n";
  std::cout << "Cancellation capacity recovered=" << recovered << '\n';
  if (!recovered) std::cout << "EXPECTED GAP: cancelled slots still consume capacity\n";
}
