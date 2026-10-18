#include <array>
#include <cassert>
#include <cstddef>
#include <iostream>
class Buffer {
public:
  bool Push(char value) {
    if (size_ == data_.size()) {
      return false;
    }
    data_[size_] = value;
    ++size_;
    return true;
  }
  std::size_t Size() const {
    return size_;
  }

private:
  std::array<char, 2> data_{};
  std::size_t size_{0};
};
int main() {
  Buffer buffer;
  assert(buffer.Size() == 0);
  assert(buffer.Push('A'));
  assert(buffer.Push('T'));
  assert(!buffer.Push('!'));
  assert(buffer.Size() == 2);
  std::cout << "buffer invariant preserved\n";
}
