#include <cassert>
#include <iostream>

#include "config.hpp"
int main() {
  const modem::Config config{};
  assert(config.timeout.count() == 100);
  std::cout << "header is self-contained\n";
}
