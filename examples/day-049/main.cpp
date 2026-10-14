#include <chrono>
#include <cstddef>
#include <cstdint>
#include <iostream>
#include <span>

using namespace std::chrono_literals;

enum class Status {
  kOk,
  kInvalidArgument,
  kTimeout,
  kTransportError,
};

class IByteTransport {
 public:
  virtual ~IByteTransport() = default;

  virtual Status Write(std::span<const std::byte> payload,
                       std::chrono::milliseconds timeout) = 0;
};

class FakeTransport final : public IByteTransport {
 public:
  Status Write(std::span<const std::byte> payload,
               std::chrono::milliseconds timeout) override {
    if (payload.empty()) {
      return Status::kInvalidArgument;
    }
    if (timeout <= 0ms) {
      return Status::kTimeout;
    }

    last_size_ = payload.size();
    return Status::kOk;
  }

  [[nodiscard]] std::size_t LastSize() const { return last_size_; }

 private:
  std::size_t last_size_ = 0;
};

class ModemCore {
 public:
  explicit ModemCore(IByteTransport& transport) : transport_(transport) {}

  Status SendRaw(std::span<const std::byte> payload,
                 std::chrono::milliseconds timeout) {
    return transport_.Write(payload, timeout);
  }

  [[nodiscard]] std::uint32_t SignalDbm() const { return 72; }

 private:
  IByteTransport& transport_;
};

// Audience: application code.
class ModemClient final {
 public:
  explicit ModemClient(ModemCore& modem) : modem_(modem) {}

  Status SendTelemetry(std::span<const std::byte> payload) {
    return modem_.SendRaw(payload, 500ms);
  }

 private:
  ModemCore& modem_;
};

// Audience: diagnostics / manufacturing.
class ModemDiagnostics final {
 public:
  explicit ModemDiagnostics(ModemCore& modem) : modem_(modem) {}

  [[nodiscard]] std::uint32_t ReadSignalDbm() const {
    return modem_.SignalDbm();
  }

  Status Probe(std::span<const std::byte> payload,
               std::chrono::milliseconds timeout) {
    return modem_.SendRaw(payload, timeout);
  }

 private:
  ModemCore& modem_;
};

int main() {
  FakeTransport transport;
  ModemCore core{transport};
  ModemClient app{core};
  ModemDiagnostics diagnostics{core};

  const std::byte payload[]{std::byte{0x41}, std::byte{0x54}};

  const Status send_status = app.SendTelemetry(payload);
  const Status probe_status = diagnostics.Probe(payload, 100ms);

  std::cout << "send=" << (send_status == Status::kOk)
            << " probe=" << (probe_status == Status::kOk)
            << " size=" << transport.LastSize()
            << " signal=" << diagnostics.ReadSignalDbm() << '\n';
}
