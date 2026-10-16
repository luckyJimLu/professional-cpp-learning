#include <array>
#include <chrono>
#include <cstddef>
#include <cstdint>
#include <iostream>
#include <span>

using namespace std::chrono_literals;

enum class Status { kOk, kInvalidArgument, kTimeout, kTransportError };

class IByteTransport {
 public:
  virtual ~IByteTransport() = default;
  virtual Status Write(std::span<const std::byte> payload,
                       std::chrono::milliseconds timeout) = 0;
};

class FakeTransport final : public IByteTransport {
 public:
  Status Write(std::span<const std::byte> payload,
               std::chrono::milliseconds timeout) override {
    ++calls_;
    if (payload.empty()) return Status::kInvalidArgument;
    if (timeout <= 0ms) return Status::kTimeout;
    if (calls_ == 1U) return Status::kTransportError;
    return Status::kOk;
  }

  [[nodiscard]] std::uint8_t Calls() const { return calls_; }

 private:
  std::uint8_t calls_{0};
};

struct SendOptions {
  std::chrono::milliseconds timeout{500ms};
  std::uint8_t max_attempts{1};
};

class BoundedRetryPolicy {
 public:
  static constexpr std::uint8_t kMaxAttempts = 3;

  [[nodiscard]] bool ShouldRetry(Status status,
                                 std::uint8_t attempt,
                                 std::uint8_t requested_attempts) const {
    const auto bounded = requested_attempts > kMaxAttempts
                             ? kMaxAttempts
                             : requested_attempts;
    return status == Status::kTransportError && attempt < bounded;
  }
};

class Sender final {
 public:
  explicit Sender(IByteTransport& transport) : transport_(transport) {}

  Status Send(std::span<const std::byte> payload,
              SendOptions options = {}) {
    if (payload.empty() || options.max_attempts == 0U) {
      return Status::kInvalidArgument;
    }

    Status status = Status::kTransportError;
    for (std::uint8_t attempt = 1; attempt <= BoundedRetryPolicy::kMaxAttempts;
         ++attempt) {
      status = transport_.Write(payload, options.timeout);
      if (status == Status::kOk) return status;
      if (!retry_.ShouldRetry(status, attempt, options.max_attempts)) {
        return status;
      }
    }
    return status;
  }

 private:
  IByteTransport& transport_;  // required non-owning dependency
  BoundedRetryPolicy retry_{}; // value-owned policy
};

int main() {
  FakeTransport transport;
  Sender sender{transport};
  const std::array payload{std::byte{0x41}, std::byte{0x54}};

  const Status status = sender.Send(
      payload, SendOptions{.timeout = 100ms, .max_attempts = 2});

  std::cout << "ok=" << (status == Status::kOk)
            << " calls=" << static_cast<unsigned>(transport.Calls()) << '\n';
  return status == Status::kOk ? 0 : 1;
}
