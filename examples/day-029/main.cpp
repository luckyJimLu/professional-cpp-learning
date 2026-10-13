#include <cassert>
#include <chrono>
#include <iostream>
#include <optional>
class Config {
 public:
  static std::optional<Config> Create(std::chrono::milliseconds timeout) {
    if (timeout.count() <= 0) { return std::nullopt; }
    return Config{timeout};
  }
  std::chrono::milliseconds Timeout() const { return timeout_; }
 private:
  explicit Config(std::chrono::milliseconds timeout) : timeout_{timeout} {}
  std::chrono::milliseconds timeout_;
};
int main() {
  assert(!Config::Create(std::chrono::milliseconds{0}));
  assert(!Config::Create(std::chrono::milliseconds{-1}));
  const auto config = Config::Create(std::chrono::milliseconds{100});
  assert(config.has_value());
  assert(config->Timeout().count() == 100);
  std::cout << "construction establishes valid timeout\n";
}
