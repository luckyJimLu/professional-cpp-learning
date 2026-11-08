#include <iostream>
#include <type_traits>

class FakeDmaPool {
public:
    [[nodiscard]] int Acquire() noexcept {
        if (active_) {
            return -1;
        }
        active_ = true;
        std::cout << "acquired DMA channel 0\n";
        return 0;
    }

    void Release(int channel) noexcept {
        if (channel != 0) {
            std::cout << "ERROR: unknown DMA channel\n";
            return;
        }
        if (!active_) {
            std::cout << "ERROR: duplicate release of DMA channel 0\n";
            return;
        }
        active_ = false;
        std::cout << "released DMA channel 0\n";
    }

    [[nodiscard]] bool IsActive() const noexcept { return active_; }

private:
    bool active_{false};
};

class DmaLease {
public:
    explicit DmaLease(FakeDmaPool& pool, int channel) noexcept
        : pool_{&pool}, channel_{channel} {}

    // Deliberate defect: compiler-generated copy operations duplicate the lease.
    ~DmaLease() {
        if (pool_ != nullptr) {
            pool_->Release(channel_);
        }
    }

private:
    FakeDmaPool* pool_; // borrowed; FakeDmaPool must outlive this lease
    int channel_;
};

template <typename T>
void TryCopy(const T& source) {
    if constexpr (std::is_copy_constructible_v<T>) {
        T duplicate{source};
        std::cout << "copy path compiled; duplicate lease created\n";
    } else {
        (void)source;
        std::cout << "copy is disabled at compile time\n";
    }
}

int main() {
    static_assert(std::is_copy_constructible_v<DmaLease>);
    static_assert(std::is_copy_assignable_v<DmaLease>);

    FakeDmaPool pool;
    const int channel = pool.Acquire();
    if (channel < 0) {
        std::cout << "DMA channel unavailable\n";
        return 1;
    }

    {
        DmaLease lease{pool, channel};
        TryCopy(lease);
    }

    std::cout << "pool active after lease scope: "
              << std::boolalpha << pool.IsActive() << "\n";
    return pool.IsActive() ? 2 : 0;
}
