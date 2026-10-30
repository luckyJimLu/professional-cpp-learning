#include <array>
#include <cstddef>
#include <iostream>
#include <memory_resource>
#include <vector>

int main() {
  std::array<std::byte, 1024> storage{};
  std::pmr::monotonic_buffer_resource arena{storage.data(), storage.size(),
                                            std::pmr::null_memory_resource()};

  std::pmr::vector<int> samples{&arena};
  try {
    samples.reserve(64);
    for (int i = 0; i < 64; ++i) {
      samples.push_back(i * 2);
    }
    std::cout << "samples=" << samples.size() << " first=" << samples.front()
              << " last=" << samples.back() << '\n';
  } catch (const std::bad_alloc&) {
    std::cout << "arena exhausted\n";
    return 1;
  }
  return 0;
}
