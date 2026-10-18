#include <iostream>

class ResetPolicy {
public:
  virtual ~ResetPolicy() = default;
  virtual bool Reset() = 0;
};

class GpioResetPolicy final : public ResetPolicy {
public:
  bool Reset() override {
    std::cout << "reset via GPIO\n";
    return true;
  }
};

class AtResetPolicy final : public ResetPolicy {
public:
  bool Reset() override {
    std::cout << "reset via AT command\n";
    return true;
  }
};

class ModemController {
public:
  explicit ModemController(ResetPolicy& reset_policy) : reset_policy_{reset_policy} {}

  bool Recover() {
    return reset_policy_.Reset();
  }

private:
  ResetPolicy& reset_policy_;
};

int main() {
  GpioResetPolicy gpio_reset;
  AtResetPolicy at_reset;

  ModemController board_a{gpio_reset};
  ModemController board_b{at_reset};

  const bool board_a_ok = board_a.Recover();
  const bool board_b_ok = board_b.Recover();

  if (!board_a_ok || !board_b_ok) {
    return 1;
  }
  return 0;
}
