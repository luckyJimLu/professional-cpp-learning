#include <array>
#include <cstdint>
#include <iostream>
#include <type_traits>

struct ModemProfile {
    std::uint32_t response_timeout_ms{500U};
    std::uint8_t retry_limit{3U};
    std::array<std::uint8_t, 4> init_flags{1U, 0U, 1U, 0U};
};

struct ExplicitDefaultedConfig {
    ExplicitDefaultedConfig() = default;
    std::uint32_t retry_window_ms{1000U};
};

class DmaLeaseToken {
public:
    explicit DmaLeaseToken(std::uint8_t channel) noexcept : channel_{channel} {}

    DmaLeaseToken(const DmaLeaseToken&) = delete;
    DmaLeaseToken& operator=(const DmaLeaseToken&) = delete;

    [[nodiscard]] std::uint8_t Channel() const noexcept { return channel_; }

private:
    std::uint8_t channel_;
};

int main() {
    static_assert(std::is_default_constructible_v<ModemProfile>);
    static_assert(std::is_copy_constructible_v<ModemProfile>);
    static_assert(std::is_default_constructible_v<ExplicitDefaultedConfig>);
    static_assert(std::is_trivially_copy_constructible_v<ModemProfile>);
    static_assert(!std::is_copy_constructible_v<DmaLeaseToken>);
    static_assert(!std::is_copy_assignable_v<DmaLeaseToken>);
    static_assert(!std::is_default_constructible_v<DmaLeaseToken>);

    const ExplicitDefaultedConfig explicit_defaults{};
    std::cout << "explicitly defaulted config window="
              << explicit_defaults.retry_window_ms << " ms\n";

    const ModemProfile defaults{};
    ModemProfile snapshot{defaults};
    snapshot.retry_limit = 5U;

    std::cout << "default profile: timeout=" << defaults.response_timeout_ms
              << " ms, retries=" << static_cast<unsigned int>(defaults.retry_limit)
              << "\n";
    std::cout << "copied profile: timeout=" << snapshot.response_timeout_ms
              << " ms, retries=" << static_cast<unsigned int>(snapshot.retry_limit)
              << "\n";
    std::cout << "copy source remains unchanged: "
              << std::boolalpha << (defaults.retry_limit == 3U) << "\n";

    const DmaLeaseToken dma_lease{2U};
    std::cout << "DMA lease channel="
              << static_cast<unsigned int>(dma_lease.Channel()) << "\n";
    std::cout << "ModemProfile copyable: "
              << std::is_copy_constructible_v<ModemProfile> << "\n";
    std::cout << "DmaLeaseToken copyable: "
              << std::is_copy_constructible_v<DmaLeaseToken> << "\n";
    return 0;
}
