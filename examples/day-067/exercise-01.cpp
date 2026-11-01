#include <cstdint>
#include <iostream>

// Intentionally weak design: callers can bypass the intended class boundary.
struct UartPort {
    std::uint32_t baud_rate{115'200U};
    std::uint8_t data_bits{8U};
    bool started{false};
};

void Configure(UartPort& uart, std::uint32_t baud_rate,
               std::uint8_t data_bits) noexcept {
    uart.baud_rate = baud_rate;
    uart.data_bits = data_bits;
}

void Start(UartPort& uart) noexcept {
    uart.started = true;
}

[[nodiscard]] bool IsValid(const UartPort& uart) noexcept {
    return uart.baud_rate >= 9'600U && uart.baud_rate <= 3'000'000U &&
           (uart.data_bits == 7U || uart.data_bits == 8U);
}

int main() {
    UartPort uart;
    Configure(uart, 0U, 5U);
    Start(uart);

    std::cout << "baud=" << uart.baud_rate
              << ", data_bits=" << static_cast<unsigned int>(uart.data_bits)
              << ", started=" << (uart.started ? "true" : "false")
              << ", valid=" << (IsValid(uart) ? "true" : "false") << '\n';
    std::cout << "Review task: move state behind a class boundary and reject invalid transitions.\n";
    return 0;
}
