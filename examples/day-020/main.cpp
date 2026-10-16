#include <array>
#include <cassert>
#include <chrono>
#include <iostream>
#include <span>
#include <string_view>

using namespace std::chrono_literals;

enum class Status { kOk, kTimeout, kIoError, kInvalidArgument };

struct CommandOptions {
  std::chrono::milliseconds timeout{1000ms};
};

class Transport {
 public:
  virtual ~Transport() = default;
  virtual Status Exchange(std::string_view request,
                          std::span<char> response,
                          std::chrono::milliseconds timeout) = 0;
};

class FakeTransport final : public Transport {
 public:
  Status Exchange(std::string_view request,
                  std::span<char> response,
                  std::chrono::milliseconds timeout) override {
    (void)request;
    if (timeout <= 0ms) return Status::kTimeout;
    constexpr std::string_view kReply = "OK";
    if (response.size() < kReply.size()) return Status::kInvalidArgument;
    for (std::size_t i = 0; i < kReply.size(); ++i) response[i] = kReply[i];
    return Status::kOk;
  }
};

class ModemSession {
 public:
  explicit ModemSession(Transport& transport) : transport_(transport) {}

  Status SendCommand(std::string_view command,
                     std::span<char> response,
                     CommandOptions options) {
    if (command.empty() || response.empty() || options.timeout.count() <= 0) {
      return Status::kInvalidArgument;
    }
    return transport_.Exchange(command, response, options.timeout);
  }

 private:
  Transport& transport_;
};

int main() {
  FakeTransport transport;
  ModemSession session{transport};
  std::array<char, 16> buf{};

  Status s = session.SendCommand("AT", buf, CommandOptions{500ms});
  assert(s == Status::kOk);

  Status bad = session.SendCommand("", buf, CommandOptions{500ms});
  assert(bad == Status::kInvalidArgument);

  std::cout << "Command exchanged successfully with result=" << buf.data() << '\n';
  return 0;
}
