#include <cstdint>
#include <iostream>
#include <string_view>

class ModemConfig {
public:
    static constexpr std::uint32_t kDefaultBaudRate = 115200U;
    static constexpr std::uint32_t kDefaultTimeoutMs = 1000U;
    static constexpr std::uint8_t kDefaultRetryCount = 3U;

    ModemConfig() noexcept
        : baud_rate_(kDefaultBaudRate),
          timeout_ms_(kDefaultTimeoutMs),
          retry_count_(kDefaultRetryCount) {}

    explicit ModemConfig(std::uint32_t baud_rate) noexcept
        : baud_rate_(baud_rate),
          timeout_ms_(kDefaultTimeoutMs),
          retry_count_(0U) {}

    ModemConfig(std::uint32_t baud_rate, std::uint32_t timeout_ms) noexcept
        : baud_rate_(baud_rate),
          timeout_ms_(timeout_ms),
          retry_count_(kDefaultRetryCount) {}

    [[nodiscard]] std::uint32_t GetBaudRate() const noexcept {
        return baud_rate_;
    }

    [[nodiscard]] std::uint32_t GetTimeoutMs() const noexcept {
        return timeout_ms_;
    }

    [[nodiscard]] std::uint8_t GetRetryCount() const noexcept {
        return retry_count_;
    }

private:
    std::uint32_t baud_rate_;
    std::uint32_t timeout_ms_;
    std::uint8_t retry_count_;
};

void PrintConfig(std::string_view label, const ModemConfig& config) {
    std::cout << label
              << ": baud=" << config.GetBaudRate()
              << " timeout_ms=" << config.GetTimeoutMs()
              << " retries=" << static_cast<unsigned int>(config.GetRetryCount())
              << '\n';
}

int main() {
    const ModemConfig defaults{};
    const ModemConfig custom_baud{57600U};
    const ModemConfig custom_baud_and_timeout{9600U, 2000U};

    PrintConfig("default", defaults);
    PrintConfig("baud-only", custom_baud);
    PrintConfig("baud+timeout", custom_baud_and_timeout);

    std::cout << "expected default retries="
              << static_cast<unsigned int>(ModemConfig::kDefaultRetryCount)
              << '\n';

    return 0;
}
