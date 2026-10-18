#include <array>
#include <cassert>
#include <chrono>
#include <cstddef>
#include <cstdint>
#include <iostream>
#include <span>

using namespace std::chrono_literals;

enum class Status { kOk, kInvalidArgument, kBufferTooSmall, kTimeout };

class ITransport {
public:
  virtual ~ITransport() = default;
  virtual Status Write(std::span<const std::uint8_t> data, std::chrono::milliseconds timeout) = 0;
};

class FakeTransport final : public ITransport {
public:
  Status Write(std::span<const std::uint8_t> data, std::chrono::milliseconds timeout) override {
    if (timeout <= 0ms) return Status::kTimeout;
    if (data.size() > buffer_.size()) return Status::kBufferTooSmall;
    size_ = data.size();
    for (std::size_t i = 0; i < size_; ++i) {
      buffer_[i] = data[i];
    }
    return Status::kOk;
  }

  [[nodiscard]] std::size_t Size() const {
    return size_;
  }

private:
  static constexpr std::size_t kCapacity = 64;
  std::array<std::uint8_t, kCapacity> buffer_{};
  std::size_t size_ = 0;
};

class ModemSession {
public:
  explicit ModemSession(ITransport& transport) : transport_(transport) {}

  Status Send(std::span<const std::uint8_t> data, std::chrono::milliseconds timeout) {
    if (data.empty()) return Status::kInvalidArgument;
    return transport_.Write(data, timeout);
  }

private:
  ITransport& transport_;
};

int main() {
  FakeTransport transport;
  ModemSession modem{transport};
  constexpr std::array<std::uint8_t, 4> command{0x41, 0x54, 0x0D, 0x0A};
  assert(modem.Send(command, 100ms) == Status::kOk);
  assert(transport.Size() == command.size());
  const std::span<const std::uint8_t> empty;
  assert(modem.Send(empty, 100ms) == Status::kInvalidArgument);
  assert(modem.Send(command, 0ms) == Status::kTimeout);
  std::cout << "ModemSession verified with size=" << transport.Size() << '\n';
  return 0;
}
