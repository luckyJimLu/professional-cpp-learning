// 工厂方法
// 来源：M 第3章 Factories，pp.49–60；H 第13章 Virtual Constructors and Factories
// 独立教学改写；行为检查见 main。
#include <cassert>
#include <memory>
#include <string>

using namespace std;

struct Drink {
  virtual string name() const = 0;
  virtual ~Drink() = default;
};
struct Tea : Drink {
  string name() const override {
    return "tea";
  }
};
struct Creator {
  virtual unique_ptr<Drink> create() const = 0;
  string serve() const {
    return "serve " + create()->name();
  }
  virtual ~Creator() = default;
};
struct TeaCreator : Creator {
  unique_ptr<Drink> create() const override {
    return make_unique<Tea>();
  }
};
int main() {
  TeaCreator c;
  assert(c.serve() == "serve tea");
}
