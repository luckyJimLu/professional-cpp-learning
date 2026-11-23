#include <array>
#include <chrono>
#include <concepts>
#include <cstddef>
#include <cstdint>
#include <iostream>
#include <span>
#include <type_traits>

using namespace std::chrono_literals;

enum class Status : std::uint8_t {
  kOk,
  kInvalidArgument,
  kTimeout,
};

class ByteTransport {
 public:
  virtual ~ByteTransport() = default;

  [[nodiscard]] virtual Status Write(
      std::span<const std::byte> bytes,
      std::chrono::milliseconds timeout) noexcept = 0;
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
              << " write bytes=" << bytes.size() << '\n';
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
    std::cout << "USB write bytes=" << bytes.size() << '\n';
    return Status::kOk;
  }

  [[nodiscard]] std::uint32_t WriteCount() const noexcept {
    return write_count_;
  }

 private:
  std::uint32_t write_count_{0U};
};

[[nodiscard]] Status SendRuntime(
    ByteTransport& transport,
    std::span<const std::byte> payload,
    std::chrono::milliseconds timeout) noexcept {
  if (payload.empty()) {
    return Status::kInvalidArgument;
  }
  return transport.Write(payload, timeout);
}

template <typename T>
concept ByteTransportLike = requires(
    T& transport,
    std::span<const std::byte> payload,
    std::chrono::milliseconds timeout) {
  { transport.Write(payload, timeout) } -> std::same_as<Status>;
};

template <ByteTransportLike T>
[[nodiscard]] Status SendStatic(
    T& transport,
    std::span<const std::byte> payload,
    std::chrono::milliseconds timeout) noexcept {
  if (payload.empty()) {
    return Status::kInvalidArgument;
  }
  return transport.Write(payload, timeout);
}

[[nodiscard]] const char* ToString(Status status) noexcept {
  switch (status) {
    case Status::kOk:
      return "ok";
    case Status::kInvalidArgument:
      return "invalid-argument";
    case Status::kTimeout:
      return "timeout";
  }
  return "unknown";
}

struct PlainTag {
  std::uint8_t value{0U};
};

struct PolymorphicTag {
  virtual ~PolymorphicTag() = default;
  std::uint8_t value{0U};
};

int main() {
  UartTransport uart{1U};
  UsbTransport usb;
  ByteTransport& runtime_selected = usb;

  const std::array<std::byte, 3> frame{
      std::byte{0x7EU}, std::byte{0x01U}, std::byte{0x7FU}};
  const std::span<const std::byte> frame_view{frame};

  const Status runtime_status = SendRuntime(runtime_selected, frame_view, 20ms);
  const Status static_status = SendStatic(uart, frame_view, 20ms);
  const Status timeout_status = SendRuntime(uart, frame_view, 0ms);
  const Status empty_status = SendStatic(
      uart, std::span<const std::byte>{}, 20ms);

  std::cout << "runtime=" << ToString(runtime_status)
            << " static=" << ToString(static_status)
            << " timeout=" << ToString(timeout_status)
            << " empty=" << ToString(empty_status) << '\n';
  std::cout << "usb_calls=" << usb.WriteCount()
            << " uart_calls=" << uart.WriteCount() << '\n';
  std::cout << std::boolalpha
            << "polymorphic=" << std::is_polymorphic_v<ByteTransport>
            << " virtual_destructor="
            << std::has_virtual_destructor_v<ByteTransport> << '\n';
  std::cout << "sizeof PlainTag=" << sizeof(PlainTag)
            << " PolymorphicTag=" << sizeof(PolymorphicTag)
            << " (ABI-dependent)\n";

  if (runtime_status != Status::kOk || static_status != Status::kOk ||
      timeout_status != Status::kTimeout ||
      empty_status != Status::kInvalidArgument || usb.WriteCount() != 1U ||
      uart.WriteCount() != 1U || !std::is_polymorphic_v<ByteTransport> ||
      !std::has_virtual_destructor_v<ByteTransport>) {
    std::cerr << "dispatch / contract check failed\n";
    return 1;
  }

  std::cout << "All virtual-dispatch and static-policy checks passed\n";
  return 0;
}
