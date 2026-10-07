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

class PacketSender {
 public:
  explicit PacketSender(IByteSink& sink) : sink_(sink) {}

  Status Send(std::span<const std::uint8_t> payload,
              std::chrono::milliseconds timeout) {
    if (payload.empty()) {
      return Status::kInvalidArgument;
    }
    return sink_.Write(payload, timeout);
  }

 private:
  IByteSink& sink_;
};

class FakeSink final : public IByteSink {
 public:
  Status Write(std::span<const std::uint8_t> data,
               std::chrono::milliseconds timeout) override {
    if (timeout <= 0ms) {
      return Status::kTimeout;
    }
    bytes_written_ += data.size();
    return Status::kOk;
  }

  [[nodiscard]] std::size_t BytesWritten() const { return bytes_written_; }

 private:
  std::size_t bytes_written_{0};
};

int main() {
  constexpr std::array<std::uint8_t, 4> kPacket{0x41, 0x54, 0x0D, 0x0A};

  FakeSink sink;
  PacketSender sender{sink};

  assert(sender.Send(kPacket, 100ms) == Status::kOk);
  assert(sink.BytesWritten() == kPacket.size());

  constexpr std::array<std::uint8_t, 0> kEmpty{};
  assert(sender.Send(kEmpty, 100ms) == Status::kInvalidArgument);
  assert(sender.Send(kPacket, 0ms) == Status::kTimeout);
}
