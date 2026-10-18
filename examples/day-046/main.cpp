#include <array>
#include <cassert>
#include <chrono>
#include <cstddef>
#include <iostream>
#include <span>

using namespace std::chrono_literals;

enum class SendStatus {
  kOk,
  kEmpty,
  kTooLarge,
  kInvalidTimeout,
  kTimeout,
};

class Transport {
public:
  virtual ~Transport() = default;
  virtual SendStatus Write(std::span<const std::byte> frame, std::chrono::milliseconds timeout) = 0;
};

class FakeTransport final : public Transport {
public:
  explicit FakeTransport(bool force_timeout = false) : force_timeout_{force_timeout} {}

  SendStatus Write(std::span<const std::byte> frame, std::chrono::milliseconds timeout) override {
    if (timeout <= 0ms || force_timeout_) {
      return SendStatus::kTimeout;
    }
    bytes_written_ += frame.size();
    return SendStatus::kOk;
  }

  [[nodiscard]] std::size_t BytesWritten() const {
    return bytes_written_;
  }

private:
  bool force_timeout_{false};
  std::size_t bytes_written_{0U};
};

class FrameSender {
public:
  static constexpr std::size_t kMaxFrameBytes{8U};

  explicit FrameSender(Transport& transport) : transport_{transport} {}

  [[nodiscard]] SendStatus Send(std::span<const std::byte> frame,
                                std::chrono::milliseconds timeout) {
    if (frame.empty()) {
      return SendStatus::kEmpty;
    }
    if (frame.size() > kMaxFrameBytes) {
      return SendStatus::kTooLarge;
    }
    if (timeout <= 0ms) {
      return SendStatus::kInvalidTimeout;
    }
    return transport_.Write(frame, timeout);
  }

private:
  Transport& transport_;
};

int main() {
  FakeTransport transport;
  FrameSender sender{transport};

  const std::array<std::byte, 4U> valid_frame{};
  const std::array<std::byte, FrameSender::kMaxFrameBytes + 1U> oversized{};
  const std::span<const std::byte> empty{};

  assert(sender.Send(empty, 10ms) == SendStatus::kEmpty);
  assert(sender.Send(oversized, 10ms) == SendStatus::kTooLarge);
  assert(sender.Send(valid_frame, 0ms) == SendStatus::kInvalidTimeout);
  assert(sender.Send(valid_frame, 10ms) == SendStatus::kOk);
  assert(transport.BytesWritten() == valid_frame.size());

  FakeTransport timeout_transport{true};
  FrameSender timeout_sender{timeout_transport};
  assert(timeout_sender.Send(valid_frame, 10ms) == SendStatus::kTimeout);

  std::cout << "Day 46 safeguards lab passed\n";
  return 0;
}
