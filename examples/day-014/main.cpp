#include "config.hpp"
#include "config.hpp"
#include <cassert>
#include <iostream>
int main() {
  const modem::Config config{};
  assert(config.timeout.count() == 100);
  std::cout << "header is self-contained\n";
}
