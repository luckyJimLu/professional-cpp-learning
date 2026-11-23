#include <iostream>
#include <type_traits>

class BaseTransport {
 public:
  ~BaseTransport() = default;  // Intentional design defect: public, non-virtual.

  void Touch() const noexcept {
    std::cout << "base operation\n";
  }
};

class UartTransport final : public BaseTransport {
 public:
  ~UartTransport() {
    ++derived_destructor_calls_;
    std::cout << "UartTransport destructor\n";
  }

  static int DerivedDestructorCalls() noexcept {
    return derived_destructor_calls_;
  }

 private:
  inline static int derived_destructor_calls_{0};
};

int main() {
  {
    UartTransport uart;
    BaseTransport& base_view = uart;
    base_view.Touch();
    std::cout << std::boolalpha
              << "base_has_virtual_destructor="
              << std::has_virtual_destructor_v<BaseTransport> << '\n';
  }

  std::cout << "derived_destructor_calls="
            << UartTransport::DerivedDestructorCalls() << '\n';
  if constexpr (std::has_virtual_destructor_v<BaseTransport>) {
    std::cout << "Base destructor contract is polymorphic-safe\n";
  } else {
    std::cout << "Review finding: deleting Derived through Base* is not safe\n";
    std::cout << "Fix: make the base destructor virtual and mark the derived destructor override\n";
  }
  return 0;
}
