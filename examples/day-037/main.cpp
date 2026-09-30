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
};

class ITransport {
 public:
  virtual ~ITransport() = default;

  virtual Status Write(std::span<const std::uint8_t> data,
                       std::chrono::milliseconds timeout) = 0;
};

class FakeTransport final : public ITransport {
 public:
  Status Write(std::span<const std::uint8_t> data,
               std::chrono::milliseconds timeout) override {
    if (data.empty() || timeout <= 0ms) {
      return Status::kInvalidArgument;
    }

    ++write_count_;
    return Status::kOk;
  }

  [[nodiscard]] std::size_t WriteCount() const {
    return write_count_;
  }

 private:
  std::size_t write_count_{0};
};

class ModemSession {
 public:
  explicit ModemSession(ITransport& transport)
      : transport_(transport) {}

  Status Send(std::span<const std::uint8_t> command,
              std::chrono::milliseconds timeout) {
    return transport_.Write(command, timeout);
  }

 private:
  ITransport& transport_;
};

// Deliberately unrelated class: no artificial common Device base class.
class Watchdog {
 public:
  void Kick() {
    ++kick_count_;
  }

  [[nodiscard]] std::size_t KickCount() const {
    return kick_count_;
  }

 private:
  std::size_t kick_count_{0};
};

int main() {
  constexpr std::array<std::uint8_t, 4> kAt{
      0x41, 0x54, 0x0D, 0x0A};

  FakeTransport transport;
  ModemSession modem{transport};
  Watchdog watchdog;

  assert(modem.Send(kAt, 100ms) == Status::kOk);
  watchdog.Kick();

  assert(transport.WriteCount() == 1U);
  assert(watchdog.KickCount() == 1U);
}
