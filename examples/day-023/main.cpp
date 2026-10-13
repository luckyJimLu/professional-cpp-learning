#include <algorithm>
#include <array>
#include <cassert>
#include <iostream>
#include <optional>
#include <string_view>
struct Command { std::string_view name; int id; };
constexpr std::array<Command, 2> kCommands{{{"ping", 1}, {"reset", 2}}};
std::optional<int> FindCommand(std::string_view name) {
  const auto it = std::find_if(kCommands.begin(), kCommands.end(),
      [name](const Command& command) { return command.name == name; });
  if (it == kCommands.end()) { return std::nullopt; }
  return it->id;
}
int main() {
  assert(FindCommand("ping").value() == 1);
  assert(!FindCommand("unknown"));
  std::cout << "lookup found and missing cases passed\n";
}
