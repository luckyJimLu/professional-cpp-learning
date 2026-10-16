#include <cassert>
#include <iostream>
#include <string_view>

namespace modem {
inline constexpr std::string_view kQuerySignal{"AT+CSQ\r\n"};
inline constexpr std::string_view kExpectedTranscript{
    "AT+CSQ\r\n"
    "+CSQ: 18,99\r\n"
    "OK\r\n"};

bool IsAtCommand(std::string_view text) {
  return text.starts_with("AT");
}

void PrintBytes(std::string_view text) {
  for (const unsigned char ch : text) {
    std::cout << static_cast<unsigned int>(ch) << ' ';
  }
  std::cout << '\n';
}
}  // namespace modem

int main() {
  std::cout << modem::kQuerySignal;
  std::cout << modem::kExpectedTranscript;
  assert(modem::IsAtCommand(modem::kQuerySignal));
  std::cout << std::boolalpha << modem::IsAtCommand(modem::kQuerySignal) << '\n';
  modem::PrintBytes(modem::kQuerySignal);
  return 0;
}
