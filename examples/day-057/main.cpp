#include <cstddef>
#include <iostream>
#include <memory>
#include <span>

class FrameBuffer {
public:
    explicit FrameBuffer(std::size_t size)
        : size_{size}, data_{std::make_unique<std::byte[]>(size)} {}

    FrameBuffer(const FrameBuffer&) = delete;
    FrameBuffer& operator=(const FrameBuffer&) = delete;
    FrameBuffer(FrameBuffer&&) noexcept = default;
    FrameBuffer& operator=(FrameBuffer&&) noexcept = default;

    [[nodiscard]] std::span<std::byte> Bytes() noexcept {
        return {data_.get(), size_};
    }

    [[nodiscard]] std::size_t Size() const noexcept { return size_; }

private:
    std::size_t size_{};
    std::unique_ptr<std::byte[]> data_;
};

void FillHeader(FrameBuffer& buffer) {
    auto bytes = buffer.Bytes();
    if (bytes.size() >= 2U) {
        bytes[0] = std::byte{0xAA};
        bytes[1] = std::byte{0x55};
    }
}

int main() {
    FrameBuffer rx{128};
    FillHeader(rx);
    const auto bytes = rx.Bytes();
    std::cout << "size=" << rx.Size()
              << " header="
              << std::to_integer<unsigned int>(bytes[0]) << ","
              << std::to_integer<unsigned int>(bytes[1]) << '\n';

    FrameBuffer next{std::move(rx)};
    std::cout << "ownership transferred, next.size=" << next.Size() << '\n';
}
