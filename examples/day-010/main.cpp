#include <cassert>
#include <charconv>
#include <iostream>
#include <optional>
#include <string_view>

struct CregStatus {
  int mode {};
  int status {};
};

std::optional<int> ParseInt(std::string_view text) {
  int value {};
  const char* const begin = text.data();
  const char* const end = begin + text.size();
  const auto [ptr, ec] = std::from_chars(begin, end, value);
  if (ec != std::errc{} || ptr != end) {
    return std::nullopt;
  }
  return value;
}

std::optional<CregStatus> ParseCreg(std::string_view response) {
  constexpr std::string_view kPrefix {"+CREG:"};
  if (!response.starts_with(kPrefix)) return std::nullopt;
  response.remove_prefix(kPrefix.size());
  while (!response.empty() && response.front() == ' ') response.remove_prefix(1);
  const auto comma = response.find(',');
  if (comma == std::string_view::npos) return std::nullopt;
  const auto mode = ParseInt(response.substr(0, comma));
  const auto status = ParseInt(response.substr(comma + 1));
  if (!mode || !status) return std::nullopt;
  return CregStatus{.mode = *mode, .status = *status};
}

int main() {
  const auto creg = ParseCreg("+CREG: 2,1");
  assert(creg.has_value());
  assert(creg->mode == 2);
  assert(creg->status == 1);

  assert(!ParseCreg("+CREG:").has_value());
  assert(!ParseCreg("+CREG: x,1").has_value());
  assert(!ParseCreg("ERROR").has_value());

  std::cout << "Parsed +CREG: mode=" << creg->mode << ", status=" << creg->status << '\n';
  return 0;
}
