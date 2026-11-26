#include <cstdint>
#include <iostream>
#include <type_traits>

// Deliberately flawed: this type is a reusable policy, not a domain base class.
class RetryBudget {
 public:
  explicit RetryBudget(std::uint8_t retries) noexcept
      : remaining_(retries) {}

  [[nodiscard]] bool Consume() noexcept {
    if (remaining_ == 0U) {
      return false;
    }
    --remaining_;
    return true;
  }

  [[nodiscard]] std::uint8_t Remaining() const noexcept {
    return remaining_;
  }

 private:
  std::uint8_t remaining_;
};

// Design violation: public inheritance claims both classes are RetryBudgets.
class UartSender : public RetryBudget {
 public:
  explicit UartSender(std::uint8_t retries) noexcept
      : RetryBudget(retries) {}

  [[nodiscard]] bool Submit() noexcept { return Consume(); }
};

class AtCommandSession : public RetryBudget {
 public:
  explicit AtCommandSession(std::uint8_t retries) noexcept
      : RetryBudget(retries) {}

  [[nodiscard]] bool StartCommand() noexcept { return Consume(); }
};

int main() {
  UartSender uart{2U};
  AtCommandSession at_session{1U};

  std::cout << std::boolalpha
            << "UartSender is-a RetryBudget="
            << std::is_convertible_v<UartSender*, RetryBudget*> << '\n'
            << "AtCommandSession is-a RetryBudget="
            << std::is_convertible_v<AtCommandSession*, RetryBudget*> << '\n';

  // Any caller can mutate the sender's internal policy through the leaked base API.
  RetryBudget& leaked_policy = uart;
  const bool externally_consumed = leaked_policy.Consume();
  const bool submit_result = uart.Submit();
  const bool at_result = at_session.StartCommand();

  std::cout << "external_consume=" << externally_consumed
            << " uart_submit=" << submit_result
            << " uart_retries_left="
            << static_cast<unsigned>(uart.Remaining())
            << " at_start=" << at_result << '\n';

  return 0;
}
