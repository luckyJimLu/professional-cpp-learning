#include <iostream>
constexpr unsigned Popcount8(unsigned v) noexcept { unsigned n=0U; for(unsigned i=0;i<8U;++i) n+=(v>>i)&1U; return n; }
consteval unsigned ProtocolTag(unsigned major,unsigned minor) { if(major>15U || minor>15U) throw "field out of range"; return (major<<4U)|minor; }
int main(){ constexpr unsigned tag=ProtocolTag(2U,3U); static_assert(Popcount8(tag)==3U); std::cout<<"tag="<<tag<<" bits="<<Popcount8(tag)<<'\n'; }