#include <array>
#include <chrono>
#include <cstddef>
#include <cstdint>
#include <iostream>
#include <span>

using namespace std::chrono_literals;

enum class Status { kOk, kInvalidArgument, kTimeout, kTransportError };
enum class Priority { kNormal, kHigh };

struct SendOptions {
  std::chrono::milliseconds timeout{200};
  std::uint8_t max_attempts{1};
  Priority priority{Priority::kNormal};
};

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
    if (payload.empty()) {
      return Status::kInvalidArgument;
    }
    if (timeout <= 0ms) {
      return Status::kTimeout;
    }
    ++write_count_;
    return Status::kOk;
  }

  [[nodiscard]] std::uint32_t WriteCount() const { return write_count_; }

 private:
  std::uint32_t write_count_{0};
};

class Sender final {
 public:
  static constexpr std::uint8_t kMaxAttempts = 3;

  explicit Sender(IByteTransport& transport) : transport_(transport) {}

  Status Send(std::span<const std::byte> payload) {
    return SendWith(payload, SendOptions{});
  }

  Status SendWith(std::span<const std::byte> payload, SendOptions options) {
    if (payload.empty() || options.timeout <= 0ms ||
        options.max_attempts == 0 || options.max_attempts > kMaxAttempts) {
      return Status::kInvalidArgument;
    }

    Status status = Status::kTransportError;
    for (std::uint8_t attempt = 0; attempt < options.max_attempts; ++attempt) {
      status = transport_.Write(payload, options.timeout);
      if (status == Status::kOk) {
        return status;
      }
    }
    return status;
  }

 private:
  IByteTransport& transport_;
};

int main() {
  FakeTransport transport;
  Sender sender{transport};

  const std::array payload{std::byte{0x41}, std::byte{0x54}};

  const Status common_status = sender.Send(payload);

  const SendOptions advanced{
      .timeout = 500ms,
      .max_attempts = 2,
      .priority = Priority::kHigh,
  };
  const Status advanced_status = sender.SendWith(payload, advanced);

  std::cout << "common=" << (common_status == Status::kOk)
            << " advanced=" << (advanced_status == Status::kOk)
            << " writes=" << transport.WriteCount() << '\n';
}
