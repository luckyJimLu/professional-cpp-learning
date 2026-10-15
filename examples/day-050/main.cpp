#include <chrono>
#include <cstddef>
#include <iostream>
#include <span>

using namespace std::chrono_literals;

enum class Status {
  kOk,
  kInvalidArgument,
  kTimeout,
  kTransportError,
};

enum class Priority {
  kNormal,
  kHigh,
};

struct SendOptions {
  std::chrono::milliseconds timeout{500ms};
  Priority priority{Priority::kNormal};
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

class ModemCore final {
 public:
  explicit ModemCore(IByteTransport& transport) : transport_(transport) {}

  Status Send(std::span<const std::byte> payload,
              const SendOptions& options) {
    // Priority is part of the public policy even though this small lab's
    // fake transport does not implement different queues.
    if (options.priority == Priority::kHigh) {
      ++high_priority_requests_;
    }
    return transport_.Write(payload, options.timeout);
  }

  [[nodiscard]] std::size_t HighPriorityRequests() const {
    return high_priority_requests_;
  }

 private:
  IByteTransport& transport_;
  std::size_t high_priority_requests_ = 0;
};

// Facade for the application's common use cases. It borrows ModemCore.
class ModemFacade final {
 public:
  explicit ModemFacade(ModemCore& modem) : modem_(modem) {}

  Status SendTelemetry(std::span<const std::byte> payload) {
    return modem_.Send(payload, SendOptions{});
  }

  Status SendTelemetry(std::span<const std::byte> payload,
                       const SendOptions& options) {
    return modem_.Send(payload, options);
  }

 private:
  ModemCore& modem_;
};

int main() {
  // Ownership order: transport -> core -> facade.
  // Destruction is the reverse: facade -> core -> transport.
  FakeTransport transport;
  ModemCore core{transport};
  ModemFacade modem{core};

  const std::byte payload[]{std::byte{0x41}, std::byte{0x54}};

  const Status common_status = modem.SendTelemetry(payload);

  const SendOptions urgent{
      .timeout = 2s,
      .priority = Priority::kHigh,
  };
  const Status advanced_status = modem.SendTelemetry(payload, urgent);

  std::cout << "common=" << (common_status == Status::kOk)
            << " advanced=" << (advanced_status == Status::kOk)
            << " size=" << transport.LastSize()
            << " high_priority=" << core.HighPriorityRequests() << '\n';
}
