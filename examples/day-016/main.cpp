#include <cassert>
#include <cstddef>
#include <iostream>
#include <limits>
#include <optional>
std::optional<int> CheckedCount(std::size_t size) {
  if (size > static_cast<std::size_t>(std::numeric_limits<int>::max())) {
    return std::nullopt;
  }
  return static_cast<int>(size);
}
int main() {
  assert(CheckedCount(3).value() == 3);
  assert(!CheckedCount(std::numeric_limits<std::size_t>::max()));
  std::cout << "size conversion checked\n";
}
