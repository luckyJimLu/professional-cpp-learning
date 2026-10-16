#include <cassert>
#include <cstdint>
#include <iostream>

namespace modem {
struct Config {
  std::uint32_t baud_rate_bps {115200};
  std::uint32_t timeout_ms {5000};
  std::uint8_t retry_count {3};
};

void SetTimeout(Config& config, std::uint32_t timeout_ms) {
  config.timeout_ms = timeout_ms;
}

void PrintConfig(const Config& config) {
  std::cout << "timeout = " << config.timeout_ms << " ms\n";
}
}  // namespace modem

int main() {
  modem::Config config {};
  modem::SetTimeout(config, 3000);
  assert(config.timeout_ms == 3000);
  modem::PrintConfig(config);
  return 0;
}
