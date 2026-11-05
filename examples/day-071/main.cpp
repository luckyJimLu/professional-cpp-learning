#include <algorithm>
#include <array>
#include <cstddef>
#include <cstdint>
#include <iostream>
#include <span>
#include <type_traits>

class AtFrame {
public:
    static constexpr std::size_t kCapacity{8U};

    AtFrame() noexcept = default;
    AtFrame(const AtFrame&) noexcept = default;

    [[nodiscard]] bool Load(std::span<const std::uint8_t> bytes) noexcept {
        if (bytes.size() > storage_.size()) {
            return false;
        }

        storage_.fill(0U);
        std::copy(bytes.begin(), bytes.end(), storage_.begin());
        size_ = bytes.size();
        return true;
    }

    [[nodiscard]] bool SetByte(std::size_t index, std::uint8_t value) noexcept {
        if (index >= size_) {
            return false;
        }
        storage_[index] = value;
        return true;
    }

    [[nodiscard]] std::size_t size() const noexcept {
        return size_;
    }

    [[nodiscard]] std::span<const std::uint8_t> payload() const noexcept {
        return {storage_.data(), size_};
    }

private:
    std::array<std::uint8_t, kCapacity> storage_{};
    std::size_t size_{0U};
};

void PrintFrame(const char* label, const AtFrame& frame) {
    std::cout << label << " (" << frame.size() << " bytes):";
    for (const std::uint8_t byte : frame.payload()) {
        std::cout << ' ' << static_cast<unsigned int>(byte);
    }
    std::cout << '\n';
}

void InspectByValue(AtFrame frame) {
    std::cout << "by-value parameter length=" << frame.size() << '\n';
}

int main() {
    static_assert(std::is_copy_constructible_v<AtFrame>);
    static_assert(std::is_nothrow_copy_constructible_v<AtFrame>);

    const std::array<std::uint8_t, 3U> command{65U, 84U, 13U};
    AtFrame original;
    if (!original.Load(command)) {
        std::cerr << "initial load failed\n";
        return 1;
    }

    AtFrame copied{original};
    if (!copied.SetByte(0U, 90U)) {
        std::cerr << "copy update failed\n";
        return 1;
    }

    PrintFrame("original", original);
    PrintFrame("copy", copied);

    const AtFrame& borrowed = original;
    std::cout << "const-reference borrow length=" << borrowed.size() << '\n';
    InspectByValue(original);

    const std::array<std::uint8_t, AtFrame::kCapacity + 1U> oversized{};
    const bool oversized_accepted = original.Load(oversized);
    std::cout << "oversized load: "
              << (oversized_accepted ? "accepted" : "rejected")
              << ", original length=" << original.size() << '\n';

    return !oversized_accepted && original.size() == command.size() &&
                   original.payload()[0U] == 65U && copied.payload()[0U] == 90U
               ? 0
               : 1;
}
