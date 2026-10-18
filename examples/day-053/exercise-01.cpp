#include <chrono>
#include <cstddef>
#include <iostream>
#include <span>
#include <vector>

using namespace std::chrono_literals;

enum class Status { kOk, kInvalidArgument };

// Starter: runnable, but the abstraction leaks storage policy and permits
// unbounded growth. Refactor without changing the observable behavior.
class TelemetryBuffer {
 public:
  Status Push(std::span<const std::byte> payload) {
    if (payload.empty()) return Status::kInvalidArgument;
    data_.insert(data_.end(), payload.begin(), payload.end());
    return Status::kOk;
  }
  std::size_t Size() const { return data_.size(); }
 private:
  std::vector<std::byte> data_;
};

int main() {
  TelemetryBuffer buffer;
  const std::byte bytes[]{std::byte{0x01}, std::byte{0x02}, std::byte{0x03}};
  const auto status = buffer.Push(bytes);
  std::cout << "status=" << static_cast<int>(status)
            << " size=" << buffer.Size() << '\n';
  return status == Status::kOk ? 0 : 1;
}
