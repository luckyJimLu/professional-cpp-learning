#include <array>
#include <cstddef>
#include <cstdint>
#include <iostream>

class Packet {
public:
    [[nodiscard]] bool Append(std::uint8_t value) noexcept {
        if (length_ == bytes_.size()) {
            return false;
        }
        bytes_[length_] = value;
        ++length_;
        return true;
    }

    [[nodiscard]] std::size_t length() const noexcept { return length_; }

    // Design smell: the entire diagnostic class receives access to every private member.
    friend class PacketDiagnostics;

private:
    std::array<std::uint8_t, 4> bytes_{};
    std::size_t length_{0U};
};

class PacketDiagnostics {
public:
    [[nodiscard]] static bool IsValid(const Packet& packet) noexcept {
        return packet.length_ <= packet.bytes_.size();
    }

    // This method demonstrates why broad friendship is risky: diagnostics can mutate payload.
    static void CorruptForDemo(Packet& packet) noexcept {
        packet.length_ = packet.bytes_.size() + 1U;
    }
};

int main() {
    Packet packet;
    (void)packet.Append(0x41U);
    std::cout << "before=" << PacketDiagnostics::IsValid(packet) << '\n';
    PacketDiagnostics::CorruptForDemo(packet);
    std::cout << "after=" << PacketDiagnostics::IsValid(packet)
              << " length=" << packet.length() << '\n';
    return 0;
}
