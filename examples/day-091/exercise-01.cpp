#include <array>
#include <chrono>
#include <cstddef>
#include <cstdint>
#include <iostream>
#include <span>
#include <string_view>
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

class FakeUartTransport final : public ByteTransport {
 public:
  [[nodiscard]] Status Write(
      std::span<const std::byte> bytes,
      std::chrono::milliseconds timeout) noexcept override {
    if (timeout <= 0ms) {
      return Status::kTimeout;
    }
    if (bytes.empty()) {
      return Status::kInvalidArgument;
    }
    ++write_count_;
    std::cout << "UART raw write bytes=" << bytes.size() << '\n';
    return Status::kOk;
  }

  [[nodiscard]] std::uint32_t WriteCount() const noexcept {
    return write_count_;
  }

 private:
  std::uint32_t write_count_{0U};
};

// Intentional design defect: an orchestration facade claims to be a transport.
class ModemController final : public ByteTransport {
 public:
  explicit ModemController(ByteTransport& transport) noexcept
      : transport_(transport) {}

  [[nodiscard]] Status Write(
      std::span<const std::byte> bytes,
      std::chrono::milliseconds timeout) noexcept override {
    return transport_.Write(bytes, timeout);
  }

  [[nodiscard]] Status SendAt(std::string_view command) noexcept {
    if (command.empty() || command.size() > 30U) {
      return Status::kInvalidArgument;
    }

    std::array<std::byte, 32U> frame{};
    for (std::size_t index = 0U; index < command.size(); ++index) {
      const auto character = static_cast<unsigned char>(command[index]);
      frame[index] = static_cast<std::byte>(character);
    }
    frame[command.size()] = std::byte{0x0DU};
    frame[command.size() + 1U] = std::byte{0x0AU};
    return Write(std::span<const std::byte>{frame.data(), command.size() + 2U},
                 100ms);
  }

 private:
  ByteTransport& transport_;
};

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

int main() {
  FakeUartTransport uart;
  ModemController modem{uart};
  ByteTransport& exposed_transport = modem;
  const std::array<std::byte, 1U> raw_payload{std::byte{0xFFU}};

  const Status raw_status = exposed_transport.Write(raw_payload, 100ms);
  const Status command_status = modem.SendAt("AT");

  std::cout << "raw_write=" << ToString(raw_status)
            << " send_at=" << ToString(command_status) << '\n';
  std::cout << std::boolalpha
            << "controller_is_transport="
            << std::is_base_of_v<ByteTransport, ModemController> << '\n';
  std::cout << "uart_writes=" << uart.WriteCount() << '\n';
  std::cout << "Review finding: callers can bypass the AT command boundary through BaseTransport::Write\n";
  std::cout << "Refactor: remove public inheritance; keep ByteTransport& as a borrowed member\n";

  if (raw_status != Status::kOk || command_status != Status::kOk ||
      uart.WriteCount() != 2U ||
      !std::is_base_of_v<ByteTransport, ModemController>) {
    std::cerr << "starter behavior changed unexpectedly\n";
    return 1;
  }
  return 0;
}
