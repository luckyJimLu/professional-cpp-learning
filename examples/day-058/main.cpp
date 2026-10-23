#include <cstddef>
#include <iostream>
#include <memory>
#include <new>
#include <span>

class FrameStorage {
public:
    explicit FrameStorage(std::size_t size) noexcept
        : size_{size}, data_{new (std::nothrow) std::byte[size]} {}

    FrameStorage(const FrameStorage&) = delete;
    FrameStorage& operator=(const FrameStorage&) = delete;
    FrameStorage(FrameStorage&&) noexcept = default;
    FrameStorage& operator=(FrameStorage&&) noexcept = default;

    [[nodiscard]] bool IsValid() const noexcept { return data_ != nullptr; }
    [[nodiscard]] std::span<std::byte> Bytes() noexcept {
        return {data_.get(), IsValid() ? size_ : 0U};
    }
    [[nodiscard]] std::size_t Size() const noexcept {
        return IsValid() ? size_ : 0U;
    }

private:
    std::size_t size_{};
    std::unique_ptr<std::byte[]> data_;
};

int main() {
    FrameStorage storage{256};
    if (!storage.IsValid()) {
        std::cout << "allocation failed\n";
        return 1;
    }

    auto bytes = storage.Bytes();
    bytes[0] = std::byte{0x7E};
    std::cout << "allocated=" << storage.Size()
              << " first=" << std::to_integer<unsigned int>(bytes[0]) << '\n';
}
