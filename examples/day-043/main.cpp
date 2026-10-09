#include <array>
#include <cassert>
#include <chrono>
#include <cstddef>
#include <cstdint>
#include <span>

using namespace std::chrono_literals;

enum class Status { kOk, kInvalidArgument, kTimeout, kNoSpace };

class IByteSink {
 public:
  virtual ~IByteSink() = default;
  virtual Status Write(std::span<const std::uint8_t> data,
                       std::chrono::milliseconds timeout) = 0;
};

class FixedBufferSink final : public IByteSink {
 public:
  Status Write(std::span<const std::uint8_t> data,
               std::chrono::milliseconds timeout) override {
    if (data.empty()) return Status::kInvalidArgument;
    if (timeout <= 0ms) return Status::kTimeout;
    if (data.size() > buffer_.size()) return Status::kNoSpace;
    for (std::size_t i = 0; i < data.size(); ++i) buffer_[i] = data[i];
    size_ = data.size();
    return Status::kOk;
  }

  [[nodiscard]] std::size_t Size() const { return size_; }

 private:
  std::array<std::uint8_t, 32> buffer_{};
  std::size_t size_{0};
};

class FakeSink final : public IByteSink {
 public:
  Status Write(std::span<const std::uint8_t> data,
               std::chrono::milliseconds timeout) override {
    if (data.empty()) return Status::kInvalidArgument;
    if (timeout <= 0ms) return Status::kTimeout;
    ++write_count_;
    return Status::kOk;
  }

  [[nodiscard]] std::size_t WriteCount() const { return write_count_; }

 private:
  std::size_t write_count_{0};
};

class AtClient {
 public:
  explicit AtClient(IByteSink& sink) : sink_(sink) {}

  Status Send(std::span<const std::uint8_t> command,
              std::chrono::milliseconds timeout) {
    if (command.empty()) return Status::kInvalidArgument;
    return sink_.Write(command, timeout);
  }

 private:
  IByteSink& sink_;
};

int main() {
  constexpr std::array<std::uint8_t, 4> kAt{0x41, 0x54, 0x0D, 0x0A};

  FixedBufferSink production_sink;
  AtClient production_client{production_sink};
  assert(production_client.Send(kAt, 100ms) == Status::kOk);
  assert(production_sink.Size() == kAt.size());

  FakeSink fake_sink;
  AtClient test_client{fake_sink};
  assert(test_client.Send(kAt, 50ms) == Status::kOk);
  assert(fake_sink.WriteCount() == 1U);
  assert(test_client.Send({}, 50ms) == Status::kInvalidArgument);
}