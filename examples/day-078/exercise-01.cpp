#include <array>
#include <cassert>
#include <cstddef>
#include <iostream>
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
            // BUG: the destination's currently owned channel is overwritten
            // without being released. The program remains runnable so that
            // the resource leak can be observed before fixing it.
            channel_ = std::exchange(other.channel_, -1);
        }
        return *this;
    }

    ~DmaLease() noexcept {
        if (channel_ >= 0) {
            FakeDmaHal::Release(channel_);
            channel_ = -1;
        }
    }

    [[nodiscard]] int Channel() const noexcept { return channel_; }

private:
    int channel_{-1};
};

int main() {
    {
        DmaLease destination{1};
        DmaLease source{2};
        destination = std::move(source);
        std::cout << "after move assignment: active=" << FakeDmaHal::ActiveCount()
                  << ", destination=" << destination.Channel()
                  << ", source=" << source.Channel() << "\n";
        assert(destination.Channel() == 2);
        assert(source.Channel() == -1);
    }

    const auto active_after_scope = FakeDmaHal::ActiveCount();
    const auto releases_after_scope = FakeDmaHal::ReleaseCount();
    std::cout << "after scope: active=" << active_after_scope
              << ", releases=" << releases_after_scope << "\n";
    std::cout << "expected after fix: active=0, releases=2\n";
    return 0;
}
