// 策略类设计（Policy-Based Design）
// 来源：H 第15章 Strategy pattern and policy-based design / Foundations；M 第22章 Static
// Strategy，pp.278–279 独立教学改写；行为检查见 main。
#include <cassert>
#include <string>

using namespace std;

struct Markdown {
  string item(const string& s) const {
    return "* " + s;
  }
};
struct Html {
  string item(const string& s) const {
    return "<li>" + s + "</li>";
  }
};
template <class Policy>
struct Text {
  Policy policy;
  string render(const string& x) const {
    return policy.item(x);
  }
};
int main() {
  Text<Markdown> a;
  Text<Html> b;
  assert(a.render("x") == "* x");
  assert(b.render("x") == "<li>x</li>");
}
