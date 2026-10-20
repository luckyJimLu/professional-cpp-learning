// 装饰器
// 来源：M 第9章 Dynamic Decorator，pp.119–124；S Guideline 35: Use Decorators to Add Customization
// Hierarchically；H 第16章 独立教学改写；行为检查见 main。
#include <cassert>
#include <memory>
#include <string>
#include <utility>

using namespace std;

struct Shape {
  virtual string str() const = 0;
  virtual ~Shape() = default;
};
struct Circle : Shape {
  string str() const override {
    return "circle";
  }
};
struct Colored : Shape {
  unique_ptr<Shape> inner;
  string color;
  Colored(unique_ptr<Shape> s, string c) : inner(move(s)), color(move(c)) {}
  string str() const override {
    return inner->str() + ":" + color;
  }
};
int main() {
  Colored c(make_unique<Circle>(), "red");
  assert(c.str() == "circle:red");
}
