#include <cassert>
#include <chrono>
#include <iostream>
enum class ConnectResult { Connected, InvalidTimeout };
ConnectResult Connect(std::chrono::milliseconds timeout) {
  if (timeout.count() <= 0) {
    return ConnectResult::InvalidTimeout;
  }
  return ConnectResult::Connected;
}
int main() {
  assert(Connect(std::chrono::milliseconds{100}) == ConnectResult::Connected);
  assert(Connect(std::chrono::milliseconds{0}) == ConnectResult::InvalidTimeout);
  std::cout << "timeout unit and result are explicit\n";
}
