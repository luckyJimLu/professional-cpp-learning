#include <array>
#include <cassert>
#include <chrono>
#include <cstddef>
#include <cstdint>
#include <span>

using namespace std::chrono_literals;

enum class Status {
  kOk,
  kInvalidArgument,
  kTimeout,
};

class ITransport {
 public:
  virtual ~ITransport() = default;

  virtual Status Write(std::span<const std::uint8_t> data,
                       std::chrono::milliseconds timeout) = 0;
};

class UartTransport final : public ITransport {
 public:
  explicit UartTransport(std::uint32_t baudrate_bps)
      : baudrate_bps_(baudrate_bps) {}

  Status Write(std::span<const std::uint8_t> data,
               std::chrono::milliseconds timeout) override {
    if (data.empty()) {
      return Status::kInvalidArgument;
    }
    if (timeout <= 0ms) {
      return Status::kTimeout;
    }

    ++write_count_;
    last_size_ = data.size();
    return Status::kOk;
  }

  [[nodiscard]] std::size_t WriteCount() const { return write_count_; }
  [[nodiscard]] std::size_t LastSize() const { return last_size_; }
  [[nodiscard]] std::uint32_t BaudrateBps() const { return baudrate_bps_; }

 private:
  std::uint32_t baudrate_bps_;
  std::size_t write_count_{0};
  std::size_t last_size_{0};
};

class FakeTransport final : public ITransport {
 public:
  Status Write(std::span<const std::uint8_t> data,
               std::chrono::milliseconds timeout) override {
    if (data.empty()) {
      return Status::kInvalidArgument;
    }
    if (timeout <= 0ms) {
      return Status::kTimeout;
    }

    ++write_count_;
    last_size_ = data.size();
    return Status::kOk;
  }

  [[nodiscard]] std::size_t WriteCount() const { return write_count_; }
  [[nodiscard]] std::size_t LastSize() const { return last_size_; }

 private:
  std::size_t write_count_{0};
  std::size_t last_size_{0};
};

class ModemSession {
 public:
  explicit ModemSession(ITransport& transport) : transport_(transport) {}

  Status Send(std::span<const std::uint8_t> command,
              std::chrono::milliseconds timeout) {
    if (command.empty()) {
      return Status::kInvalidArgument;
    }
    return transport_.Write(command, timeout);
  }

 private:
  ITransport& transport_;
};

Status SendCommand(ITransport& transport,
                   std::span<const std::uint8_t> command,
                   std::chrono::milliseconds timeout) {
  return transport.Write(command, timeout);
}

int main() {
  constexpr std::array<std::uint8_t, 4> kAtCommand{
      0x41, 0x54, 0x0D, 0x0A};

  UartTransport uart{115200U};
  ITransport& base_ref = uart;

  assert(SendCommand(base_ref, kAtCommand, 100ms) == Status::kOk);
  assert(uart.WriteCount() == 1U);
  assert(uart.LastSize() == kAtCommand.size());
  assert(uart.BaudrateBps() == 115200U);

  FakeTransport fake;
  ModemSession modem{fake};

  assert(modem.Send(kAtCommand, 50ms) == Status::kOk);
  assert(fake.WriteCount() == 1U);
  assert(fake.LastSize() == kAtCommand.size());

  assert(modem.Send({}, 50ms) == Status::kInvalidArgument);
  assert(modem.Send(kAtCommand, 0ms) == Status::kTimeout);
}
