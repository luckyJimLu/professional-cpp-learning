#include <array>
#include <cassert>
#include <cstddef>
#include <iostream>
#include <span>

enum class Status { kOk, kEmptyCommand, kCommandTooLarge };

class CommandBuffer {
public:
  static constexpr std::size_t kCapacity = 64;

  Status Store(std::span<const std::byte> command) {
    if (command.empty()) return Status::kEmptyCommand;
    if (command.size() > buffer_.size()) return Status::kCommandTooLarge;
    for (std::size_t i = 0; i < command.size(); ++i) {
      buffer_[i] = command[i];
    }
    size_ = command.size();
    return Status::kOk;
  }

  [[nodiscard]] std::span<const std::byte> View() const {
    return {buffer_.data(), size_};
  }

private:
  std::array<std::byte, kCapacity> buffer_{};
  std::size_t size_{0};
};

int main() {
  const std::array command{std::byte{'A'}, std::byte{'T'}};
  CommandBuffer buffer;
  const Status s = buffer.Store(command);
  assert(s == Status::kOk);
  assert(buffer.View().size() == 2);
  std::cout << "stored bytes: " << buffer.View().size() << '\n';
  return 0;
}
