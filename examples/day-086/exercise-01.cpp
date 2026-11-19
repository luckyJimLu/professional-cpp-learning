#include <iostream>
class Milliseconds {
public:
 explicit constexpr Milliseconds(unsigned n) noexcept: value_(n) {}
 constexpr unsigned Value() const noexcept { return value_; }
 constexpr Milliseconds& operator+=(Milliseconds rhs) noexcept { value_+=rhs.value_; return *this; }
 friend constexpr Milliseconds operator+(Milliseconds lhs,Milliseconds rhs) noexcept { lhs+=rhs; return lhs; }
 friend constexpr bool operator==(Milliseconds,Milliseconds) noexcept = default;
 friend constexpr bool operator<(Milliseconds a,Milliseconds b) noexcept { return a.value_<b.value_; }
 friend constexpr bool operator>(Milliseconds a,Milliseconds b) noexcept { return b<a; }
private: unsigned value_;
};
int main(){ const auto timeout=Milliseconds{100U}+Milliseconds{50U}; std::cout<<"timeout_ms="<<timeout.Value()<<" exceeds="<<(timeout>Milliseconds{120U})<<'\n'; }