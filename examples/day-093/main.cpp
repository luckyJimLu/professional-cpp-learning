#include <array>
#include <cstddef>
#include <cstdint>
#include <iostream>
#include <span>
#include <type_traits>

enum class Status : std::uint8_t {
  kOk,
  kBusy,
  kInvalidArgument,
};

[[nodiscard]] constexpr const char* ToString(Status status) noexcept {
  switch (status) {
    case Status::kOk:
      return "ok";
    case Status::kBusy:
      return "busy";
    case Status::kInvalidArgument:
      return "invalid-argument";
  }
  return "unknown";
}

// This is a genuine is-a contract: every Transport can be used by ModemSender.
class Transport {
 public:
  virtual ~Transport() = default;
  [[nodiscard]] virtual Status Write(
      std::span<const std::byte> bytes) noexcept = 0;
};

// Shared implementation is a value component, not a public base class.
class RetryBudget final {
 public:
  explicit RetryBudget(std::uint8_t retry_count) noexcept
      : initial_retries_(retry_count), remaining_retries_(retry_count) {}

  void Reset() noexcept { remaining_retries_ = initial_retries_; }

  [[nodiscard]] bool ConsumeRetry() noexcept {
    if (remaining_retries_ == 0U) {
      return false;
    }
    --remaining_retries_;
    return true;
  }

  [[nodiscard]] std::uint8_t Remaining() const noexcept {
    return remaining_retries_;
  }

 private:
  std::uint8_t initial_retries_;
  std::uint8_t remaining_retries_;
};

class UartTransport final : public Transport {
 public:
  [[nodiscard]] Status Write(
      std::span<const std::byte> bytes) noexcept override {
    ++attempt_count_;
    if (bytes.empty()) {
      return Status::kInvalidArgument;
    }
    // Simulate one transient hardware-busy result, then a successful DMA submit.
    return attempt_count_ == 1U ? Status::kBusy : Status::kOk;
  }

  [[nodiscard]] std::uint8_t AttemptCount() const noexcept {
    return attempt_count_;
  }

 private:
  std::uint8_t attempt_count_{0U};
};

class UsbTransport final : public Transport {
 public:
  [[nodiscard]] Status Write(
      std::span<const std::byte> bytes) noexcept override {
    if (bytes.empty()) {
      return Status::kInvalidArgument;
    }
    ++write_count_;
    return Status::kOk;
  }

  [[nodiscard]] std::uint8_t WriteCount() const noexcept {
    return write_count_;
  }

 private:
  std::uint8_t write_count_{0U};
};

// ModemSender owns its retry policy by value and borrows the selected transport.
class ModemSender final {
 public:
  ModemSender(Transport& transport, std::uint8_t retry_count) noexcept
      : transport_(transport), retry_budget_(retry_count) {}

  [[nodiscard]] Status Send(
      std::span<const std::byte> payload) noexcept {
    if (payload.empty()) {
      return Status::kInvalidArgument;
    }

    retry_budget_.Reset();
    for (;;) {
      const Status status = transport_.Write(payload);
      if (status != Status::kBusy) {
        return status;
      }
      if (!retry_budget_.ConsumeRetry()) {
        return Status::kBusy;
      }
    }
  }

  [[nodiscard]] std::uint8_t RemainingRetries() const noexcept {
    return retry_budget_.Remaining();
  }

 private:
  Transport& transport_;       // Borrow: Transport owner outlives ModemSender.
  RetryBudget retry_budget_;  // Own: bounded state stored directly in this object.
};

int main() {
  static_assert(std::is_base_of_v<Transport, UartTransport>);
  static_assert(std::is_base_of_v<Transport, UsbTransport>);
  static_assert(!std::is_base_of_v<RetryBudget, ModemSender>);

  UartTransport uart;
  ModemSender sender{uart, 1U};
  const std::array<std::byte, 3> frame{
      std::byte{0x41}, std::byte{0x54}, std::byte{0x0D}};

  const Status result = sender.Send(std::span<const std::byte>{frame});
  std::cout << "transport=UART result=" << ToString(result)
            << " attempts=" << static_cast<unsigned>(uart.AttemptCount())
            << " retries_left="
            << static_cast<unsigned>(sender.RemainingRetries()) << '\n';

  if (result != Status::kOk || uart.AttemptCount() != 2U) {
    return 1;
  }

  UsbTransport usb;
  ModemSender usb_sender{usb, 0U};
  const Status usb_result =
      usb_sender.Send(std::span<const std::byte>{frame});
  std::cout << "transport=USB result=" << ToString(usb_result)
            << " writes=" << static_cast<unsigned>(usb.WriteCount()) << '\n';

  if (usb_result != Status::kOk || usb.WriteCount() != 1U) {
    return 1;
  }

  std::cout << "shared retry behavior uses composition; runtime transport uses is-a\n";
  return 0;
}
