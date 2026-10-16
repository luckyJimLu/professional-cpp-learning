#include <array>
#include <cassert>
#include <cstddef>
#include <cstdint>
#include <iostream>
#include <optional>
#include <span>

constexpr std::size_t kHeaderSize {2};

struct TlvHeader {
  std::uint8_t type {};
  std::uint8_t length {};
};

std::optional<TlvHeader> ParseTlvHeader(std::span<const std::uint8_t> frame) {
  if (frame.size() < kHeaderSize) {
    return std::nullopt;
  }
  return TlvHeader{frame[0], frame[1]};
}

int main() {
  const std::array<std::uint8_t, 4> valid_frame{0x01, 0x02, 0xAA, 0xBB};
  const auto header = ParseTlvHeader(valid_frame);
  assert(header.has_value());
  assert(header->type == 0x01);
  assert(header->length == 0x02);

  const std::array<std::uint8_t, 1> short_frame{0x01};
  assert(!ParseTlvHeader(short_frame).has_value());

  std::cout << "TLV Header parsed: type=" << static_cast<int>(header->type)
            << ", len=" << static_cast<int>(header->length) << '\n';
  return 0;
}
