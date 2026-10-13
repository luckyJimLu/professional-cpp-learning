#include <cassert>
#include <iostream>
#include <string_view>
struct Transport {
  virtual ~Transport() = default;
  virtual bool Write(std::string_view command) = 0;
};
struct FakeTransport final : Transport {
  bool succeed{true};
  int writes{0};
  bool Write(std::string_view command) override {
    assert(command == "AT\r\n");
    ++writes;
    return succeed;
  }
};
class Modem {
 public:
  explicit Modem(Transport& transport) : transport_{transport} {}
  bool Ping() { return transport_.Write("AT\r\n"); }
 private:
  Transport& transport_;
};
int main() {
  FakeTransport transport;
  Modem modem{transport};
  assert(modem.Ping());
  transport.succeed = false;
  assert(!modem.Ping());
  assert(transport.writes == 2);
  std::cout << "modem contract passed\n";
}
