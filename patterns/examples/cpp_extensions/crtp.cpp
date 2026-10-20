// CRTP（静态多态）
// 来源：H 第8章 The Curiously Recurring Template Pattern；M 第1章 Important Concepts，pp.5–6
// 独立教学改写；行为检查见 main。
#include <cassert>
#include <string>

using namespace std;

template <class Derived>
class Printable {
  friend Derived;
  Printable() = default;

public:
  string print() const {
    return static_cast<const Derived&>(*this).print_impl();
  }

protected:
  ~Printable() = default;
};
struct Report : Printable<Report> {
  string print_impl() const {
    return "report";
  }
};
int main() {
  Report r;
  assert(r.print() == "report");
}
