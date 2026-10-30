#include <cstddef>
#include <iostream>
#include <memory>
#include <new>

class RxBuffer {
public:
  explicit RxBuffer(std::size_t size) noexcept
      : size_{size}, data_{new(std::nothrow) unsigned char[size]} {}

  [[nodiscard]] bool Ready() const noexcept {
    return data_ != nullptr;
  }
  [[nodiscard]] std::size_t Size() const noexcept {
    return Ready() ? size_ : 0U;
  }
  unsigned char* Data() noexcept {
    return data_.get();
  }

private:
  std::size_t size_{};
  std::unique_ptr<unsigned char[]> data_;
};

bool Process(RxBuffer* buffer) {
  if (buffer == nullptr || !buffer->Ready()) {
    return false;
  }
  buffer->Data()[0] = 0x31U;
  return true;
}

int main() {
  RxBuffer buffer{64};
  const bool ok = Process(&buffer);
  std::cout << "ready=" << std::boolalpha << buffer.Ready() << " processed=" << ok
            << " size=" << buffer.Size() << '\n';
  std::cout << "Review target: required borrow and bool error model are underspecified.\n";
  return ok ? 0 : 1;
}
