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

struct HealthSnapshot {
  std::uint32_t write_count;
  bool ready;
};

class ITransport {
 public:
  virtual ~ITransport() = default;

  virtual Status Write(std::span<const std::uint8_t> data,
                       std::chrono::milliseconds timeout) = 0;
};

class IHealthSource {
 public:
  virtual ~IHealthSource() = default;

  [[nodiscard]] virtual HealthSnapshot ReadHealth() const = 0;
};

class UartDriver {
 public:
  explicit UartDriver(std::uint32_t baudrate_bps)
      : baudrate_bps_(baudrate_bps) {}

  Status Write(std::span<const std::uint8_t> data,
               std::chrono::milliseconds timeout) {
    if (data.empty()) {
      return Status::kInvalidArgument;
    }
    if (timeout <= 0ms) {
      return Status::kTimeout;
    }

    ++write_count_;
    return Status::kOk;
  }

  [[nodiscard]] std::size_t WriteCount() const {
    return write_count_;
  }

  [[nodiscard]] std::uint32_t BaudrateBps() const {
    return baudrate_bps_;
  }

 private:
  std::uint32_t baudrate_bps_;
  std::size_t write_count_{0};
};

class ModemEndpoint final : public ITransport,
                            public IHealthSource {
 public:
  explicit ModemEndpoint(UartDriver& uart)
      : uart_(uart) {}

  Status Write(std::span<const std::uint8_t> data,
               std::chrono::milliseconds timeout) override {
    return uart_.Write(data, timeout);
  }

  [[nodiscard]] HealthSnapshot ReadHealth() const override {
    return HealthSnapshot{
        .write_count = static_cast<std::uint32_t>(uart_.WriteCount()),
        .ready = true,
    };
  }

 private:
  UartDriver& uart_;
};

Status SendAt(ITransport& transport) {
  constexpr std::array<std::uint8_t, 4> kAt{
      0x41, 0x54, 0x0D, 0x0A};
  return transport.Write(kAt, 100ms);
}

bool IsHealthy(const IHealthSource& health_source) {
  const HealthSnapshot health = health_source.ReadHealth();
  return health.ready;
}

int main() {
  UartDriver uart{115200U};
  ModemEndpoint modem{uart};

  assert(SendAt(modem) == Status::kOk);
  assert(IsHealthy(modem));

  const HealthSnapshot health = modem.ReadHealth();
  assert(health.write_count == 1U);
  assert(uart.BaudrateBps() == 115200U);
}
