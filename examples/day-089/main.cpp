#include <array>
#include <chrono>
#include <cstddef>
#include <cstdint>
#include <iostream>
#include <span>

using namespace std::chrono_literals;

enum class Status : std::uint8_t {
  kOk,
  kTimeout,
  kInvalidArgument,
  kNotSupported,
};

class ByteTransport {
 public:
  virtual ~ByteTransport() = default;

  [[nodiscard]] virtual Status Write(
      std::span<const std::byte> bytes,
      std::chrono::milliseconds timeout) noexcept {
    static_cast<void>(bytes);
    static_cast<void>(timeout);
    return Status::kNotSupported;
  }
};

class UartTransport final : public ByteTransport {
 public:
  explicit UartTransport(std::uint8_t port_id) noexcept
      : port_id_(port_id) {}

  [[nodiscard]] Status Write(
      std::span<const std::byte> bytes,
      std::chrono::milliseconds timeout) noexcept override {
    if (timeout <= 0ms) {
      return Status::kTimeout;
    }
    ++write_count_;
    std::cout << "UART" << static_cast<unsigned int>(port_id_)
              << " TX " << bytes.size() << " bytes\n";
    return Status::kOk;
  }

  [[nodiscard]] std::uint32_t WriteCount() const noexcept {
    return write_count_;
  }

 private:
  std::uint8_t port_id_;
  std::uint32_t write_count_{0U};
};

class UsbTransport final : public ByteTransport {
 public:
  [[nodiscard]] Status Write(
      std::span<const std::byte> bytes,
      std::chrono::milliseconds timeout) noexcept override {
    if (timeout <= 0ms) {
      return Status::kTimeout;
    }
    ++write_count_;
    std::cout << "USB TX " << bytes.size() << " bytes\n";
    return Status::kOk;
  }

  [[nodiscard]] std::uint32_t WriteCount() const noexcept {
    return write_count_;
  }

 private:
  std::uint32_t write_count_{0U};
};

class ModemSender final {
 public:
  explicit ModemSender(ByteTransport& transport) noexcept
      : transport_(transport) {}

  [[nodiscard]] Status Send(
      std::span<const std::byte> payload,
      std::chrono::milliseconds timeout) noexcept {
    if (payload.empty()) {
      return Status::kInvalidArgument;
    }
    return transport_.Write(payload, timeout);
  }

 private:
  ByteTransport& transport_;  // Borrowed; transport must outlive this sender.
};

[[nodiscard]] const char* ToString(Status status) noexcept {
  switch (status) {
    case Status::kOk:
      return "ok";
    case Status::kTimeout:
      return "timeout";
    case Status::kInvalidArgument:
      return "invalid-argument";
    case Status::kNotSupported:
      return "not-supported";
  }
  return "unknown";
}

int main() {
  UartTransport uart{1U};
  UsbTransport usb;
  ModemSender uart_sender{uart};
  ModemSender usb_sender{usb};

  const std::array<std::byte, 4> frame{
      std::byte{0x7EU}, std::byte{0x01U}, std::byte{0x02U}, std::byte{0x7FU}};
  const std::span<const std::byte> frame_view{frame};

  const Status uart_status = uart_sender.Send(frame_view, 20ms);
  const Status usb_status = usb_sender.Send(frame_view, 20ms);
  const Status timeout_status = uart_sender.Send(frame_view, 0ms);
  const Status empty_status = uart_sender.Send({}, 20ms);

  std::cout << "uart=" << ToString(uart_status)
            << " usb=" << ToString(usb_status)
            << " timeout=" << ToString(timeout_status)
            << " empty=" << ToString(empty_status) << '\n';
  std::cout << "uart_calls=" << uart.WriteCount()
            << " usb_calls=" << usb.WriteCount() << '\n';

  if (uart_status != Status::kOk || usb_status != Status::kOk ||
      timeout_status != Status::kTimeout ||
      empty_status != Status::kInvalidArgument || uart.WriteCount() != 1U ||
      usb.WriteCount() != 1U) {
    std::cerr << "virtual dispatch contract failed\n";
    return 1;
  }

  std::cout << "All virtual override checks passed\n";
  return 0;
}
