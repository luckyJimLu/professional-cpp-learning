#include <cstdint>
#include <iostream>
#include <string_view>

class UartDriver {
 public:
  bool Write(std::string_view command, std::uint32_t timeout_ms) noexcept {
    ++write_count_;
    std::cout << "UART write '" << command << "' timeout=" << timeout_ms
              << " ms\n";
    return timeout_ms > 0U;
  }

  [[nodiscard]] std::uint32_t write_count() const noexcept {
    return write_count_;
  }

 private:
  std::uint32_t write_count_{0};
};

// Deliberately runnable but poorly designed starter: the HAL type and mutable
// implementation state are public, and a required borrow is represented by a
// nullable raw pointer with no enforced invariant.
class ModemController {
 public:
  UartDriver* uart_{nullptr};
  bool started_{false};
  std::uint32_t timeout_ms_{1000U};

  bool SendAt(std::string_view command) noexcept {
    if (!started_ || uart_ == nullptr) {
      return false;
    }
    return uart_->Write(command, timeout_ms_);
  }
};

int main() {
  UartDriver uart;  // The intended owner outlives the controller.
  ModemController modem;
  modem.uart_ = &uart;
  modem.started_ = true;
  modem.timeout_ms_ = 0U;  // Public state can violate the timeout invariant.

  const bool sent = modem.SendAt("AT+CSQ");
  std::cout << "send result=" << (sent ? "success" : "failure")
            << ", writes=" << uart.write_count() << '\n';
  std::cout << "controller exposes HAL pointer and mutable state: yes\n";
}
