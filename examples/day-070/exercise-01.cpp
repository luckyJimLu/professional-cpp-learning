#include <array>
#include <cstddef>
#include <cstdint>
#include <iostream>

enum class DmaChannelId : std::uint8_t {
    kDma1,
    kDma2
};

[[nodiscard]] constexpr const char* ToString(DmaChannelId channel) noexcept {
    switch (channel) {
        case DmaChannelId::kDma1:
            return "DMA1";
        case DmaChannelId::kDma2:
            return "DMA2";
    }
    return "unknown";
}

class DmaBuffer {
public:
    inline static std::size_t default_constructions{0U};
    inline static std::size_t sized_constructions{0U};
    inline static std::size_t copy_assignments{0U};

    DmaBuffer() noexcept : capacity_{0U}, storage_{} {
        ++default_constructions;
    }

    explicit DmaBuffer(std::size_t capacity) noexcept
        : capacity_{capacity}, storage_{} {
        ++sized_constructions;
    }

    DmaBuffer& operator=(const DmaBuffer& other) noexcept {
        if (this != &other) {
            capacity_ = other.capacity_;
            storage_ = other.storage_;
        }
        ++copy_assignments;
        return *this;
    }

    [[nodiscard]] std::size_t capacity() const noexcept {
        return capacity_;
    }

private:
    std::size_t capacity_;
    std::array<std::uint8_t, 64U> storage_;
};

class DmaChannel {
public:
    DmaChannel(DmaChannelId channel, std::size_t capacity) noexcept {
        channel_ = channel;
        buffer_ = DmaBuffer{capacity};
    }

    [[nodiscard]] DmaChannelId channel() const noexcept {
        return channel_;
    }

    [[nodiscard]] std::size_t capacity() const noexcept {
        return buffer_.capacity();
    }

private:
    DmaChannelId channel_{DmaChannelId::kDma1};
    DmaBuffer buffer_{};
};

int main() {
    const DmaChannel channel{DmaChannelId::kDma2, 32U};

    std::cout << ToString(channel.channel()) << " capacity="
              << channel.capacity() << '\n';
    std::cout << "DmaBuffer constructions: default="
              << DmaBuffer::default_constructions
              << ", sized=" << DmaBuffer::sized_constructions
              << ", copy assignments=" << DmaBuffer::copy_assignments << '\n';

    return channel.channel() == DmaChannelId::kDma2 &&
                   channel.capacity() == 32U &&
                   DmaBuffer::default_constructions == 1U &&
                   DmaBuffer::sized_constructions == 1U &&
                   DmaBuffer::copy_assignments == 1U
               ? 0
               : 1;
}
