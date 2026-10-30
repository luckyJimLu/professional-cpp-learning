#include <array>
#include <cstddef>
#include <iostream>
#include <optional>

struct Command {
  int id{};
};

template <std::size_t N>
class CommandPool {
public:
  [[nodiscard]] Command* Acquire(int id) noexcept {
    for (auto& slot : slots_) {
      if (!slot.has_value()) {
        slot.emplace(Command{id});
        return &*slot;
      }
    }
    return nullptr;
  }

  bool Release(Command* command) noexcept {
    for (auto& slot : slots_) {
      if (slot.has_value() && &*slot == command) {
        slot.reset();
        return true;
      }
    }
    return false;
  }

private:
  std::array<std::optional<Command>, N> slots_{};
};

int main() {
  CommandPool<2> pool;
  Command* first = pool.Acquire(1);
  Command* second = pool.Acquire(2);
  Command* exhausted = pool.Acquire(3);

  std::cout << "first=" << (first ? first->id : -1) << " second=" << (second ? second->id : -1)
            << " exhausted=" << (exhausted == nullptr) << '\n';

  if (first != nullptr) {
    std::cout << "release=" << pool.Release(first) << '\n';
  }
  Command* reused = pool.Acquire(4);
  std::cout << "reused=" << (reused ? reused->id : -1) << '\n';
  std::cout << "Code review: raw pointer is still a stale-handle risk after release/reuse.\n";
  return 0;
}
