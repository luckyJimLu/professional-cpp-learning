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

class TxCounterMixin {
 public:
  [[nodiscard]] std::size_t TxCount() const {
    return tx_count_;
  }

 protected:
  void RecordTx() {
    ++tx_count_;
  }

 private:
  std::size_t tx_count_{0};
};

class UartTransport final : public ITransport, private TxCounterMixin {
 public:
  explicit UartTransport(std::uint32_t baudrate_bps)
      : baudrate_bps_(baudrate_bps) {}

  using TxCounterMixin::TxCount;

  Status Write(std::span<const std::uint8_t> data,
               std::chrono::milliseconds timeout) override {
    if (data.empty()) {
      return Status::kInvalidArgument;
    }
    if (timeout <= 0ms) {
      return Status::kTimeout;
    }

    RecordTx();
    return Status::kOk;
  }

  [[nodiscard]] std::uint32_t BaudrateBps() const {
    return baudrate_bps_;
  }

 private:
  std::uint32_t baudrate_bps_;
};

class FakeTransport final : public ITransport, private TxCounterMixin {
 public:
  using TxCounterMixin::TxCount;

  Status Write(std::span<const std::uint8_t> data,
               std::chrono::milliseconds timeout) override {
    if (data.empty()) {
      return Status::kInvalidArgument;
    }
    if (timeout <= 0ms) {
      return Status::kTimeout;
    }

    RecordTx();
    return Status::kOk;
  }
};

class ModemSession {
 public:
  explicit ModemSession(ITransport& transport)
      : transport_(transport) {}

  Status Send(std::span<const std::uint8_t> command,
              std::chrono::milliseconds timeout) {
    return transport_.Write(command, timeout);
  }

 private:
  ITransport& transport_;
};

int main() {
  constexpr std::array<std::uint8_t, 4> kAt{
      0x41, 0x54, 0x0D, 0x0A};

  UartTransport uart{115200U};
  ModemSession modem{uart};

  assert(modem.Send(kAt, 100ms) == Status::kOk);
  assert(modem.Send(kAt, 100ms) == Status::kOk);
  assert(uart.TxCount() == 2U);
  assert(uart.BaudrateBps() == 115200U);

  FakeTransport fake;
  ModemSession test_modem{fake};

  assert(test_modem.Send(kAt, 50ms) == Status::kOk);
  assert(fake.TxCount() == 1U);
  assert(test_modem.Send({}, 50ms) == Status::kInvalidArgument);
  assert(test_modem.Send(kAt, 0ms) == Status::kTimeout);
}
