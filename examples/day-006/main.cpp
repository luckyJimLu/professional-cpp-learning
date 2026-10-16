#include <cassert>
#include <iostream>
#include <string_view>

namespace modem {
enum class State { kOff, kBooting, kRegistering, kReady, kError };

struct SignalInfo {
  int rssi_dbm {};
  int quality_percent {};
};

[[nodiscard]] constexpr std::string_view ToString(State state) {
  switch (state) {
    case State::kOff: return "off";
    case State::kBooting: return "booting";
    case State::kRegistering: return "registering";
    case State::kReady: return "ready";
    case State::kError: return "error";
  }
  return "invalid";
}

[[nodiscard]] SignalInfo ReadSignal() {
  return {-75, 65};
}
}  // namespace modem

int main() {
  const modem::State state {modem::State::kReady};
  const auto [rssi_dbm, quality_percent] = modem::ReadSignal();
  assert(modem::ToString(state) == "ready");
  assert(rssi_dbm == -75);
  std::cout << "State: " << modem::ToString(state)
            << ", RSSI: " << rssi_dbm << " dBm"
            << ", Quality: " << quality_percent << "%\n";
  return 0;
}
