#include <cassert>
#include <chrono>
#include <iostream>
#include <span>
#include <string>
#include <string_view>

using namespace std::chrono_literals;

enum class Status { kOk, kTimeout, kIoError };

struct SessionOptions {
  std::chrono::milliseconds timeout{1000ms};
};

class Transport {
 public:
  virtual ~Transport() = default;
  virtual Status Send(std::string_view data) = 0;
  virtual Status Receive(std::span<char> out, std::chrono::milliseconds timeout) = 0;
};

class FakeTransport final : public Transport {
 public:
  Status Send(std::string_view data) override {
    last_sent_ = data;
    return Status::kOk;
  }

  Status Receive(std::span<char> out, std::chrono::milliseconds timeout) override {
    (void)timeout;
    if (out.size() < canned_response_.size()) return Status::kIoError;
    for (std::size_t i = 0; i < canned_response_.size(); ++i) {
      out[i] = canned_response_[i];
    }
    return mock_status_;
  }

  std::string last_sent_;
  std::string canned_response_{"OK\r\n"};
  Status mock_status_{Status::kOk};
};

class ModemSession {
 public:
  ModemSession(Transport& transport, SessionOptions options)
      : transport_(transport), options_(options) {}

  Status Attach() {
    Status s = transport_.Send("AT+CFUN=1\r\n");
    if (s != Status::kOk) return s;
    char buffer[32]{};
    return transport_.Receive(buffer, options_.timeout);
  }

 private:
  Transport& transport_;
  SessionOptions options_;
};

int main() {
  FakeTransport transport;
  SessionOptions options{500ms};
  ModemSession session{transport, options};

  Status s = session.Attach();
  assert(s == Status::kOk);
  assert(transport.last_sent_ == "AT+CFUN=1\r\n");

  std::cout << "ModemSession attached successfully over FakeTransport\n";
  return 0;
}
