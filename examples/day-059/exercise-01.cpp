#include <iostream>
#include <memory>

struct DriverHandle {
  int id{};
};

DriverHandle* DriverOpen() noexcept {
  static DriverHandle handle{7};
  return &handle;
}

void DriverClose(DriverHandle* handle) noexcept {
  if (handle != nullptr) {
    std::cout << "driver close id=" << handle->id << '\n';
  }
}

struct DriverCloser {
  void operator()(DriverHandle* handle) const noexcept {
    DriverClose(handle);
  }
};

using UniqueDriver = std::unique_ptr<DriverHandle, DriverCloser>;

int main() {
  UniqueDriver driver{DriverOpen()};
  if (!driver) {
    std::cerr << "driver open failed\n";
    return 1;
  }

  std::cout << "driver active id=" << driver->id << '\n';
  std::cout
      << "Code review: keep the deleter at the ownership boundary; consumers should borrow.\n";
  return 0;
}
