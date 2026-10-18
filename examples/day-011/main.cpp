#include <array>
#include <cassert>
#include <cstdint>
#include <cstdio>
#include <iostream>

struct RadioStatus {
  int rssi_dbm{};
  std::uint32_t timeout_ms{};
  std::uint8_t retry_count{};
};

bool FormatRadioStatusToBuffer(const RadioStatus& status, std::array<char, 96>& output) {
  const int written = std::snprintf(
      output.data(), output.size(), "RSSI=%d dBm, timeout=%u ms, retry=%u", status.rssi_dbm,
      static_cast<unsigned int>(status.timeout_ms), static_cast<unsigned int>(status.retry_count));
  if (written < 0) {
    return false;
  }
  return static_cast<std::size_t>(written) < output.size();
}

int main() {
  const RadioStatus status{-73, 5000U, 3U};
  std::array<char, 96> output{};
  const bool ok = FormatRadioStatusToBuffer(status, output);
  assert(ok);
  std::cout << output.data() << '\n';
  return 0;
}
