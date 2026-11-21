#include <cstdint>
#include <iostream>
#include <string_view>

enum class Status : std::uint8_t {
  kOk,
  kInvalidBaudRate,
};

class Device {
 public:
  explicit Device(std::uint8_t id) noexcept : id_(id) {}

  void Enable() noexcept { enabled_ = true; }
  [[nodiscard]] bool IsEnabled() const noexcept { return enabled_; }
  [[nodiscard]] std::uint8_t Id() const noexcept { return id_; }

 protected:
  ~Device() noexcept = default;

 private:
  std::uint8_t id_;
  bool enabled_{false};
};

class UartPort final : public Device {
 public:
  explicit UartPort(std::uint8_t id) noexcept : Device(id) {}
  ~UartPort() = default;

  [[nodiscard]] Status ConfigureBaudRate(std::uint32_t baud_rate) noexcept {
    if (baud_rate < 9'600U || baud_rate > 3'000'000U) {
      return Status::kInvalidBaudRate;
    }
    baud_rate_ = baud_rate;
    return Status::kOk;
  }

  [[nodiscard]] std::uint32_t BaudRate() const noexcept { return baud_rate_; }

 private:
  std::uint32_t baud_rate_{115'200U};
};

void PrintCommonInfo(const Device& device, std::string_view kind) {
  std::cout << kind << " id=" << static_cast<unsigned int>(device.Id())
            << " enabled=" << (device.IsEnabled() ? "true" : "false")
            << '\n';
}

int main() {
  UartPort uart{3U};
  uart.Enable();

  if (uart.ConfigureBaudRate(921'600U) != Status::kOk) {
    std::cerr << "valid baud rate rejected\n";
    return 1;
  }

  const Device& base_view = uart;
  PrintCommonInfo(base_view, "UART");
  std::cout << "baud=" << uart.BaudRate() << '\n';

  if (uart.ConfigureBaudRate(0U) != Status::kInvalidBaudRate) {
    std::cerr << "invalid baud rate accepted\n";
    return 2;
  }
  if (uart.BaudRate() != 921'600U) {
    std::cerr << "invalid configuration changed state\n";
    return 3;
  }

  std::cout << "invalid baud rejected; current=" << uart.BaudRate() << '\n';
  std::cout << "All inheritance extension checks passed\n";
  return 0;
}
