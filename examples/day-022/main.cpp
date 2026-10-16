#include <cassert>
#include <chrono>
#include <cstddef>
#include <iostream>
#include <span>
#include <string_view>

using namespace std::chrono_literals;

enum class Status { kOk, kTimeout, kIoError, kInvalidArgument };
struct SendOptions { std::chrono::milliseconds timeout{1000ms}; };

class Transport {
 public:
  virtual ~Transport() = default;
  virtual Status Send(std::span<const std::byte> data,
                      const SendOptions& options) = 0;
};

class FakeTransport final : public Transport {
 public:
  Status Send(std::span<const std::byte> data,
              const SendOptions& options) override {
    if (data.empty()) return Status::kInvalidArgument;
    if (options.timeout <= 0ms) return Status::kTimeout;
    ++send_count_;
    last_size_ = data.size();
    return Status::kOk;
  }

  [[nodiscard]] std::size_t SendCount() const { return send_count_; }
  [[nodiscard]] std::size_t LastSize() const { return last_size_; }

 private:
  std::size_t send_count_{0};
  std::size_t last_size_{0};
};

class ModemSession {
 public:
  explicit ModemSession(Transport& transport) : transport_(transport) {}

  Status Execute(std::string_view command,
                 std::chrono::milliseconds timeout) {
    if (command.empty()) return Status::kInvalidArgument;
    const auto* begin = reinterpret_cast<const std::byte*>(command.data());
    const std::span<const std::byte> bytes{begin, command.size()};
    return transport_.Send(bytes, SendOptions{.timeout = timeout});
  }

 private:
  Transport& transport_;
};

int main() {
  FakeTransport transport;
  ModemSession modem{transport};
  const Status status = modem.Execute("AT+CSQ\r\n", 500ms);
  assert(status == Status::kOk);
  std::cout << "send_count=" << transport.SendCount()
            << ", bytes=" << transport.LastSize() << '\n';
  return 0;
}
