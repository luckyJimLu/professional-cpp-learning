#include <array>
#include <cstddef>
#include <cstdint>
#include <initializer_list>
#include <iostream>
#include <string_view>

class ByteFrame {
public:
    enum class Status : std::uint8_t {
        kOk = 0U,
        kTooLarge = 1U,
    };

    static constexpr std::size_t kCapacity = 8U;

    explicit ByteFrame(std::size_t count, std::uint8_t fill) noexcept {
        if (count > kCapacity) {
            status_ = Status::kTooLarge;
            return;
        }

        size_ = count;
        for (std::size_t index = 0U; index < size_; ++index) {
            storage_[index] = fill;
        }
    }

    explicit ByteFrame(std::initializer_list<std::uint8_t> bytes) noexcept {
        if (bytes.size() > kCapacity) {
            status_ = Status::kTooLarge;
            return;
        }

        for (const std::uint8_t byte : bytes) {
            storage_[size_] = byte;
            ++size_;
        }
    }

    [[nodiscard]] bool IsValid() const noexcept {
        return status_ == Status::kOk;
    }

    [[nodiscard]] std::size_t Size() const noexcept {
        return size_;
    }

    [[nodiscard]] Status GetStatus() const noexcept {
        return status_;
    }

    void Print(std::string_view label) const {
        std::cout << label << " (" << size_ << " bytes):";
        for (std::size_t index = 0U; index < size_; ++index) {
            std::cout << ' ' << static_cast<unsigned int>(storage_[index]);
        }
        if (!IsValid()) {
            std::cout << " [too large]";
        }
        std::cout << '\n';
    }

private:
    std::array<std::uint8_t, kCapacity> storage_{};
    std::size_t size_{0U};
    Status status_{Status::kOk};
};

int main() {
    const ByteFrame filled(4U, std::uint8_t{0xAAU});
    const ByteFrame braced{4U, 0xAAU};
    const ByteFrame command{0x41U, 0x54U, 0x0DU};
    const ByteFrame oversized{1U, 2U, 3U, 4U, 5U, 6U, 7U, 8U, 9U};

    filled.Print("parentheses (count, fill)");
    braced.Print("braces (initializer-list)");
    command.Print("AT command bytes");
    oversized.Print("oversized list");

    std::cout << "braced constructor valid: " << std::boolalpha
              << braced.IsValid() << '\n';
    std::cout << "oversized status: "
              << static_cast<unsigned int>(oversized.GetStatus()) << '\n';

    return 0;
}
