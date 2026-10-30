#include <functional>
#include <iostream>
#include <memory>
#include <string_view>

class EventSource {
public:
  void Subscribe(std::function<void()> callback) {
    callback_ = std::move(callback);
  }

  void Fire() const {
    if (callback_) {
      callback_();
    }
  }

private:
  std::function<void()> callback_;
};

class ModemController : public std::enable_shared_from_this<ModemController> {
public:
  explicit ModemController(EventSource& source) noexcept : source_{source} {}

  void Start() {
    // Code-review target: this strong capture keeps the controller alive
    // as long as EventSource stores the callback. It is memory-safe, but
    // it hides the intended teardown contract.
    source_.Subscribe([self = shared_from_this()] { self->OnEvent(); });
  }

  ~ModemController() {
    std::cout << "controller destroyed\n";
  }

private:
  void OnEvent() const {
    std::cout << "modem event handled\n";
  }

  EventSource& source_;
};

int main() {
  EventSource source;

  {
    auto controller = std::make_shared<ModemController>(source);
    controller->Start();
    source.Fire();
    std::cout << "external owner leaving scope\n";
  }

  std::cout << "firing after external owner is gone\n";
  source.Fire();
  std::cout << "program ending\n";

  return 0;
}
