#include <algorithm>
#include <array>
#include <concepts>
#include <cstddef>
#include <cstdint>
#include <iostream>
#include <span>

enum class Status {
    kOk,
    kNotReady,
    kInvalidArgument,
    kTooLarge
};

enum class UartChannel {
    kUart1,
    kUart2
};

enum class BaudRate : std::uint32_t {
    k115200 = 115'200U,
    k921600 = 921'600U
};

[[nodiscard]] constexpr const char* ToString(Status status) noexcept {
    switch (status) {
        case Status::kOk:
            return "ok";
        case Status::kNotReady:
            return "not ready";
        case Status::kInvalidArgument:
            return "invalid argument";
        case Status::kTooLarge:
            return "too large";
    }
    return "unknown";
}

[[nodiscard]] constexpr const char* ToString(UartChannel channel) noexcept {
    switch (channel) {
        case UartChannel::kUart1:
            return "UART1";
        case UartChannel::kUart2:
            return "UART2";
    }
    return "unknown";
}

template <typename Hal>
concept UartHal = requires(Hal& hal,
                           UartChannel channel,
                           std::uint32_t baud_rate,
                           std::span<const std::uint8_t> bytes) {
    { hal.Configure(channel, baud_rate) } noexcept -> std::same_as<Status>;
    { hal.Write(bytes) } noexcept -> std::same_as<Status>;
};

class FakeUartHal {
public:
    [[nodiscard]] Status Configure(UartChannel channel,
                                   std::uint32_t baud_rate) noexcept {
        channel_ = channel;
        baud_rate_ = baud_rate;
        configured_ = true;
        return Status::kOk;
    }

    [[nodiscard]] Status Write(std::span<const std::uint8_t> bytes) noexcept {
        if (!configured_) {
            return Status::kNotReady;
        }
        last_write_size_ = bytes.size();
        return Status::kOk;
    }

    [[nodiscard]] UartChannel channel() const noexcept {
        return channel_;
    }

    [[nodiscard]] std::uint32_t baud_rate() const noexcept {
        return baud_rate_;
    }

    [[nodiscard]] std::size_t last_write_size() const noexcept {
        return last_write_size_;
    }

private:
    UartChannel channel_{UartChannel::kUart1};
    std::uint32_t baud_rate_{0U};
    std::size_t last_write_size_{0U};
    bool configured_{false};
};

template <UartHal Hal>
class UartDriver {
public:
    static constexpr std::size_t kTxCapacity{16U};

    explicit UartDriver(Hal& hal,
                        UartChannel channel,
                        BaudRate baud_rate) noexcept
        : hal_{hal},
          channel_{channel},
          baud_rate_{static_cast<std::uint32_t>(baud_rate)},
          tx_buffer_{},
          ready_{false} {}

    [[nodiscard]] Status Initialize() noexcept {
        const Status status = hal_.Configure(channel_, baud_rate_);
        ready_ = status == Status::kOk;
        return status;
    }

    [[nodiscard]] Status Send(std::span<const std::uint8_t> bytes) noexcept {
        if (!ready_) {
            return Status::kNotReady;
        }
        if (bytes.empty()) {
            return Status::kInvalidArgument;
        }
        if (bytes.size() > tx_buffer_.size()) {
            return Status::kTooLarge;
        }

        std::copy(bytes.begin(), bytes.end(), tx_buffer_.begin());
        return hal_.Write(
            std::span<const std::uint8_t>{tx_buffer_.data(), bytes.size()});
    }

private:
    Hal& hal_;  // Borrow: the HAL must outlive this driver.
    const UartChannel channel_;
    const std::uint32_t baud_rate_;
    std::array<std::uint8_t, kTxCapacity> tx_buffer_;
    bool ready_;
};

int main() {
    FakeUartHal hal;
    UartDriver<FakeUartHal> driver{hal, UartChannel::kUart2, BaudRate::k921600};

    const Status init_status = driver.Initialize();
    std::cout << "initialize: " << ToString(init_status)
              << ", channel=" << ToString(hal.channel())
              << ", baud=" << hal.baud_rate() << '\n';

    const std::array<std::uint8_t, 4U> command{0x41U, 0x54U, 0x0DU, 0x0AU};
    const Status send_status = driver.Send(command);
    std::cout << "send 4 bytes: " << ToString(send_status)
              << ", HAL received=" << hal.last_write_size() << '\n';

    const std::array<std::uint8_t, 17U> oversized_payload{};
    const Status oversized_status = driver.Send(oversized_payload);
    std::cout << "send 17 bytes: " << ToString(oversized_status)
              << ", HAL received=" << hal.last_write_size() << '\n';

    return init_status == Status::kOk && send_status == Status::kOk &&
                   oversized_status == Status::kTooLarge &&
                   hal.last_write_size() == command.size()
               ? 0
               : 1;
}
