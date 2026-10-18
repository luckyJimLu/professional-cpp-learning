#include <cassert>
#include <charconv>
#include <iostream>
#include <optional>
#include <string>
#include <string_view>

namespace modem {
enum class RegistrationState {
  kNotRegistered = 0,
  kRegisteredHome = 1,
  kSearching = 2,
  kDenied = 3,
  kUnknown = 4,
  kRegisteredRoaming = 5
};

std::string BuildAtCommand(std::string_view command, std::string_view argument) {
  std::string result{"AT"};
  result += command;
  if (!argument.empty()) {
    result += '=';
    result += argument;
  }
  result += "\r\n";
  return result;
}

std::optional<RegistrationState> ParseRegistrationState(std::string_view response) {
  constexpr std::string_view kPrefix{"+CREG: "};
  const auto prefix_pos = response.find(kPrefix);
  if (prefix_pos == std::string_view::npos) return std::nullopt;
  const auto text = response.substr(prefix_pos + kPrefix.size());
  int value{};
  const auto [ptr, error] = std::from_chars(text.data(), text.data() + text.size(), value);
  if (error != std::errc{} || ptr == text.data()) return std::nullopt;
  switch (value) {
    case 0:
      return RegistrationState::kNotRegistered;
    case 1:
      return RegistrationState::kRegisteredHome;
    case 2:
      return RegistrationState::kSearching;
    case 3:
      return RegistrationState::kDenied;
    case 4:
      return RegistrationState::kUnknown;
    case 5:
      return RegistrationState::kRegisteredRoaming;
    default:
      return std::nullopt;
  }
}
}  // namespace modem

int main() {
  const auto cmd = modem::BuildAtCommand("+CSQ", "");
  assert(cmd == "AT+CSQ\r\n");

  const auto cmd_with_arg = modem::BuildAtCommand("+CFUN", "1");
  assert(cmd_with_arg == "AT+CFUN=1\r\n");

  const auto reg = modem::ParseRegistrationState("+CREG: 1");
  assert(reg == modem::RegistrationState::kRegisteredHome);

  std::cout << "Built: " << cmd_with_arg;
  std::cout << "Registration parsed: home network\n";
  return 0;
}
