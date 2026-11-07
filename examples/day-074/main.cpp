#include <cstdint>
#include <iostream>
#include <type_traits>

class LegacyTimeout {
public:
    constexpr LegacyTimeout(std::uint32_t value) noexcept : value_{value} {}

    [[nodiscard]] constexpr std::uint32_t Count() const noexcept {
        return value_;
    }

private:
    std::uint32_t value_;
};

class Milliseconds {
public:
    explicit constexpr Milliseconds(std::uint32_t value) noexcept : value_{value} {}

    [[nodiscard]] constexpr std::uint32_t Count() const noexcept {
        return value_;
    }

private:
    std::uint32_t value_;
};

void ConfigureLegacyTimeout(LegacyTimeout timeout) {
    std::cout << "legacy implicit conversion: " << timeout.Count() << " ms\n";
}

void ConfigureTimeout(Milliseconds timeout) {
    std::cout << "typed timeout: " << timeout.Count() << " ms\n";
}

int main() {
    static_assert(std::is_constructible_v<Milliseconds, std::uint32_t>);
    static_assert(!std::is_convertible_v<std::uint32_t, Milliseconds>);

    ConfigureLegacyTimeout(500U);

    const Milliseconds response_timeout{750U};
    ConfigureTimeout(response_timeout);

    const Milliseconds dma_timeout{250U};
    ConfigureTimeout(dma_timeout);

    // These are intentionally ill-formed examples; uncomment to verify the
    // compile-time protection provided by explicit:
    // Milliseconds unsafe_copy_init = 500U;
    // Milliseconds unsafe_copy_list_init = {500U};
    // ConfigureTimeout(500U);

    std::cout << "implicit conversion allowed for Milliseconds: "
              << std::boolalpha
              << std::is_convertible_v<std::uint32_t, Milliseconds> << '\n';
    return 0;
}
