#include <array>
#include <cstddef>
#include <cstdint>
#include <iostream>

namespace modem {
constexpr std::uint32_t kDefaultTimeoutMs {5000U};
constexpr std::uint32_t kMaxRetryCount {3U};
constexpr std::size_t kRxBufferSize {512U};

constexpr std::uint32_t CalculateTotalTimeoutMs(std::uint32_t retry_count)
{
return kDefaultTimeoutMs * retry_count;
}

static_assert(kRxBufferSize >= 256U);
static_assert(CalculateTotalTimeoutMs(kMaxRetryCount) == 15000U);

struct Config {
std::uint32_t timeout_ms {kDefaultTimeoutMs};
std::uint32_t retry_count {kMaxRetryCount};
};

void PrintConfig(const Config& config)
{
std::cout << "timeout_ms = " << config.timeout_ms << '\n';
}
} // namespace modem

int main()
{
std::array<std::uint8_t, modem::kRxBufferSize> rx_buffer {};
const modem::Config config {};
modem::PrintConfig(config);
std::cout << rx_buffer.size() << '\n';
}
