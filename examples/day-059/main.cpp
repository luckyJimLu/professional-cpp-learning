#include <cstdio>
#include <iostream>
#include <memory>
#include <utility>

struct FileCloser {
  void operator()(std::FILE* file) const noexcept {
    if (file != nullptr) {
      std::fclose(file);
    }
  }
};

using UniqueFile = std::unique_ptr<std::FILE, FileCloser>;

[[nodiscard]] UniqueFile OpenLog(const char* path) noexcept {
  return UniqueFile{std::fopen(path, "w")};
}

int main() {
  auto log = OpenLog("/tmp/day059.log");
  if (!log) {
    std::cerr << "open failed\n";
    return 1;
  }

  if (std::fputs("modem=ready\n", log.get()) < 0) {
    std::cerr << "write failed\n";
    return 2;
  }

  std::cout << "log resource owned by UniqueFile; fclose is automatic\n";
  return 0;
}
