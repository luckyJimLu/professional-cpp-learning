#include <array>
#include <cstddef>
#include <iostream>
#include <memory>
#include <new>

struct Command {
  explicit Command(int value) noexcept : value{value} {
    std::cout << "construct " << value << '\n';
  }
  ~Command() {
    std::cout << "destroy " << value << '\n';
  }
  int value{};
};

int main() {
  alignas(Command) std::array<std::byte, sizeof(Command)> storage{};

  Command* first = std::construct_at(reinterpret_cast<Command*>(storage.data()), 1);
  Command* borrowed = first;
  std::cout << "borrowed value=" << borrowed->value << '\n';

  std::destroy_at(first);
  Command* second = std::construct_at(reinterpret_cast<Command*>(storage.data()), 2);

  std::cout << "new object value=" << second->value << '\n';
  std::cout
      << "Code review: the old borrowed pointer must not be used across destroy/reconstruct.\n";

  std::destroy_at(second);
}
