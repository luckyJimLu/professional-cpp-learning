#include <array>
#include <cassert>
#include <chrono>
#include <cstdint>
#include <iostream>
#include <span>

enum class Status { Ok, InvalidTimeout, EmptyBuffer, IoError };
class ITransport {
public:
  virtual ~ITransport() = default;
  virtual Status Write(std::span<const std::uint8_t> data, std::chrono::milliseconds timeout) = 0;
};
class UartTransport final : public ITransport {
public:
  Status Write(std::span<const std::uint8_t> data, std::chrono::milliseconds timeout) override {
    if (timeout.count() <= 0) {
      return Status::InvalidTimeout;
    }
    if (data.empty()) {
      return Status::EmptyBuffer;
    }
    // Classroom stub: real platform code must implement timeout and I/O.
    return Status::Ok;
  }
};
class FakeTransport final : public ITransport {
public:
  Status next_status{Status::Ok};
  int writes{0};
  Status Write(std::span<const std::uint8_t> data, std::chrono::milliseconds timeout) override {
    if (timeout.count() <= 0) {
      return Status::InvalidTimeout;
    }
    if (data.empty()) {
      return Status::EmptyBuffer;
    }
    ++writes;
    return next_status;
  }
};
class ModemSession {
public:
  explicit ModemSession(ITransport& transport) : transport_{transport} {}
  Status Ping() {
    constexpr std::array<std::uint8_t, 4> kCommand{'A', 'T', '\r', '\n'};
    return transport_.Write(kCommand, std::chrono::milliseconds{100});
  }

private:
  ITransport& transport_;
};
int main() {
  FakeTransport fake;
  ModemSession session{fake};
  assert(session.Ping() == Status::Ok);
  fake.next_status = Status::IoError;
  assert(session.Ping() == Status::IoError);
  assert(fake.writes == 2);
  const std::array<std::uint8_t, 1> data{'A'};
  assert(fake.Write(data, std::chrono::milliseconds{0}) == Status::InvalidTimeout);
  assert(fake.Write({}, std::chrono::milliseconds{100}) == Status::EmptyBuffer);
  UartTransport uart;
  ModemSession uart_session{uart};
  assert(uart_session.Ping() == Status::Ok);
  std::cout << "override dispatch and error contract passed\n";
}
