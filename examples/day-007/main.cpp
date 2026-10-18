#include <array>
#include <cassert>
#include <chrono>
#include <cstdint>
#include <span>

using namespace std::chrono_literals;

enum class Status {
  kOk,
  kTimeout,
  kInvalidArgument,
};

class ITransport {
public:
  virtual ~ITransport() = default;
  virtual Status Write(std::span<const std::uint8_t> data, std::chrono::milliseconds timeout) = 0;
};

class FakeTransport final : public ITransport {
public:
  Status Write(std::span<const std::uint8_t> data, std::chrono::milliseconds timeout) override {
    if (data.empty()) {
      return Status::kInvalidArgument;
    }
    if (timeout <= 0ms) {
      return Status::kTimeout;
    }
    last_size_ = data.size();
    return Status::kOk;
  }

  [[nodiscard]] std::size_t LastSize() const {
    return last_size_;
  }

private:
  std::size_t last_size_{0};
};

class ModemController {
public:
  explicit ModemController(ITransport& transport) : transport_(transport) {}

  Status SendAt(std::span<const std::uint8_t> command, std::chrono::milliseconds timeout) {
    return transport_.Write(command, timeout);
  }

private:
  ITransport& transport_;
};

int main() {
  FakeTransport transport;
  ModemController modem{transport};

  constexpr std::array<std::uint8_t, 4> kAt{0x41, 0x54, 0x0D, 0x0A};

  assert(modem.SendAt(kAt, 100ms) == Status::kOk);
  assert(transport.LastSize() == kAt.size());
}
