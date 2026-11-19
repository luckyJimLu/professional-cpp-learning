#include <cstdint>
#include <iostream>
#include <optional>
class DmaChannel {
public:
 enum class Status: std::uint8_t { Idle=0U, Busy=1U, Complete=2U, Fault=3U };
 static std::optional<Status> Parse(std::uint8_t raw) noexcept { switch(raw){ case 0U:return Status::Idle; case 1U:return Status::Busy; case 2U:return Status::Complete; case 3U:return Status::Fault; default:return std::nullopt; } }
};
int main(){ auto s=DmaChannel::Parse(3U); auto bad=DmaChannel::Parse(7U); std::cout<<"fault="<<(s && *s==DmaChannel::Status::Fault)<<" invalid_rejected="<<!bad<<'\n'; }