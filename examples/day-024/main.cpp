#include <cassert>
#include <iostream>
#include <string_view>
struct CountingSender {
  int calls{0};
  bool Send(std::string_view command) {
    assert(command == "AT");
    ++calls;
    return true;
  }
};
template <class Sender>
class Modem {
public:
  explicit Modem(Sender& sender) : sender_{sender} {}
  bool Ping() {
    return sender_.Send("AT");
  }

private:
  Sender& sender_;
};
int main() {
  CountingSender sender;
  Modem<CountingSender> modem{sender};
  assert(modem.Ping());
  assert(sender.calls == 1);
  std::cout << "business uses only sending capability\n";
}
