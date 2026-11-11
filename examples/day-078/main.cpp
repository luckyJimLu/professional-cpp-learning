#include <array>
#include <cassert>
#include <cstddef>
#include <cstdint>
#include <iostream>
#include <type_traits>
#include <utility>

class FakeDmaHal {
public:
    static bool Acquire(int channel) noexcept {
        if (channel < 0 || channel >= static_cast<int>(channels_.size())) {
            return false;
        }
        const auto index = static_cast<std::size_t>(channel);
        if (channels_[index]) {
            return false;
        }
        channels_[index] = true;
        return true;
    }

    static void Release(int channel) noexcept {
        if (channel < 0 || channel >= static_cast<int>(channels_.size())) {
            return;
        }
        const auto index = static_cast<std::size_t>(channel);
        if (channels_[index]) {
            channels_[index] = false;
            ++release_count_;
        }
    }

    [[nodiscard]] static std::size_t ActiveCount() noexcept {
        std::size_t count = 0U;
        for (const bool active : channels_) {
            if (active) {
                ++count;
            }
        }
        return count;
    }

    [[nodiscard]] static std::size_t ReleaseCount() noexcept {
        return release_count_;
    }

private:
    inline static std::array<bool, 4> channels_{};
    inline static std::size_t release_count_{0U};
};

class FixedFrame {
public:
    static constexpr std::size_t kCapacity = 8U;

    FixedFrame() noexcept = default;

    FixedFrame(const std::array<std::uint8_t, kCapacity>& bytes,
               std::size_t length) noexcept
        : bytes_{bytes}, length_{length <= kCapacity ? length : kCapacity} {}

    FixedFrame& operator=(const FixedFrame&) noexcept = default;

    [[nodiscard]] std::uint8_t At(std::size_t index) const noexcept {
        return index < length_ ? bytes_[index] : 0U;
    }

    void Set(std::size_t index, std::uint8_t value) noexcept {
        if (index < length_) {
            bytes_[index] = value;
        }
    }

    [[nodiscard]] std::size_t Size() const noexcept { return length_; }

private:
    std::array<std::uint8_t, kCapacity> bytes_{};
    std::size_t length_{0U};
};

class DmaLease {
public:
    explicit DmaLease(int channel) noexcept : channel_{channel} {
        if (!FakeDmaHal::Acquire(channel_)) {
            channel_ = -1;
        }
    }

    DmaLease(const DmaLease&) = delete;
    DmaLease& operator=(const DmaLease&) = delete;

    DmaLease(DmaLease&& other) noexcept
        : channel_{std::exchange(other.channel_, -1)} {}

    DmaLease& operator=(DmaLease&& other) noexcept {
        if (this != &other) {
            Reset();
            channel_ = std::exchange(other.channel_, -1);
        }
        return *this;
    }

    ~DmaLease() noexcept { Reset(); }

    [[nodiscard]] int Channel() const noexcept { return channel_; }

private:
    void Reset() noexcept {
        if (channel_ >= 0) {
            FakeDmaHal::Release(channel_);
            channel_ = -1;
        }
    }

    int channel_{-1};
};

int main() {
    std::cout << "[1] value assignment\n";
    const std::array<std::uint8_t, FixedFrame::kCapacity> payload{
        0xA1U, 0xB2U, 0xC3U, 0xD4U, 0U, 0U, 0U, 0U};
    FixedFrame source{payload, 4U};
    FixedFrame destination;
    FixedFrame chained;

    destination = source;
    const bool chaining_returns_left_operand = &(chained = destination) == &chained;
    destination.Set(0U, 0x11U);

    assert(source.At(0U) == 0xA1U);
    assert(destination.At(0U) == 0x11U);
    assert(chained.At(0U) == 0xA1U);
    assert(chaining_returns_left_operand);
    std::cout << "source[0]=0x" << std::hex << static_cast<unsigned>(source.At(0U))
              << ", destination[0]=0x" << static_cast<unsigned>(destination.At(0U))
              << std::dec << "\n";
    std::cout << "assignment chaining returns T&: "
              << (chaining_returns_left_operand ? "true" : "false") << "\n";

    std::cout << "[2] move-only resource assignment\n";
    static_assert(!std::is_copy_assignable_v<DmaLease>);
    {
        DmaLease current{1};
        DmaLease incoming{2};
        current = std::move(incoming);
        assert(current.Channel() == 2);
        assert(incoming.Channel() == -1);
        assert(FakeDmaHal::ActiveCount() == 1U);
        std::cout << "current channel=" << current.Channel()
                  << ", source channel=" << incoming.Channel()
                  << ", active DMA channels=" << FakeDmaHal::ActiveCount() << "\n";
    }

    assert(FakeDmaHal::ActiveCount() == 0U);
    assert(FakeDmaHal::ReleaseCount() == 2U);
    std::cout << "active after scope=" << FakeDmaHal::ActiveCount()
              << ", total releases=" << FakeDmaHal::ReleaseCount() << "\n";
    std::cout << "all checks passed\n";
    return 0;
}
