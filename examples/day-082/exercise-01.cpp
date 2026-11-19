#include <cstddef>
#include <iostream>
constexpr bool IsPowerOfTwo(std::size_t n) noexcept { return n!=0U && (n&(n-1U))==0U; }
consteval std::size_t RingMask(std::size_t n) { if(!IsPowerOfTwo(n)) throw "capacity must be power of two"; return n-1U; }
constexpr std::size_t kCapacity=128U;
static_assert(kCapacity>=64U && IsPowerOfTwo(kCapacity));
constexpr std::size_t kMask=RingMask(kCapacity);
int main(){ const std::size_t received=37U; std::cout<<"mask="<<kMask<<" runtime_ok="<<(received<=kCapacity)<<'\n'; }