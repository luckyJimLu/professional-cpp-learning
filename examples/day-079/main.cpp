#include <array>
#include <cstddef>
#include <cstdint>
#include <iostream>

class ModemFrame {
public:
    [[nodiscard]] bool Set(std::size_t index, std::uint8_t value) noexcept {
        if (index >= payload_.size()) {
            return false;
        }
        payload_[index] = value;
        if (length_ <= index) {
            length_ = index + 1U;
        }
        return true;
    }

    [[nodiscard]] std::size_t length() const noexcept { return length_; }

    friend bool IsValidFrame(const ModemFrame& frame) noexcept;

private:
    std::array<std::uint8_t, 8> payload_{};
    std::size_t length_{0U};
};

[[nodiscard]] bool IsValidFrame(const ModemFrame& frame) noexcept {
    return frame.length_ <= frame.payload_.size();
}

int main() {
    ModemFrame frame;
    const bool first = frame.Set(0U, 0x41U);
    const bool second = frame.Set(1U, 0x54U);
    std::cout << "set_ok=" << (first && second)
              << " length=" << frame.length()
              << " valid=" << IsValidFrame(frame) << '\n';
    return IsValidFrame(frame) ? 0 : 1;
}
