// 抽象工厂
// 来源：M 第3章 Abstract Factory，pp.56–59
// 独立教学改写；行为检查见 main。
#include <cassert>
#include <memory>
#include <string>

using namespace std;

struct Drink {
  virtual string name() const = 0;
  virtual ~Drink() = default;
};
struct Cup {
  virtual string name() const = 0;
  virtual ~Cup() = default;
};
struct Tea : Drink {
  string name() const override {
    return "tea";
  }
};
struct TeaCup : Cup {
  string name() const override {
    return "tea cup";
  }
};
struct Factory {
  virtual unique_ptr<Drink> drink() const = 0;
  virtual unique_ptr<Cup> cup() const = 0;
  virtual ~Factory() = default;
};
struct TeaFactory : Factory {
  unique_ptr<Drink> drink() const override {
    return make_unique<Tea>();
  }
  unique_ptr<Cup> cup() const override {
    return make_unique<TeaCup>();
  }
};
int main() {
  TeaFactory f;
  const Factory& api = f;
  assert(api.drink()->name() == "tea");
  assert(api.cup()->name() == "tea cup");
}
