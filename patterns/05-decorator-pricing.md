# 装饰器模式：税费与折扣（Decorator Pattern: Tax and Discount）

[返回分类索引](book-examples.md) · [工程化学习指南](README.md)

本页来源缩写和改写规则见[书籍来源](book-examples.md#书籍来源)。完整 `.cpp` 可单独编译；每项分别说明使用场景、使用原因、好处和边界。

## 装饰器变体：税费与折扣（Decorator: Tax and Discount）

**来源：** S Guideline 35: Use Decorators to Add Customization Hierarchically

**书中案例与改写：** CppBook / ConferenceTicket 的价格修饰器；以下用整数分和固定折扣金额简化 Money，保留层层包装结构。

**使用场景：** 商品价格需要按规则叠加折扣、税费与其他修饰。

**使用原因：** 把所有修饰做成商品子类会造成组合膨胀，改变一项规则会波及商品。

**好处：** 商品与价格修饰独立扩展；顺序可组合且可测。

**取舍与边界：** 定价顺序会影响结果；本例折扣是固定金额，税率用整数百分比，金额计算仅覆盖小值且不处理溢出。

**源码：** [decorator_pricing.cpp](https://github.com/luckyJimLu/professional-cpp-learning/blob/main/patterns/examples/variants/decorator_pricing.cpp)。下面给出完整文件；运行成功退出码为0。

```cpp
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
```
