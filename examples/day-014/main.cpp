#include <cassert>
#include <iostream>

#include "config.hpp"
#include "config.hpp"  // Verify that the include guard permits repeated inclusion.
int main() {
  const modem::Config config{};
  assert(config.timeout.count() == 100);
  std::cout << "header is self-contained\n";
}
