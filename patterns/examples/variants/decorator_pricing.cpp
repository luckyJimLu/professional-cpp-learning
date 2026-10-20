// 装饰器变体：税费与折扣
// 来源：S Guideline 35: Use Decorators to Add Customization Hierarchically
// 独立教学改写；行为检查见 main。
#include <algorithm>
#include <cassert>
#include <memory>
#include <stdexcept>
#include <utility>

using namespace std;

struct Item {
  virtual int cents() const = 0;
  virtual ~Item() = default;
};
struct Book : Item {
  int cents() const override {
    return 10000;
  }
};
struct Discount : Item {
  unique_ptr<Item> inner;
  int amount;
  Discount(unique_ptr<Item> p, int n) : inner(move(p)), amount(n) {
    if (n < 0) throw invalid_argument("discount");
  }
  int cents() const override {
    return max(0, inner->cents() - amount);
  }
};
struct Tax : Item {
  unique_ptr<Item> inner;
  int rate;
  Tax(unique_ptr<Item> p, int n) : inner(move(p)), rate(n) {
    if (n < 0) throw invalid_argument("tax");
  }
  int cents() const override {
    return (inner->cents() * (100 + rate) + 50) / 100;
  }
};
int main() {
  Tax after_discount(make_unique<Discount>(make_unique<Book>(), 1000), 10);
  Discount after_tax(make_unique<Tax>(make_unique<Book>(), 10), 1000);
  assert(after_discount.cents() == 9900);
  assert(after_tax.cents() == 10000);
}
