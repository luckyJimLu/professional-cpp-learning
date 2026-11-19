#include <compare>
#include <cstddef>
#include <iostream>
class ByteCount {
public:
 explicit constexpr ByteCount(std::size_t n) noexcept: value_(n) {}
 constexpr std::size_t Value() const noexcept { return value_; }
 constexpr ByteCount& operator+=(ByteCount rhs) noexcept { value_+=rhs.value_; return *this; }
 friend constexpr ByteCount operator+(ByteCount lhs,ByteCount rhs) noexcept { lhs+=rhs; return lhs; }
 friend constexpr auto operator<=>(ByteCount,ByteCount) noexcept = default;
private: std::size_t value_;
};
int main(){ constexpr ByteCount total=ByteCount{8U}+ByteCount{24U}; static_assert(total.Value()==32U); std::cout<<"total="<<total.Value()<<" fits="<<(total<=ByteCount{64U})<<'\n'; }