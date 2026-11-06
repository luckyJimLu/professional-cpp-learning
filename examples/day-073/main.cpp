#include <cstdint>
#include <iostream>
#include <string_view>

enum class BaudRate : std::uint32_t {
    k9600 = 9600U,
    k115200 = 115200U,
    k921600 = 921600U,
};

enum class Parity : std::uint8_t {
    kNone = 0U,
    kEven = 1U,
    kOdd = 2U,
};

enum class StopBits : std::uint8_t {
    kOne = 1U,
    kTwo = 2U,
};

class UartConfig {
public:
    UartConfig() noexcept
        : UartConfig(BaudRate::k115200, Parity::kNone, StopBits::kOne) {}

    explicit UartConfig(BaudRate baud_rate) noexcept
        : UartConfig(baud_rate, Parity::kNone, StopBits::kOne) {}

    UartConfig(BaudRate baud_rate, Parity parity) noexcept
        : UartConfig(baud_rate, parity, StopBits::kOne) {}

    UartConfig(BaudRate baud_rate, Parity parity, StopBits stop_bits) noexcept
        : baud_rate_(baud_rate), parity_(parity), stop_bits_(stop_bits) {}

    [[nodiscard]] BaudRate GetBaudRate() const noexcept {
        return baud_rate_;
    }

    [[nodiscard]] Parity GetParity() const noexcept {
        return parity_;
    }

    [[nodiscard]] StopBits GetStopBits() const noexcept {
        return stop_bits_;
    }

private:
    BaudRate baud_rate_;
    Parity parity_;
    StopBits stop_bits_;
};

[[nodiscard]] std::string_view ToString(Parity parity) noexcept {
    switch (parity) {
    case Parity::kNone:
        return "none";
    case Parity::kEven:
        return "even";
    case Parity::kOdd:
        return "odd";
    }
    return "invalid";
}

void PrintConfig(std::string_view label, const UartConfig& config) {
    std::cout << label
              << ": baud=" << static_cast<std::uint32_t>(config.GetBaudRate())
              << " parity=" << ToString(config.GetParity())
              << " stop_bits=" << static_cast<unsigned int>(config.GetStopBits())
              << '\n';
}

int main() {
    const UartConfig defaults{};
    const UartConfig high_speed{BaudRate::k921600};
    const UartConfig even_parity{BaudRate::k115200, Parity::kEven};
    const UartConfig full{BaudRate::k9600, Parity::kOdd, StopBits::kTwo};

    PrintConfig("default", defaults);
    PrintConfig("baud-only", high_speed);
    PrintConfig("baud+parity", even_parity);
    PrintConfig("full", full);

    return 0;
}
