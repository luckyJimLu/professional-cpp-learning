#include <cstddef>
#include <iostream>

class Transport {
 public:
  virtual ~Transport() = default;

  [[nodiscard]] virtual std::size_t MaxPayloadBytes() const noexcept {
    return 64U;
  }
};

class UsbTransport final : public Transport {
 public:
  // Intentional bug: missing const means this does not override the base method.
  [[nodiscard]] std::size_t MaxPayloadBytes() noexcept {
    return 512U;
  }
};

int main() {
  UsbTransport usb;
  Transport& base_view = usb;

  const std::size_t concrete_limit = usb.MaxPayloadBytes();
  const std::size_t base_limit = base_view.MaxPayloadBytes();

  std::cout << "concrete-view-limit=" << concrete_limit << '\n';
  std::cout << "base-view-limit=" << base_limit << '\n';

  if (concrete_limit == base_limit) {
    std::cout << "Override contract satisfied through the base view\n";
  } else {
    std::cout << "Bug reproduced: the base view still calls the base implementation\n";
    std::cout << "Fix: add const and override to UsbTransport::MaxPayloadBytes()\n";
  }
  return 0;
}
