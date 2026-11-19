#include <cstddef>
#include <iostream>
#include <memory>
#include <utility>

class DynamicBuffer {
public:
    explicit DynamicBuffer(std::size_t size)
        : data_(size == 0U ? nullptr : std::make_unique<std::byte[]>(size)),
          size_(size) {}

    DynamicBuffer(const DynamicBuffer&) = delete;
    DynamicBuffer& operator=(const DynamicBuffer&) = delete;

    DynamicBuffer(DynamicBuffer&& other) noexcept
        : data_(std::move(other.data_)),
          size_(std::exchange(other.size_, 0U)) {}

    DynamicBuffer& operator=(DynamicBuffer&& other) noexcept {
        if (this != &other) {
            data_ = std::move(other.data_);
            size_ = std::exchange(other.size_, 0U);
        }
        return *this;
    }

    [[nodiscard]] std::size_t Size() const noexcept { return size_; }

    [[nodiscard]] bool Write(std::size_t index, std::byte value) noexcept {
        if (index >= size_) return false;
        data_[index] = value;
        return true;
    }

    [[nodiscard]] std::byte Read(std::size_t index) const noexcept {
        return index < size_ ? data_[index] : std::byte{0};
    }

private:
    std::unique_ptr<std::byte[]> data_;
    std::size_t size_{0U};
};

int main() {
    DynamicBuffer rx{16U};
    const bool wrote = rx.Write(3U, std::byte{0x2AU});
    std::cout << "size=" << rx.Size()
              << " wrote=" << wrote
              << " value=" << std::to_integer<int>(rx.Read(3U)) << '\n';

    DynamicBuffer moved{std::move(rx)};
    std::cout << "source_size=" << rx.Size()
              << " moved_size=" << moved.Size() << '\n';
}