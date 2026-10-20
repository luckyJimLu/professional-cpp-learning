// 组合
// 来源：M 第8章 Grouping Graphic Objects，pp.111–114
// 独立教学改写；行为检查见 main。
#include <cassert>
#include <memory>
#include <string>
#include <utility>
#include <vector>

using namespace std;

struct Graphic {
  virtual string draw() const = 0;
  virtual ~Graphic() = default;
};
struct Circle : Graphic {
  string draw() const override {
    return "circle";
  }
};
struct Group : Graphic {
  vector<unique_ptr<Graphic>> children;
  void add(unique_ptr<Graphic> x) {
    children.push_back(move(x));
  }
  string draw() const override {
    string out = "[";
    for (const auto& x : children) out += x->draw();
    return out + "]";
  }
};
int main() {
  auto inner = make_unique<Group>();
  inner->add(make_unique<Circle>());
  Group root;
  root.add(move(inner));
  root.add(make_unique<Circle>());
  assert(root.draw() == "[[circle]circle]");
}
