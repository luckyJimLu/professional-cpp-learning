#include <array>
#include <cstddef>
#include <iostream>
#include <span>

class FixedRxBuffer {
public:
  [[nodiscard]] std::span<std::byte> Bytes() noexcept {
    return bytes_;
  }
  [[nodiscard]] constexpr std::size_t Capacity() const noexcept {
    return bytes_.size();
  }

private:
  std::array<std::byte, 128> bytes_{};
};

class ModemSession {
public:
  explicit ModemSession(FixedRxBuffer& rx) noexcept : rx_{rx} {}

  void ReceiveDemo() {
    auto bytes = rx_.Bytes();
    bytes[0] = std::byte{0x41};
    std::cout << "capacity=" << rx_.Capacity() << " first=" << std::to_integer<int>(bytes[0])
              << '\n';
  }

private:
  FixedRxBuffer& rx_;
};

int main() {
  FixedRxBuffer rx;
  ModemSession session{rx};
  session.ReceiveDemo();
}
