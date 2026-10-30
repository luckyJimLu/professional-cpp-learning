#include <chrono>
#include <cstddef>
#include <iostream>
#include <span>

class ModemService {
public:
  bool Send(std::span<const std::byte> payload) {
    std::cout << "send bytes=" << payload.size() << '\n';
    return !payload.empty();
  }

  int ReadSignal() {
    std::cout << "read signal\n";
    return 72;
  }

  void ResetHardware() {
    std::cout << "reset hardware\n";
  }

  void DumpDiagnostics() {
    std::cout << "diagnostics: ok\n";
  }
};

int main() {
  ModemService service;
  const std::byte payload[]{std::byte{0x41}};
  const bool sent = service.Send(payload);
  std::cout << "sent=" << sent << " signal=" << service.ReadSignal() << '\n';
  service.DumpDiagnostics();
  return sent ? 0 : 1;
}
