#include <array>
#include <cstddef>
#include <iostream>
#include <optional>
#include <span>

enum class AcquireError {
    no_capacity
};

struct Packet {
    int id{};
    std::array<std::byte, 32> payload{};
};

class PacketPool {
public:
    [[nodiscard]] std::optional<std::size_t> Acquire(int id) noexcept {
        for (std::size_t i = 0; i < slots_.size(); ++i) {
            if (!slots_[i].has_value()) {
                slots_[i].emplace(Packet{id, {}});
                return i;
            }
        }
        return std::nullopt;
    }

    [[nodiscard]] Packet& Borrow(std::size_t slot) {
        return slots_.at(slot).value();
    }

    void Release(std::size_t slot) noexcept {
        slots_[slot].reset();
    }

private:
    std::array<std::optional<Packet>, 2> slots_{};
};

int main() {
    PacketPool pool;
    const auto slot = pool.Acquire(66);
    if (!slot) {
        std::cout << "no capacity\n";
        return 1;
    }

    Packet& packet = pool.Borrow(*slot);
    packet.payload[0] = std::byte{0x42};
    std::cout << "packet id=" << packet.id
              << " first=" << std::to_integer<unsigned int>(packet.payload[0]) << '\n';

    pool.Release(*slot);
    std::cout << "released slot=" << *slot << '\n';
    return 0;
}
