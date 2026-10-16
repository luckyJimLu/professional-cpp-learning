#include <cassert>
#include <charconv>
#include <iostream>
#include <optional>
#include <string_view>

namespace modem {
struct SignalQuality {
  int rssi{};
  int ber{};
};

std::optional<int> ParseInt(std::string_view text) {
  int value{};
  const char* begin = text.data();
  const char* end = text.data() + text.size();
  const auto [ptr, error] = std::from_chars(begin, end, value);
  if (error != std::errc{} || ptr != end) return std::nullopt;
  return value;
}

std::optional<SignalQuality> ParseCsq(std::string_view response) {
  constexpr std::string_view kPrefix{"+CSQ:"};
  if (!response.starts_with(kPrefix)) return std::nullopt;
  response.remove_prefix(kPrefix.size());
  const std::size_t comma = response.find(',');
  if (comma == std::string_view::npos) return std::nullopt;
  auto rssi_text = response.substr(0, comma);
  auto ber_text = response.substr(comma + 1);
  while (!rssi_text.empty() && rssi_text.front() == ' ') rssi_text.remove_prefix(1);
  const auto rssi = ParseInt(rssi_text);
  const auto ber = ParseInt(ber_text);
  if (!rssi || !ber) return std::nullopt;
  return SignalQuality{.rssi = *rssi, .ber = *ber};
}
}  // namespace modem

int main() {
  const auto quality = modem::ParseCsq("+CSQ: 18,99");
  assert(quality.has_value());
  assert(quality->rssi == 18);
  assert(quality->ber == 99);

  assert(!modem::ParseCsq("+ERROR").has_value());
  assert(!modem::ParseCsq("+CSQ: invalid").has_value());

  std::cout << "Parsed CSQ: rssi=" << quality->rssi << ", ber=" << quality->ber << '\n';
  return 0;
}
