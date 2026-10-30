#include <array>
#include <cstddef>
#include <iostream>
#include <memory_resource>
#include <vector>

class TelemetryBatch {
public:
  explicit TelemetryBatch(std::pmr::memory_resource& resource) : samples_{&resource} {}

  bool Prepare(std::size_t capacity) {
    try {
      samples_.reserve(capacity);
      return true;
    } catch (const std::bad_alloc&) {
      return false;
    }
  }

  void Push(int value) {
    samples_.push_back(value);
  }

  [[nodiscard]] std::size_t Size() const noexcept {
    return samples_.size();
  }

private:
  std::pmr::vector<int> samples_;
};

int main() {
  std::array<std::byte, 512> storage{};
  std::pmr::monotonic_buffer_resource arena{storage.data(), storage.size(),
                                            std::pmr::null_memory_resource()};

  TelemetryBatch batch{arena};
  if (!batch.Prepare(32)) {
    std::cout << "prepare failed\n";
    return 1;
  }

  for (int i = 0; i < 32; ++i) {
    batch.Push(i);
  }

  std::cout << "prepared samples=" << batch.Size() << '\n';
  std::cout << "Code review: allocation is bounded, but Push() still relies on the "
               "reserved-capacity invariant.\n";
  return 0;
}
