#include <array>
#include <cstddef>
#include <cstdint>
#include <iostream>
#include <limits>
#include <span>

enum class PortId {
    kUart1,
    kUart2
};

enum class BaudPreset : std::uint32_t {
    k115200 = 115'200U,
    k921600 = 921'600U
};

enum class UartState {
    kStopped,
    kStarted
};

enum class Status {
    kOk,
    kInvalidArgument,
    kBusy,
    kNotReady
};

[[nodiscard]] constexpr const char* ToString(Status status) noexcept {
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

[[nodiscard]] constexpr const char* ToString(PortId port_id) noexcept {
    switch (port_id) {
        case PortId::kUart1:
            return "UART1";
        case PortId::kUart2:
            return "UART2";
    }
    return "unknown";
}

class UartPort {
public:
    UartPort() noexcept = default;

    UartPort(PortId port_id, BaudPreset preset) noexcept {
        port_id_ = port_id;
        baud_rate_ = static_cast<std::uint32_t>(preset);
    }

    [[nodiscard]] Status Configure(std::uint32_t baud_rate) noexcept {
        if (state_ != UartState::kStopped) {
            return Status::kBusy;
        }
        if (baud_rate != static_cast<std::uint32_t>(BaudPreset::k115200) &&
            baud_rate != static_cast<std::uint32_t>(BaudPreset::k921600)) {
            return Status::kInvalidArgument;
        }
        baud_rate_ = baud_rate;
        return Status::kOk;
    }

    [[nodiscard]] Status Start() noexcept {
        if (state_ == UartState::kStarted) {
            return Status::kBusy;
        }
        state_ = UartState::kStarted;
        return Status::kOk;
    }

    [[nodiscard]] Status Stop() noexcept {
        if (state_ == UartState::kStopped) {
            return Status::kNotReady;
        }
        state_ = UartState::kStopped;
        return Status::kOk;
    }

    [[nodiscard]] Status Send(std::span<const std::uint8_t> bytes) noexcept {
        if (state_ != UartState::kStarted) {
            return Status::kNotReady;
        }
        if (bytes.empty()) {
            return Status::kInvalidArgument;
        }
        if (bytes.size() > std::numeric_limits<std::size_t>::max() - bytes_sent_) {
            return Status::kInvalidArgument;
        }
        bytes_sent_ += bytes.size();
        return Status::kOk;
    }

    [[nodiscard]] PortId port_id() const noexcept {
        return port_id_;
    }

    [[nodiscard]] std::uint32_t baud_rate() const noexcept {
        return baud_rate_;
    }

    [[nodiscard]] UartState state() const noexcept {
        return state_;
    }

    [[nodiscard]] std::size_t bytes_sent() const noexcept {
        return bytes_sent_;
    }

private:
    PortId port_id_{PortId::kUart1};
    std::uint32_t baud_rate_{static_cast<std::uint32_t>(BaudPreset::k115200)};
    UartState state_{UartState::kStopped};
    std::size_t bytes_sent_{0U};
};

int main() {
    UartPort default_port;
    UartPort diagnostic_port{PortId::kUart2, BaudPreset::k921600};

    std::cout << "default: " << ToString(default_port.port_id()) << ' '
              << default_port.baud_rate() << " baud, stopped\n";
    std::cout << "preset: " << ToString(diagnostic_port.port_id()) << ' '
              << diagnostic_port.baud_rate() << " baud, stopped\n";

    const Status invalid_config = default_port.Configure(0U);
    std::cout << "configure(0): " << ToString(invalid_config)
              << "; baud remains " << default_port.baud_rate() << '\n';

    const Status start_status = default_port.Start();
    std::cout << "start: " << ToString(start_status) << '\n';

    const std::array<std::uint8_t, 4U> payload{0x41U, 0x54U, 0x0DU, 0x0AU};
    const Status send_status = default_port.Send(payload);
    std::cout << "send: " << ToString(send_status)
              << ", bytes_sent=" << default_port.bytes_sent() << '\n';

    const Status reconfigure_status = default_port.Configure(921'600U);
    std::cout << "configure while started: " << ToString(reconfigure_status) << '\n';

    const Status stop_status = default_port.Stop();
    std::cout << "stop: " << ToString(stop_status) << '\n';

    return invalid_config == Status::kInvalidArgument &&
                   start_status == Status::kOk && send_status == Status::kOk &&
                   reconfigure_status == Status::kBusy && stop_status == Status::kOk &&
                   default_port.bytes_sent() == payload.size()
               ? 0
               : 1;
}
