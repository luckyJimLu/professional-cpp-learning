#include <array>
#include <chrono>
#include <cstddef>
#include <cstdint>
#include <iostream>
#include <span>

using namespace std::chrono_literals;

enum class Status : std::uint8_t {
  kOk,
  kInvalidArgument,
  kTooLarge,
  kTimeout,
};

class TxPipeline {
 public:
  virtual ~TxPipeline() = default;

  [[nodiscard]] virtual Status Send(
      std::span<const std::byte> payload,
      std::chrono::milliseconds timeout) noexcept = 0;
};

// Intentional design defect: the concrete transport is left open for inheritance.
class UartPipeline : public TxPipeline {
 public:
  static constexpr std::size_t kMaxPayloadBytes = 8U;

  [[nodiscard]] Status Send(
      std::span<const std::byte> payload,
      std::chrono::milliseconds timeout) noexcept override {
    if (payload.empty()) {
      return Status::kInvalidArgument;
    }
    if (payload.size() > kMaxPayloadBytes) {
      return Status::kTooLarge;
    }
    if (timeout <= 0ms) {
      return Status::kTimeout;
    }

    ++hardware_write_count_;
    std::cout << "uart-submit bytes=" << payload.size() << '\n';
    return Status::kOk;
  }

  [[nodiscard]] std::uint32_t HardwareWriteCount() const noexcept {
    return hardware_write_count_;
  }

 private:
  std::uint32_t hardware_write_count_{0U};
};

// Intentional design defect: overriding Send bypasses all UartPipeline checks.
class FastUartPipeline : public UartPipeline {
 public:
  [[nodiscard]] Status Send(
      std::span<const std::byte> payload,
      std::chrono::milliseconds timeout) noexcept override {
    (void)timeout;
    ++unsafe_write_count_;
    std::cout << "unsafe-fast-path bytes=" << payload.size() << '\n';
    return Status::kOk;
  }

  [[nodiscard]] std::uint32_t UnsafeWriteCount() const noexcept {
    return unsafe_write_count_;
  }

 private:
  std::uint32_t unsafe_write_count_{0U};
};

[[nodiscard]] const char* ToString(Status status) noexcept {
  switch (status) {
    case Status::kOk:
      return "ok";
    case Status::kInvalidArgument:
      return "invalid-argument";
    case Status::kTooLarge:
      return "too-large";
    case Status::kTimeout:
      return "timeout";
  }
  return "unknown";
}

int main() {
  FastUartPipeline pipeline;
  const std::array<std::byte, 9U> oversized{};

  const Status empty =
      pipeline.Send(std::span<const std::byte>{}, 20ms);
  const Status too_large =
      pipeline.Send(std::span<const std::byte>{oversized}, 20ms);

  std::cout << "empty=" << ToString(empty)
            << " oversized=" << ToString(too_large)
            << " unsafe_writes=" << pipeline.UnsafeWriteCount()
            << " base_writes=" << pipeline.HardwareWriteCount() << '\n';
  std::cout << "BUG reproduced: derived override bypassed UartPipeline validation\n";

  if (empty != Status::kOk || too_large != Status::kOk ||
      pipeline.UnsafeWriteCount() != 2U ||
      pipeline.HardwareWriteCount() != 0U) {
    std::cerr << "starter behavior changed unexpectedly\n";
    return 1;
  }
  return 0;
}
