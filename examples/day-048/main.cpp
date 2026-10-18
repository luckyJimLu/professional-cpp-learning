#include <array>
#include <chrono>
#include <cstddef>
#include <cstdint>
#include <iostream>
#include <span>

enum class SendMode {
  kNormal,
  kUrgent,
};

enum class SendError {
  kNone,
  kInvalidPayload,
  kBusy,
  kTimeout,
  kTransportFailure,
};

struct SendResult {
  SendError error{SendError::kNone};
  std::size_t bytes_sent{0};

  [[nodiscard]] bool Ok() const {
    return error == SendError::kNone;
  }
};

class ByteSink {
public:
  virtual ~ByteSink() = default;

  virtual SendResult Write(std::span<const std::byte> payload,
                           std::chrono::milliseconds timeout) = 0;
};

class FakeUart final : public ByteSink {
public:
  SendResult Write(std::span<const std::byte> payload, std::chrono::milliseconds timeout) override {
    if (payload.empty()) {
      return {.error = SendError::kInvalidPayload, .bytes_sent = 0};
    }
    if (timeout <= std::chrono::milliseconds{0}) {
      return {.error = SendError::kTimeout, .bytes_sent = 0};
    }
    return {.error = SendError::kNone, .bytes_sent = payload.size()};
  }
};

class ModemTransport {
public:
  explicit ModemTransport(ByteSink& sink) : sink_{sink} {}

  [[nodiscard]] SendResult Send(std::span<const std::byte> payload,
                                std::chrono::milliseconds timeout, SendMode mode) {
    if (payload.empty()) {
      return {.error = SendError::kInvalidPayload, .bytes_sent = 0};
    }

    // Mode is explicit at the API boundary. A real implementation could map
    // urgent traffic to a bounded priority queue without changing callers.
    if (mode == SendMode::kUrgent) {
      ++urgent_count_;
    }
    return sink_.Write(payload, timeout);
  }

  [[nodiscard]] std::uint32_t UrgentCount() const {
    return urgent_count_;
  }

private:
  ByteSink& sink_;  // Required non-owning dependency.
  std::uint32_t urgent_count_{0};
};

int main() {
  FakeUart uart;
  ModemTransport transport{uart};

  constexpr std::array<std::byte, 4> kCommand{std::byte{0x41}, std::byte{0x54}, std::byte{0x0D},
                                              std::byte{0x0A}};

  const SendResult ok = transport.Send(kCommand, std::chrono::milliseconds{100}, SendMode::kNormal);
  const SendResult timeout =
      transport.Send(kCommand, std::chrono::milliseconds{0}, SendMode::kUrgent);
  const SendResult empty = transport.Send(std::span<const std::byte>{},
                                          std::chrono::milliseconds{100}, SendMode::kNormal);

  std::cout << "normal_ok=" << ok.Ok() << " bytes=" << ok.bytes_sent << '\n';
  std::cout << "timeout_ok=" << timeout.Ok() << '\n';
  std::cout << "empty_ok=" << empty.Ok() << '\n';
  std::cout << "urgent_count=" << transport.UrgentCount() << '\n';

  return (ok.Ok() && !timeout.Ok() && !empty.Ok()) ? 0 : 1;
}
