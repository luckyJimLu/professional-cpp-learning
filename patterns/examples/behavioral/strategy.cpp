// 策略
// 来源：M 第22章 Dynamic Strategy，pp.273–278；S Guideline 19: Use Strategy to Isolate How Things
// Are Done 独立教学改写；行为检查见 main。
#include <cassert>
#include <functional>
#include <string>
#include <vector>

using namespace std;

struct Format {
  virtual string item(const string& x) const = 0;
  virtual ~Format() = default;
};
struct Markdown : Format {
  string item(const string& x) const override {
    return "* " + x + "\n";
  }
};
struct Html : Format {
  string item(const string& x) const override {
    return "<li>" + x + "</li>";
  }
};
struct TextProcessor {
  reference_wrapper<const Format> format;
  string render(const vector<string>& items) const {
    string out;
    for (const auto& x : items) out += format.get().item(x);
    return out;
  }
};
int main() {
  Markdown m;
  Html h;
  TextProcessor p{m};
  assert(p.render({"a"}) == "* a\n");
  p.format = h;
  assert(p.render({"a"}) == "<li>a</li>");
}
