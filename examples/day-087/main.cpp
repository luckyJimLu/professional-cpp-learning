#include <cassert>
#include <chrono>
#include <cstddef>
#include <cstdint>
#include <iostream>
#include <memory>
#include <new>
#include <optional>
#include <string_view>
#include <utility>

// Stable platform-facing contract. The caller owns the transport.
enum class IoStatus : std::uint8_t {
  kOk,
  kTimeout,
  kDisconnected,
};

class IAtTransport {
 public:
  virtual ~IAtTransport() noexcept = default;
  virtual IoStatus Write(std::string_view command,
                         std::chrono::milliseconds timeout) noexcept = 0;
};

enum class CreateError : std::uint8_t {
  kNone,
  kInvalidTimeout,
  kNoMemory,
};

struct ModemControllerCreateResult;
ModemControllerCreateResult CreateModemController(
    IAtTransport& transport, std::chrono::milliseconds timeout) noexcept;

class ModemController {
 public:
  enum class Status : std::uint8_t {
    kOk,
    kBusy,
    kNotReady,
    kInvalidArgument,
    kTimeout,
    kTransportError,
  };

  ~ModemController();
  ModemController(ModemController&&) noexcept;
  ModemController& operator=(ModemController&&) noexcept;
  ModemController(const ModemController&) = delete;
  ModemController& operator=(const ModemController&) = delete;

  [[nodiscard]] Status Start() noexcept;
  [[nodiscard]] Status SendAt(std::string_view command) noexcept;
  [[nodiscard]] Status Stop() noexcept;
  [[nodiscard]] std::uint32_t sent_count() const noexcept;

 private:
  struct Impl;
  explicit ModemController(std::unique_ptr<Impl> impl) noexcept;
  friend ModemControllerCreateResult CreateModemController(
      IAtTransport& transport, std::chrono::milliseconds timeout) noexcept;

  std::unique_ptr<Impl> impl_;
};

struct ModemControllerCreateResult {
  std::optional<ModemController> controller;
  CreateError error{CreateError::kNone};
};

// Implementation details are intentionally absent from the public class layout.
struct ModemController::Impl {
  IAtTransport& transport;
  std::chrono::milliseconds timeout;
  bool started{false};
  std::uint32_t sent_count{0};
};

ModemController::ModemController(std::unique_ptr<Impl> impl) noexcept
    : impl_(std::move(impl)) {}

ModemController::~ModemController() = default;
ModemController::ModemController(ModemController&&) noexcept = default;
ModemController& ModemController::operator=(ModemController&&) noexcept = default;

ModemControllerCreateResult CreateModemController(
    IAtTransport& transport, std::chrono::milliseconds timeout) noexcept {
  if (timeout.count() <= 0) {
    return {std::nullopt, CreateError::kInvalidTimeout};
  }

  auto impl = std::unique_ptr<ModemController::Impl>{
      new (std::nothrow) ModemController::Impl{transport, timeout}};
  if (!impl) {
    return {std::nullopt, CreateError::kNoMemory};
  }

  ModemController controller{std::move(impl)};
  return {std::optional<ModemController>{std::move(controller)},
          CreateError::kNone};
}

ModemController::Status ModemController::Start() noexcept {
  if (!impl_) {
    return Status::kNotReady;
  }
  if (impl_->started) {
    return Status::kBusy;
  }
  impl_->started = true;
  return Status::kOk;
}

ModemController::Status ModemController::SendAt(
    std::string_view command) noexcept {
  constexpr std::size_t kMaxCommandLength = 32;
  if (!impl_ || !impl_->started) {
    return Status::kNotReady;
  }
  if (command.empty() || command.size() > kMaxCommandLength) {
    return Status::kInvalidArgument;
  }

  switch (impl_->transport.Write(command, impl_->timeout)) {
    case IoStatus::kOk:
      ++impl_->sent_count;
      return Status::kOk;
    case IoStatus::kTimeout:
      return Status::kTimeout;
    case IoStatus::kDisconnected:
      return Status::kTransportError;
  }
  return Status::kTransportError;
}

ModemController::Status ModemController::Stop() noexcept {
  if (!impl_ || !impl_->started) {
    return Status::kNotReady;
  }
  impl_->started = false;
  return Status::kOk;
}

std::uint32_t ModemController::sent_count() const noexcept {
  return impl_ ? impl_->sent_count : 0U;
}

class FakeAtTransport final : public IAtTransport {
 public:
  IoStatus Write(std::string_view command,
                 std::chrono::milliseconds timeout) noexcept override {
    if (timeout.count() <= 0) {
      return IoStatus::kTimeout;
    }
    if (command == "AT+TIMEOUT") {
      return IoStatus::kTimeout;
    }
    if (command == "AT+DISCONNECT") {
      return IoStatus::kDisconnected;
    }
    std::cout << "Fake transport wrote '" << command << "' within "
              << timeout.count() << " ms\n";
    return IoStatus::kOk;
  }
};

const char* ToString(ModemController::Status status) noexcept {
  switch (status) {
    case ModemController::Status::kOk:
      return "ok";
    case ModemController::Status::kBusy:
      return "busy";
    case ModemController::Status::kNotReady:
      return "not-ready";
    case ModemController::Status::kInvalidArgument:
      return "invalid-argument";
    case ModemController::Status::kTimeout:
      return "timeout";
    case ModemController::Status::kTransportError:
      return "transport-error";
  }
  return "unknown";
}

int main() {
  FakeAtTransport transport;  // owner is declared before the borrower.
  auto invalid = CreateModemController(transport, std::chrono::milliseconds{0});
  assert(!invalid.controller.has_value());
  assert(invalid.error == CreateError::kInvalidTimeout);

  auto created = CreateModemController(transport, std::chrono::milliseconds{250});
  if (!created.controller.has_value()) {
    std::cout << "factory failed: " << static_cast<int>(created.error) << '\n';
    return 1;
  }

  ModemController& modem = *created.controller;
  const auto before_start = modem.SendAt("AT");
  const auto started = modem.Start();
  const auto normal = modem.SendAt("AT");
  const auto timed_out = modem.SendAt("AT+TIMEOUT");
  const auto disconnected = modem.SendAt("AT+DISCONNECT");
  const auto invalid_command = modem.SendAt("");
  const auto stopped = modem.Stop();
  const auto after_stop = modem.SendAt("AT");

  std::cout << "before start: " << ToString(before_start) << '\n'
            << "start: " << ToString(started) << '\n'
            << "normal command: " << ToString(normal) << '\n'
            << "timeout command: " << ToString(timed_out) << '\n'
            << "disconnected command: " << ToString(disconnected) << '\n'
            << "empty command: " << ToString(invalid_command) << '\n'
            << "stop: " << ToString(stopped) << '\n'
            << "after stop: " << ToString(after_stop) << '\n'
            << "successful writes: " << modem.sent_count() << '\n';

  assert(before_start == ModemController::Status::kNotReady);
  assert(started == ModemController::Status::kOk);
  assert(normal == ModemController::Status::kOk);
  assert(timed_out == ModemController::Status::kTimeout);
  assert(disconnected == ModemController::Status::kTransportError);
  assert(invalid_command == ModemController::Status::kInvalidArgument);
  assert(stopped == ModemController::Status::kOk);
  assert(after_stop == ModemController::Status::kNotReady);
  assert(modem.sent_count() == 1U);
}
