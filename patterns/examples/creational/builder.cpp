// 建造者
// 来源：M 第2章 Simple Builder / Fluent Builder，pp.33–47；H 第9章 Builder
// 独立教学改写；行为检查见 main。
#include <cassert>
#include <string>
#include <utility>
#include <vector>

using namespace std;

struct HtmlBuilder {
  vector<string> items;
  HtmlBuilder& add(string text) {
    items.push_back(move(text));
    return *this;
  }
  string build() const {
    string out = "<ul>";
    for (const auto& x : items) out += "<li>" + x + "</li>";
    return out + "</ul>";
  }
};
int main() {
  HtmlBuilder b;
  b.add("hello").add("world");
  assert(b.build() == "<ul><li>hello</li><li>world</li></ul>");
}
