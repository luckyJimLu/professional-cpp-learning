#include <array>
#include <cstddef>
#include <iostream>
#include <optional>
#include <utility>

struct Transaction {
    int id{};
    int retries{};
    Transaction(int i, int r) noexcept : id{i}, retries{r} {}
};

class TransactionSlot {
public:
    [[nodiscard]] bool Emplace(int id, int retries) noexcept {
        if (value_.has_value()) return false;
        value_.emplace(id, retries);
        return true;
    }
    void Reset() noexcept { value_.reset(); }
    [[nodiscard]] Transaction* Get() noexcept {
        return value_ ? &*value_ : nullptr;
    }
private:
    std::optional<Transaction> value_;
};

int main() {
    TransactionSlot slot;
    std::cout << "acquire=" << slot.Emplace(65, 2) << '\n';
    if (auto* tx = slot.Get()) {
        std::cout << "id=" << tx->id << " retries=" << tx->retries << '\n';
    }
    slot.Reset();
    std::cout << "reacquire=" << slot.Emplace(66, 0) << '\n';
    return 0;
}
