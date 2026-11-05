#include <array>
#include <cstddef>
#include <cstdint>
#include <iostream>

class SelfReferentialFrame {
public:
    SelfReferentialFrame() noexcept
        : storage_{}, data_{storage_.data()}, size_{1U} {
        storage_[0U] = 65U;
    }

    void SetFirst(std::uint8_t value) noexcept {
        data_[0U] = value;
    }

    [[nodiscard]] std::uint8_t First() const noexcept {
        return data_[0U];
    }

    [[nodiscard]] std::size_t size() const noexcept {
        return size_;
    }

private:
    std::array<std::uint8_t, 4U> storage_{};
    std::uint8_t* data_;  // Intended to point into this object's storage_.
    std::size_t size_;
};

int main() {
    SelfReferentialFrame source;
    SelfReferentialFrame copied{source};  // Implicit copy copies data_ as an address.

    copied.SetFirst(90U);

    std::cout << "source first=" << static_cast<unsigned int>(source.First())
              << ", copy first=" << static_cast<unsigned int>(copied.First())
              << ", copy length=" << copied.size() << '\n';

    const bool aliases = source.First() == 90U && copied.First() == 90U;
    std::cout << "self-pointer alias detected: " << (aliases ? "yes" : "no")
              << '\n';

    return 0;  // The starter intentionally reports the design defect.
}
