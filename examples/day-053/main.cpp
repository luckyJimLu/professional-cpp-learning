#include <array>
#include <chrono>
#include <cstddef>
#include <iostream>
#include <span>

using namespace std::chrono_literals;

enum class Status { kOk, kTimeout, kInvalidArgument };

class IByteTransport {
 public:
  virtual ~IByteTransport() = default;
  virtual Status Write(std::span<const std::byte> data,
                       std::chrono::milliseconds timeout) = 0;
};

class FakeTransport final : public IByteTransport {
 public:
  Status Write(std::span<const std::byte> data,
               std::chrono::milliseconds timeout) override {
    if (data.empty()) return Status::kInvalidArgument;
    if (timeout <= 0ms) return Status::kTimeout;
    bytes_written_ += data.size();
    return Status::kOk;
  }
  std::size_t BytesWritten() const { return bytes_written_; }
 private:
  std::size_t bytes_written_{0};
};

class PacketSender {
 public:
  explicit PacketSender(IByteTransport& transport) : transport_{transport} {}
  Status Send(std::span<const std::byte> payload,
              std::chrono::milliseconds timeout) {
    if (payload.empty() || payload.size() > kMaxPayloadBytes) {
      return Status::kInvalidArgument;
    }
    return transport_.Write(payload, timeout);
  }
 private:
  static constexpr std::size_t kMaxPayloadBytes{64};
  IByteTransport& transport_;
};

int main() {
  FakeTransport transport;
  PacketSender sender{transport};
  const std::array<std::byte, 4> payload{};
  const auto status = sender.Send(payload, 50ms);
  std::cout << "status=" << static_cast<int>(status)
            << " bytes=" << transport.BytesWritten() << '\n';
  return status == Status::kOk ? 0 : 1;
}
