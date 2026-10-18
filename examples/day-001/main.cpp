#include <array>
#include <cassert>
#include <iostream>
namespace modem {
int Sum(const std::array<int, 3>& signals) {
  int total{0};
  for (const int signal : signals) {
    total += signal;
  }
  return total;
}
}  // namespace modem
int main() {
  const std::array<int, 3> signals{3, 4, 5};
  const int total = modem::Sum(signals);
  assert(total == 12);
  std::cout << "signal sum=" << total << '\n';
}
