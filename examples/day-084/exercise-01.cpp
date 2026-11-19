#include <cstddef>
#include <iostream>
class FixedRing {
public:
 class Cursor { public: explicit Cursor(std::size_t p): position_(p) {} std::size_t Position() const noexcept { return position_; } private: std::size_t position_; };
 explicit FixedRing(std::size_t n): capacity_(n) {}
 Cursor Begin() const noexcept { return Cursor{0U}; }
 bool IsValid(const Cursor& c) const noexcept { return c.Position()<capacity_; }
private: std::size_t capacity_;
};
int main(){ const FixedRing ring{8U}; const auto cursor=ring.Begin(); std::cout<<"position="<<cursor.Position()<<" valid="<<ring.IsValid(cursor)<<'\n'; }