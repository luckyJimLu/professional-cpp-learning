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
    return Status::kOk;
  }

  [[nodiscard]] std::size_t WriteCount() const {
    return write_count_;
  }

 private:
  std::size_t write_count_{0};
};

class TracingTransport final : public ITransport {
 public:
  explicit TracingTransport(ITransport& inner)
      : inner_(inner) {}

  Status Write(std::span<const std::uint8_t> data,
               std::chrono::milliseconds timeout) override {
    ++trace_count_;
    return inner_.Write(data, timeout);
  }

  [[nodiscard]] std::size_t TraceCount() const {
    return trace_count_;
  }

 private:
  ITransport& inner_;
  std::size_t trace_count_{0};
};

class ModemSession {
 public:
  explicit ModemSession(ITransport& transport)
      : transport_(transport) {}

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

int main() {
  constexpr std::array<std::uint8_t, 4> kAt{
      0x41, 0x54, 0x0D, 0x0A};

  UartTransport uart{115200U};
  TracingTransport traced{uart};
  ModemSession modem{traced};

  assert(modem.Send(kAt, 100ms) == Status::kOk);
  assert(traced.TraceCount() == 1U);
  assert(uart.WriteCount() == 1U);
  assert(uart.BaudrateBps() == 115200U);

  FakeTransport fake;
  ModemSession test_modem{fake};

  assert(test_modem.Send(kAt, 50ms) == Status::kOk);
  assert(fake.WriteCount() == 1U);
}
