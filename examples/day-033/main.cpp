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

  virtual Status Write(
      std::span<const std::uint8_t> data,
      std::chrono::milliseconds timeout) = 0;
};

class FakeTransport final : public ITransport {
 public:
  Status Write(
      std::span<const std::uint8_t> data,
      std::chrono::milliseconds timeout) override {
    if (data.empty()) {
      return Status::kInvalidArgument;
    }

    if (timeout <= 0ms) {
      return Status::kTimeout;
    }

    ++write_count_;
    last_size_ = data.size();
    last_first_byte_ = data.front();
    return Status::kOk;
  }

  [[nodiscard]] std::size_t WriteCount() const {
    return write_count_;
  }

  [[nodiscard]] std::size_t LastSize() const {
    return last_size_;
  }

  [[nodiscard]] std::uint8_t LastFirstByte() const {
    return last_first_byte_;
  }

 private:
  std::size_t write_count_{0};
  std::size_t last_size_{0};
  std::uint8_t last_first_byte_{0};
};

class ModemSession {
 public:
  explicit ModemSession(ITransport& transport) : transport_(transport) {}

  Status Send(
      std::span<const std::uint8_t> command,
      std::chrono::milliseconds timeout) {
    return transport_.Write(command, timeout);
  }

 private:
  ITransport& transport_;
};

int main() {
  FakeTransport transport;
  ModemSession modem{transport};

  constexpr std::array<std::uint8_t, 4> kAt{
      0x41,
      0x54,
      0x0D,
      0x0A,
  };

  assert(modem.Send(kAt, 100ms) == Status::kOk);
  assert(transport.WriteCount() == 1);
  assert(transport.LastSize() == kAt.size());
  assert(transport.LastFirstByte() == 0x41);

  constexpr std::array<std::uint8_t, 0> kEmpty{};
  assert(modem.Send(kEmpty, 100ms) == Status::kInvalidArgument);
  assert(modem.Send(kAt, 0ms) == Status::kTimeout);
}
