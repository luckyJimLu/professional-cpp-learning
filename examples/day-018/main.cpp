#include <cassert>
#include <charconv>
#include <iostream>
#include <optional>
#include <string_view>
#include <system_error>
std::optional<int> ParseChannel(std::string_view text) {
  int channel{};
  const auto [end, error] = std::from_chars(text.data(), text.data() + text.size(), channel);
  if (error != std::errc{} || end != text.data() + text.size() || channel < 0 || channel > 15) {
    return std::nullopt;
  }
  return channel;
}
int main() {
  assert(ParseChannel("0").value() == 0);
  assert(ParseChannel("15").value() == 15);
  assert(!ParseChannel(""));
  assert(!ParseChannel("3x"));
  assert(!ParseChannel("-1"));
  assert(!ParseChannel("16"));
  assert(!ParseChannel("99999999999999999"));
  std::cout << "strict channel parser passed\n";
}
