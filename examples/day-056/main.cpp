#include <array>
#include <cstddef>
#include <iostream>
#include <memory>
#include <span>

class DmaBuffer {
public:
  explicit DmaBuffer(std::size_t size) : size_{size}, data_{std::make_unique<std::byte[]>(size)} {}

  DmaBuffer(const DmaBuffer&) = delete;
  DmaBuffer& operator=(const DmaBuffer&) = delete;
  DmaBuffer(DmaBuffer&&) noexcept = default;
  DmaBuffer& operator=(DmaBuffer&&) noexcept = default;

  [[nodiscard]] std::span<std::byte> Bytes() noexcept {
    return {data_.get(), size_};
  }
  [[nodiscard]] std::size_t Size() const noexcept {
    return size_;
  }

private:
  std::size_t size_{};
  std::unique_ptr<std::byte[]> data_;
};

int main() {
  DmaBuffer rx{64};
  auto bytes = rx.Bytes();
  bytes[0] = std::byte{0x2A};
  std::cout << "owned bytes=" << rx.Size() << " first=" << std::to_integer<int>(bytes[0]) << '\n';
}
