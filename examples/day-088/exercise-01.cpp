#include <cstdint>
#include <iostream>
#include <string_view>

enum class Status : std::uint8_t {
  kOk,
  kBusy,
  kNotReady,
};

class UartDriver {
 public:
  [[nodiscard]] Status Write(std::string_view bytes) noexcept {
    if (!ready_) {
      return Status::kNotReady;
    }
    std::cout << "UART TX: " << bytes << '\n';
    return Status::kOk;
  }

  void Reset() noexcept {
    ready_ = false;
    std::cout << "UART reset: link disabled\n";
  }

 private:
  bool ready_{true};
};

// Intentional design flaw: an AT channel is not a UART driver.
// Public inheritance leaks Reset() and Write() into the protocol API.
class AtCommandChannel : public UartDriver {
 public:
  [[nodiscard]] Status SendCommand(std::string_view command) noexcept {
    if (command_in_flight_) {
      return Status::kBusy;
    }
    command_in_flight_ = true;
    const Status status = Write(command);
    if (status != Status::kOk) {
      command_in_flight_ = false;
    }
    return status;
  }

  void Complete() noexcept {
    command_in_flight_ = false;
    std::cout << "AT transaction complete\n";
  }

  [[nodiscard]] bool IsBusy() const noexcept { return command_in_flight_; }

 private:
  bool command_in_flight_{false};
};

[[nodiscard]] const char* ToString(Status status) noexcept {
  switch (status) {
    case Status::kOk:
      return "ok";
    case Status::kBusy:
      return "busy";
    case Status::kNotReady:
      return "not-ready";
  }
  return "unknown";
}

int main() {
  AtCommandChannel channel;
  if (channel.SendCommand("AT+CSQ") != Status::kOk) {
    std::cerr << "initial command failed\n";
    return 1;
  }

  std::cout << "busy before reset=" << (channel.IsBusy() ? "true" : "false")
            << '\n';

  // The inherited operation bypasses the AT channel's protocol state machine.
  channel.Reset();
  std::cout << "busy after reset=" << (channel.IsBusy() ? "true" : "false")
            << '\n';
  channel.Complete();

  const Status next_status = channel.SendCommand("AT");
  std::cout << "next send status=" << ToString(next_status) << '\n';
  if (next_status != Status::kNotReady) {
    std::cerr << "expected the reset driver to reject the next write\n";
    return 2;
  }

  std::cout << "Observed: public inheritance exposed a low-level reset path\n";
  return 0;
}
