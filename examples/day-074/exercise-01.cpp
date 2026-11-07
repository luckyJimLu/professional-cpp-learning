#include <cstdint>
#include <iostream>

class Milliseconds {
public:
    // Deliberate API defect: raw integers convert implicitly.
    constexpr Milliseconds(std::uint32_t value) noexcept : value_{value} {}

    [[nodiscard]] constexpr std::uint32_t Count() const noexcept {
        return value_;
    }

private:
    std::uint32_t value_;
};

class RetryCount {
public:
    // Deliberate API defect: retry counts also convert implicitly.
    constexpr RetryCount(std::uint32_t value) noexcept : value_{value} {}

    [[nodiscard]] constexpr std::uint32_t Count() const noexcept {
        return value_;
    }

private:
    std::uint32_t value_;
};

void ConfigureCommandTimeout(Milliseconds timeout) {
    std::cout << "command timeout=" << timeout.Count() << " ms\n";
}

void ConfigureRetries(RetryCount retries) {
    std::cout << "retry count=" << retries.Count() << '\n';
}

int main() {
    ConfigureCommandTimeout(500U);
    ConfigureRetries(3U);
    std::cout << "Both raw integer calls compiled; review whether that is desirable.\n";
    return 0;
}
