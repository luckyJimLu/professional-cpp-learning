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

class IByteSink {
 public:
  virtual ~IByteSink() = default;

  virtual Status Write(std::span<const std::uint8_t> data,
                       std::chrono::milliseconds timeout) = 0;
};

class UartSink final : public IByteSink {
 public:
  explicit UartSink(std::uint32_t baudrate_bps)
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

  [[nodiscard]] std::size_t WriteCount() const { return write_count_; }
  [[nodiscard]] std::uint32_t BaudrateBps() const { return baudrate_bps_; }

 private:
  std::uint32_t baudrate_bps_;
  std::size_t write_count_{0};
};

class FakeSink final : public IByteSink {
 public:
  Status Write(std::span<const std::uint8_t> data,
               std::chrono::milliseconds timeout) override {
    if (data.empty()) {
      return Status::kInvalidArgument;
    }
    if (timeout <= 0ms) {
      return Status::kTimeout;
    }

    last_size_ = data.size();
    return Status::kOk;
  }

  [[nodiscard]] std::size_t LastSize() const { return last_size_; }

 private:
  std::size_t last_size_{0};
};

class AtCommandClient {
 public:
  explicit AtCommandClient(IByteSink& sink) : sink_(sink) {}

  Status Send(std::span<const std::uint8_t> command,
              std::chrono::milliseconds timeout) {
    if (command.empty()) {
      return Status::kInvalidArgument;
    }
    return sink_.Write(command, timeout);
  }

 private:
  IByteSink& sink_;
};

int main() {
  constexpr std::array<std::uint8_t, 4> kAtCommand{
      0x41, 0x54, 0x0D, 0x0A};

  UartSink uart{115200U};
  AtCommandClient production_client{uart};
  assert(production_client.Send(kAtCommand, 100ms) == Status::kOk);
  assert(uart.WriteCount() == 1U);
  assert(uart.BaudrateBps() == 115200U);

  FakeSink fake;
  AtCommandClient test_client{fake};
  assert(test_client.Send(kAtCommand, 50ms) == Status::kOk);
  assert(fake.LastSize() == kAtCommand.size());

  const std::span<const std::uint8_t> empty{};
  assert(test_client.Send(empty, 50ms) == Status::kInvalidArgument);
  assert(test_client.Send(kAtCommand, 0ms) == Status::kTimeout);
}
