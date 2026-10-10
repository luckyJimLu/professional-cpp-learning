#include <array>
#include <cassert>
#include <chrono>
#include <cstddef>
#include <cstdint>
#include <span>

using namespace std::chrono_literals;

enum class Status {
  kOk,
  kInvalidArgument,
  kTimeout,
};

class ITransport {
 public:
  virtual ~ITransport() = default;
  virtual Status Write(std::span<const std::uint8_t> data,
                       std::chrono::milliseconds timeout) = 0;
};

class FakeTransport final : public ITransport {
 public:
  explicit FakeTransport(std::size_t failures_before_success)
      : failures_before_success_(failures_before_success) {}

  Status Write(std::span<const std::uint8_t> data,
               std::chrono::milliseconds timeout) override {
    if (data.empty()) {
      return Status::kInvalidArgument;
    }
    if (timeout <= 0ms) {
      return Status::kTimeout;
    }
    ++attempts_;
    if (attempts_ <= failures_before_success_) {
      return Status::kTimeout;
    }
    return Status::kOk;
  }

  [[nodiscard]] std::size_t Attempts() const { return attempts_; }

 private:
  std::size_t failures_before_success_;
  std::size_t attempts_{0};
};

class AtClient {
 public:
  explicit AtClient(ITransport& transport) : transport_(transport) {}

  Status SendOnce(std::span<const std::uint8_t> command,
                  std::chrono::milliseconds timeout) {
    return transport_.Write(command, timeout);
  }

 private:
  ITransport& transport_;
};

class RetrySender {
 public:
  explicit RetrySender(AtClient& client) : client_(client) {}

  Status Send(std::span<const std::uint8_t> command,
              std::chrono::milliseconds timeout,
              std::size_t max_attempts) {
    if (max_attempts == 0U) {
      return Status::kInvalidArgument;
    }

    Status status = Status::kTimeout;
    for (std::size_t attempt = 0; attempt < max_attempts; ++attempt) {
      status = client_.SendOnce(command, timeout);
      if (status == Status::kOk || status == Status::kInvalidArgument) {
        return status;
      }
    }
    return status;
  }

 private:
  AtClient& client_;
};

int main() {
  constexpr std::array<std::uint8_t, 4> kAtCommand{0x41, 0x54, 0x0D, 0x0A};
  constexpr std::size_t kMaxAttempts = 3U;

  FakeTransport transport{2U};
  AtClient client{transport};
  RetrySender sender{client};

  assert(sender.Send(kAtCommand, 100ms, kMaxAttempts) == Status::kOk);
  assert(transport.Attempts() == 3U);

  FakeTransport unused_transport{0U};
  AtClient unused_client{unused_transport};
  RetrySender invalid_sender{unused_client};
  assert(invalid_sender.Send(kAtCommand, 100ms, 0U) ==
         Status::kInvalidArgument);
}
