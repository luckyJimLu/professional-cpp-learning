#include <cstddef>
#include <iostream>
#include <memory>

class ModemPacket {
public:
  explicit ModemPacket(std::size_t size)
      : size_{size}, data_{std::make_unique<unsigned char[]>(size)} {}

  unsigned char* Data() noexcept {
    return data_.get();
  }
  [[nodiscard]] std::size_t Size() const noexcept {
    return size_;
  }

private:
  std::size_t size_{};
  std::unique_ptr<unsigned char[]> data_;
};

void Inspect(const ModemPacket* packet) {
  if (packet == nullptr) {
    std::cout << "no packet\n";
    return;
  }
  std::cout << "inspect size=" << packet->Size() << '\n';
}

int main() {
  auto packet = std::make_unique<ModemPacket>(64);
  packet->Data()[0] = 0x42U;
  Inspect(packet.get());

  // Code-review target: the callee only borrows, but the pointer API makes
  // optionality/lifetime less explicit than a required reference would.
  std::cout << "first=" << static_cast<unsigned int>(packet->Data()[0]) << '\n';
}
