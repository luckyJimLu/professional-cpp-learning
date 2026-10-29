#include <array>
#include <cstddef>
#include <iostream>
#include <memory>
#include <new>
#include <utility>

struct AtTransaction {
    explicit AtTransaction(int id) noexcept : id{id} {
        std::cout << "construct " << id << '\n';
    }
    ~AtTransaction() { std::cout << "destroy " << id << '\n'; }
    void Run() const { std::cout << "run AT transaction " << id << '\n'; }
    int id{};
};

template <typename T>
class SingleSlot {
public:
    SingleSlot() = default;
    SingleSlot(const SingleSlot&) = delete;
    SingleSlot& operator=(const SingleSlot&) = delete;
    ~SingleSlot() { Reset(); }

    template <typename... Args>
    T* Emplace(Args&&... args) {
        Reset();
        T* ptr = std::construct_at(
            reinterpret_cast<T*>(storage_.data()), std::forward<Args>(args)...);
        engaged_ = true;
        return ptr;
    }

    void Reset() noexcept {
        if (engaged_) {
            std::destroy_at(reinterpret_cast<T*>(storage_.data()));
            engaged_ = false;
        }
    }

private:
    alignas(T) std::array<std::byte, sizeof(T)> storage_{};
    bool engaged_{false};
};

int main() {
    SingleSlot<AtTransaction> slot;
    auto* transaction = slot.Emplace(64);
    transaction->Run();
    slot.Reset();
    auto* next = slot.Emplace(65);
    next->Run();
}
