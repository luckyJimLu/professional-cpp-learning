#include <cstdint>
#include <iostream>
#include <optional>
class Modem {
public:
 enum class State: std::uint8_t { Offline=0U, Registering=1U, Online=2U };
 static std::optional<State> DecodeState(std::uint8_t raw) noexcept { switch(raw){ case 0U:return State::Offline; case 1U:return State::Registering; case 2U:return State::Online; default:return std::nullopt; } }
 static const char* ToString(State s) noexcept { switch(s){ case State::Offline:return "offline"; case State::Registering:return "registering"; case State::Online:return "online"; } return "invalid"; }
};
int main(){ auto s=Modem::DecodeState(2U); auto bad=Modem::DecodeState(9U); std::cout<<"state="<<(s?Modem::ToString(*s):"invalid")<<" rejected="<<!bad<<'\n'; }