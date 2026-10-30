#include <iostream>
#include <memory>

struct Driver {
  virtual ~Driver() = default;
  virtual void Poll() const = 0;
};

struct UartDriver final : Driver {
  void Poll() const override {
    std::cout << "UART poll\n";
  }

  void ResetFifo() const {
    std::cout << "UART FIFO reset\n";
  }
};

void ServiceDriver(const std::shared_ptr<Driver>& driver) {
  driver->Poll();

  // Code-review target:
  // A runtime cast is being used to recover a concrete capability that the
  // stable Driver interface does not express.
  if (const auto uart = std::dynamic_pointer_cast<UartDriver>(driver)) {
    uart->ResetFifo();
  }
}

int main() {
  std::shared_ptr<Driver> driver = std::make_shared<UartDriver>();
  ServiceDriver(driver);
  std::cout << "owners=" << driver.use_count() << '\n';
  return 0;
}
