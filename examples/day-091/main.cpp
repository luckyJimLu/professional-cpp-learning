#include <array>
#include <chrono>
#include <cstddef>
#include <cstdint>
#include <iostream>
#include <span>
#include <string_view>
#include <type_traits>

using namespace std::chrono_literals;

enum class Status : std::uint8_t {
  kOk,
  kInvalidArgument,
  kTimeout,
};

class ByteTransport {
 public:
  virtual ~ByteTransport() = default;
  [[nodiscard]] virtual Status Write(
      std::span<const std::byte> bytes,
      std::chrono::milliseconds timeout) noexcept = 0;
};

class FakeUartTransport final : public ByteTransport {
 public:
  [[nodiscard]] Status Write(
      std::span<const std::byte> bytes,
      std::chrono::milliseconds timeout) noexcept override {
    if (timeout <= 0ms) {
      return Status::kTimeout;
    }
    if (bytes.empty()) {
      return Status::kInvalidArgument;
    }
    ++write_count_;
    std::cout << "UART TX bytes=" << bytes.size() << '\n';
    return Status::kOk;
  }

  [[nodiscard]] std::uint32_t WriteCount() const noexcept {
    return write_count_;
  }

 private:
  std::uint32_t write_count_{0U};
};

struct EncodedAtCommand {
  static constexpr std::size_t kStorageBytes = 34U;

  std::array<std::byte, kStorageBytes> storage{};
  std::size_t size{0U};

  [[nodiscard]] std::span<const std::byte> View() const noexcept {
    return {storage.data(), size};
  }
};

class AtCommandEncoder {
 public:
  static constexpr std::size_t kMaxCommandChars = 32U;

  [[nodiscard]] Status Encode(
      std::string_view command,
      EncodedAtCommand& output) const noexcept {
    if (command.empty() || command.size() > kMaxCommandChars) {
      return Status::kInvalidArgument;
    }

    output.size = command.size() + 2U;
    for (std::size_t index = 0U; index < command.size(); ++index) {
      const auto character = static_cast<unsigned char>(command[index]);
      output.storage[index] = static_cast<std::byte>(character);
    }
    output.storage[command.size()] = std::byte{0x0DU};
    output.storage[command.size() + 1U] = std::byte{0x0AU};
    return Status::kOk;
  }
};

class ModemController {
 public:
  explicit ModemController(
      ByteTransport& transport,
      std::chrono::milliseconds timeout) noexcept
      : transport_(transport), timeout_(timeout) {}

  [[nodiscard]] Status SendAt(std::string_view command) noexcept {
    EncodedAtCommand encoded{};
    const Status encode_status = encoder_.Encode(command, encoded);
    if (encode_status != Status::kOk) {
      return encode_status;
    }
    return transport_.Write(encoded.View(), timeout_);
  }

 private:
  ByteTransport& transport_;
  AtCommandEncoder encoder_;
  std::chrono::milliseconds timeout_;
};

[[nodiscard]] const char* ToString(Status status) noexcept {
  switch (status) {
    case Status::kOk:
      return "ok";
    case Status::kInvalidArgument:
      return "invalid-argument";
    case Status::kTimeout:
      return "timeout";
  }
  return "unknown";
}

static_assert(!std::is_base_of_v<ByteTransport, ModemController>);

int main() {
  FakeUartTransport uart;
  ModemController modem{uart, 100ms};
  ModemController timeout_modem{uart, 0ms};

  constexpr std::string_view kTooLongCommand =
      "AT+THIS_COMMAND_IS_LONGER_THAN_THIRTY_TWO_CHARS";
  const Status sent = modem.SendAt("AT+CSQ");
  const Status empty = modem.SendAt("");
  const Status too_long = modem.SendAt(kTooLongCommand);
  const Status timed_out = timeout_modem.SendAt("AT");

  std::cout << "sent=" << ToString(sent)
            << " empty=" << ToString(empty)
            << " too_long=" << ToString(too_long)
            << " timeout=" << ToString(timed_out) << '\n';
  std::cout << "uart_writes=" << uart.WriteCount() << '\n';
  std::cout << std::boolalpha
            << "controller_is_transport="
            << std::is_base_of_v<ByteTransport, ModemController> << '\n';

  if (sent != Status::kOk || empty != Status::kInvalidArgument ||
      too_long != Status::kInvalidArgument || timed_out != Status::kTimeout ||
      uart.WriteCount() != 1U ||
      std::is_base_of_v<ByteTransport, ModemController>) {
    std::cerr << "composition / boundary check failed\n";
    return 1;
  }

  std::cout << "Facade composes a transport; fixed buffers keep the send path bounded\n";
  return 0;
}
