#include <array>
#include <cstddef>
#include <cstdint>
#include <iostream>
#include <span>

enum class Status {
    kOk,
    kInvalidArgument,
    kBusy,
    kNotReady
};

enum class UartState {
    kStopped,
    kStarted
};

[[nodiscard]] const char* ToString(Status status) noexcept {
    switch (status) {
        case Status::kOk:
            return "ok";
        case Status::kInvalidArgument:
            return "invalid argument";
        case Status::kBusy:
            return "busy";
        case Status::kNotReady:
            return "not ready";
    }
    return "unknown";
}

class UartPort {
public:
    [[nodiscard]] Status Configure(std::uint32_t baud_rate,
                                   std::uint8_t data_bits) noexcept {
        if (state_ == UartState::kStarted) {
            return Status::kBusy;
        }
        if (baud_rate < 9'600U || baud_rate > 3'000'000U ||
            (data_bits != 7U && data_bits != 8U)) {
            return Status::kInvalidArgument;
        }

        baud_rate_ = baud_rate;
        data_bits_ = data_bits;
        return Status::kOk;
    }

    [[nodiscard]] Status Start() noexcept {
        if (state_ == UartState::kStarted) {
            return Status::kBusy;
        }
        state_ = UartState::kStarted;
        return Status::kOk;
    }

    [[nodiscard]] Status Send(std::span<const std::uint8_t> bytes) noexcept {
        if (state_ != UartState::kStarted) {
            return Status::kNotReady;
        }
        if (bytes.empty()) {
            return Status::kInvalidArgument;
        }
        transmitted_bytes_ += bytes.size();
        return Status::kOk;
    }

    void Stop() noexcept {
        state_ = UartState::kStopped;
    }

    [[nodiscard]] std::uint32_t GetBaudRate() const noexcept {
        return baud_rate_;
    }

    [[nodiscard]] std::uint8_t GetDataBits() const noexcept {
        return data_bits_;
    }

    [[nodiscard]] UartState GetState() const noexcept {
        return state_;
    }

    [[nodiscard]] std::size_t GetTransmittedBytes() const noexcept {
        return transmitted_bytes_;
    }

private:
    std::uint32_t baud_rate_{115'200U};
    std::uint8_t data_bits_{8U};
    UartState state_{UartState::kStopped};
    std::size_t transmitted_bytes_{0U};
};

int main() {
    UartPort uart;
    std::cout << "default: " << uart.GetBaudRate() << " baud, "
              << static_cast<unsigned int>(uart.GetDataBits()) << " data bits\n";

    std::cout << "configure: " << ToString(uart.Configure(230'400U, 8U)) << '\n';
    std::cout << "start: " << ToString(uart.Start()) << '\n';

    const std::array<std::uint8_t, 4> packet{0x41U, 0x54U, 0x0DU, 0x0AU};
    std::cout << "send: " << ToString(uart.Send(packet)) << '\n';
    std::cout << "reconfigure while started: "
              << ToString(uart.Configure(9'600U, 7U)) << '\n';

    uart.Stop();
    std::cout << "invalid baud after stop: "
              << ToString(uart.Configure(0U, 8U)) << '\n';
    std::cout << "final: " << uart.GetTransmittedBytes()
              << " bytes sent, state="
              << (uart.GetState() == UartState::kStopped ? "stopped" : "started")
              << '\n';
    return 0;
}
