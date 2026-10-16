#include <array>
#include <cassert>
#include <chrono>
#include <cstddef>
#include <cstdint>
#include <iostream>
#include <span>

using namespace std::chrono_literals;

enum class Status { kOk, kTimeout, kIoError, kInvalidArgument };

class ITransport {
 public:
  virtual ~ITransport() = default;
  virtual Status Send(std::span<const std::byte> data,
                      std::chrono::milliseconds timeout) = 0;
};

class FakeTransport final : public ITransport {
 public:
  Status Send(std::span<const std::byte> data,
              std::chrono::milliseconds timeout) override {
    if (timeout <= 0ms || data.size() > last_frame_.size()) {
      return Status::kInvalidArgument;
    }
    for (std::size_t i = 0; i < data.size(); ++i) {
      last_frame_[i] = data[i];
    }
    last_size_ = data.size();
    return Status::kOk;
  }

  [[nodiscard]] std::size_t LastSize() const { return last_size_; }

 private:
  std::array<std::byte, 64> last_frame_{};
  std::size_t last_size_{0};
};

struct SendOptions {
  std::chrono::milliseconds timeout{1000ms};
};

class ModemSession {
 public:
  explicit ModemSession(ITransport& transport) : transport_{transport} {}

  Status Send(std::span<const std::byte> command, const SendOptions& options) {
    if (command.empty()) return Status::kInvalidArgument;
    return transport_.Send(command, options.timeout);
  }

 private:
  ITransport& transport_;
};

int main() {
  FakeTransport transport;
  ModemSession modem{transport};
  constexpr std::array command{std::byte{'A'}, std::byte{'T'}, std::byte{'\r'}};
  const Status status = modem.Send(command, SendOptions{500ms});
  assert(status == Status::kOk);
  assert(transport.LastSize() == command.size());
  std::cout << "Sent " << transport.LastSize() << " bytes successfully\n";
  return 0;
}
