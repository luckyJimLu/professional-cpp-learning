#include <array>
#include <cstddef>
#include <cstdint>
#include <initializer_list>
#include <iostream>
#include <string_view>

class ByteBuffer {
public:
    static constexpr std::size_t kCapacity = 8U;

    explicit ByteBuffer(std::size_t count, std::uint8_t fill) noexcept {
        if (count > kCapacity) {
            valid_ = false;
            return;
        }
        size_ = count;
        for (std::size_t index = 0U; index < size_; ++index) {
            bytes_[index] = fill;
        }
    }

    explicit ByteBuffer(std::initializer_list<std::uint8_t> bytes) noexcept {
        if (bytes.size() > kCapacity) {
            valid_ = false;
            return;
        }
        for (const std::uint8_t byte : bytes) {
            bytes_[size_] = byte;
            ++size_;
        }
    }

    void Print(std::string_view label) const {
        std::cout << label << " size=" << size_ << " bytes:";
        for (std::size_t index = 0U; index < size_; ++index) {
            std::cout << ' ' << static_cast<unsigned int>(bytes_[index]);
        }
        if (!valid_) {
            std::cout << " [invalid]";
        }
        std::cout << '\n';
    }

private:
    std::array<std::uint8_t, kCapacity> bytes_{};
    std::size_t size_{0U};
    bool valid_{true};
};

int main() {
    // Intent: four bytes, each equal to 0xAA.
    // Actual: list-initialization prefers the initializer_list constructor.
    const ByteBuffer payload{4U, 0xAAU};
    payload.Print("payload");
    std::cout << "intended count=4, intended fill=170\n";
    return 0;
}
