# C++ 补充模式与惯用法：书籍案例

[返回分类索引](book-examples.md) · [工程化学习指南](README.md)

本页来源缩写和改写规则见[书籍来源](book-examples.md#书籍来源)。完整 `.cpp` 可单独编译；每项分别说明使用场景、使用原因、好处和边界。

## 静态工厂

**来源：** M 第3章 Factory Method / Factory，pp.49–56

**书中案例与改写：** Point::NewCartesian / NewPolar 用有意义的名称替代参数意义不同但签名相同的构造函数。

**使用场景：** 同一类型支持多种创建语义，参数类型却完全相同。

**使用原因：** 构造函数不能仅凭参数名重载，额外布尔或枚举参数也不够直观。

**好处：** 命名表达创建意图，集中校验输入与坐标转换。

**取舍与边界：** 这是命名静态创建函数，不是通过继承覆写创建行为的 GoF 工厂方法。

**源码：** [static_factory.cpp](https://github.com/luckyJimLu/professional-cpp-learning/blob/main/patterns/examples/cpp_extensions/static_factory.cpp)。下面给出完整文件；运行成功退出码为0。

```cpp
// 静态工厂（补充）
// 来源：M 第3章 Factory Method / Factory，pp.49–56
// 独立教学改写；行为检查见 main。
#include <cassert>
#include <cmath>
#include <stdexcept>

using namespace std;

class Point {
  Point(double a, double b) : x(a), y(b) {}

public:
  double x, y;
  static Point cartesian(double x, double y) {
    return Point(x, y);
  }
  static Point polar(double radius, double angle) {
    if (radius < 0) throw invalid_argument("radius");
    return Point(radius * cos(angle), radius * sin(angle));
  }
};
int main() {
  auto p = Point::polar(2, 0);
  assert(abs(p.x - 2) < 1e-9 && abs(p.y) < 1e-9);
  auto q = Point::cartesian(1, 3);
  assert(q.y == 3);
}
```

## 空对象

**来源：** M 第19章 Null Object，pp.237–242

**书中案例与改写：** NullLogger 实现日志接口但不执行任何操作。

**使用场景：** 日志、埋点等可选协作对象允许默认不执行。

**使用原因：** 每次调用前检查空指针会重复条件判断，默认语义应封装成对象。

**好处：** 调用路径保持统一，减少空值分支，方便禁用可选行为。

**取舍与边界：** 只适用于无操作本身有正确语义的场景；智能指针为空不等于空对象。

**源码：** [null_object.cpp](https://github.com/luckyJimLu/professional-cpp-learning/blob/main/patterns/examples/cpp_extensions/null_object.cpp)。下面给出完整文件；运行成功退出码为0。

```cpp
// 空对象（补充）
// 来源：M 第19章 Null Object，pp.237–242
// 独立教学改写；行为检查见 main。
#include <cassert>
#include <string>
#include <vector>

using namespace std;

struct Logger {
  virtual void info(const string&) = 0;
  virtual ~Logger() = default;
};
struct NullLogger : Logger {
  void info(const string&) override {}
};
struct MemoryLogger : Logger {
  vector<string> lines;
  void info(const string& s) override {
    lines.push_back(s);
  }
};
struct Account {
  Logger& logger;
  int balance = 0;
  void deposit(int n) {
    balance += n;
    logger.info("deposit");
  }
};
int main() {
  NullLogger null;
  Account a{null};
  a.deposit(10);
  assert(a.balance == 10);
  MemoryLogger log;
  Account b{log};
  b.deposit(20);
  assert(log.lines.size() == 1);
}
```

## RAII

**来源：** H 第5章 A Comprehensive Look at RAII，RAII for other resources；S 第1章 RAII 讨论

**书中案例与改写：** 书中 mutex_guard 的锁资源绑定对象生命周期；本例用标准 lock_guard 表达同一规则。

**使用场景：** 文件、锁、连接等资源需要在正常返回或异常时释放。

**使用原因：** 手动配对获取和释放容易遗漏异常路径。

**好处：** 析构自动释放资源，缩小资源持有范围，减少泄漏和锁未释放。

**取舍与边界：** 析构函数不应抛异常；资源包装类型应明确复制和移动语义。

**源码：** [raii.cpp](https://github.com/luckyJimLu/professional-cpp-learning/blob/main/patterns/examples/cpp_extensions/raii.cpp)。下面给出完整文件；运行成功退出码为0。

```cpp
// RAII（资源管理惯用法）
// 来源：H 第5章 A Comprehensive Look at RAII，RAII for other resources；S 第1章 RAII 讨论
// 独立教学改写；行为检查见 main。
#include <cassert>
#include <mutex>
#include <stdexcept>
#include <thread>

using namespace std;

int main() {
  mutex m;
  bool threw = false;
  try {
    lock_guard<mutex> guard(m);
    throw runtime_error("operation failed");
  } catch (const runtime_error&) {
    threw = true;
  }
  assert(threw);
  // A different thread checks release; it does not try to relock an owned mutex.
  bool acquired = false;
  thread probe([&] {
    if (m.try_lock()) {
      acquired = true;
      m.unlock();
    }
  });
  probe.join();
  assert(acquired);
}
```

## ScopeGuard

**来源：** H 第11章 ScopeGuard basics / Generic ScopeGuard，约 pp.295–305

**书中案例与改写：** 插入后注册 undo，成功后 commit 取消回滚；以下改写为无复制的 C++17 守卫。

**使用场景：** 多步操作只有最后成功时才保留早期修改。

**使用原因：** 异常和提前返回路径都必须执行一致的补偿。

**好处：** 把补偿和操作写在一起，默认回滚，显式提交。

**取舍与边界：** 回调必须不抛异常；本例只示范内存修改补偿，不保证外部系统事务原子性。

**源码：** [scope_guard.cpp](https://github.com/luckyJimLu/professional-cpp-learning/blob/main/patterns/examples/cpp_extensions/scope_guard.cpp)。下面给出完整文件；运行成功退出码为0。

```cpp
// ScopeGuard（作用域回滚）
// 来源：H 第11章 ScopeGuard basics / Generic ScopeGuard，约 pp.295–305
// 独立教学改写；行为检查见 main。
#include <cassert>
#include <functional>
#include <stdexcept>
#include <utility>
#include <vector>

using namespace std;

class ScopeGuard {
  function<void()> rollback;
  bool active = true;

public:
  explicit ScopeGuard(function<void()> f) : rollback(move(f)) {}
  ScopeGuard(const ScopeGuard&) = delete;
  ScopeGuard& operator=(const ScopeGuard&) = delete;
  ~ScopeGuard() noexcept {
    if (active) rollback();
  }
  void commit() noexcept {
    active = false;
  }
};
int main() {
  vector<int> values;
  try {
    values.push_back(1);
    ScopeGuard g([&]() noexcept { values.pop_back(); });
    throw runtime_error("fail");
  } catch (const runtime_error&) {
  }
  assert(values.empty());
  {
    values.push_back(2);
    ScopeGuard g([&]() noexcept { values.pop_back(); });
    g.commit();
  }
  assert(values.size() == 1 && values[0] == 2);
}
```

## CRTP

**来源：** H 第8章 The Curiously Recurring Template Pattern；M 第1章 Important Concepts，pp.5–6

**书中案例与改写：** 基类以派生类为模板参数，把接口调用静态转发给派生实现；示例为教学改写。

**使用场景：** 实现类型在编译期已知，需要静态定制或复用派生类能力。

**使用原因：** 虚接口不是唯一复用方式，模板可将调用绑定提前到编译期。

**好处：** 保留编译期类型信息，编译器可内联，不要求虚表。

**取舍与边界：** 不同实例类型不构成统一运行时容器；错误的派生配对会有风险，本例限制基类构造。

**源码：** [crtp.cpp](https://github.com/luckyJimLu/professional-cpp-learning/blob/main/patterns/examples/cpp_extensions/crtp.cpp)。下面给出完整文件；运行成功退出码为0。

```cpp
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
```

## 策略类设计

**来源：** H 第15章 Strategy pattern and policy-based design / Foundations；M 第22章 Static Strategy，pp.278–279

**书中案例与改写：** 以模板参数选择格式策略，保留书中的编译期策略思想。

**使用场景：** 算法或存储策略在编译期固定，强调组合定制。

**使用原因：** 不需要运行时替换却使用虚接口，会增加不必要的动态机制。

**好处：** 组合可复用策略，调用可内联，策略要求在编译时检查。

**取舍与边界：** 策略组合过多会增加编译时间和代码体积；每种组合是不同的类型。

**源码：** [policy.cpp](https://github.com/luckyJimLu/professional-cpp-learning/blob/main/patterns/examples/cpp_extensions/policy.cpp)。下面给出完整文件；运行成功退出码为0。

```cpp
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
```

## 类型擦除

**来源：** H 第6章 Understanding Type Erasure；S Guidelines 31–34（External Polymorphism / Type Erasure）

**书中案例与改写：** 通过 Concept/Model 封装不需要继承统一基类的具体对象；形状示例为教学改写。

**使用场景：** 第三方对象类型不同，但具备相同操作，需要统一运行时接口。

**使用原因：** 要求所有类型侵入式继承基类会耦合业务类型与框架。

**好处：** 以非侵入方式统一异构对象，把模板细节隔离在边界。

**取舍与边界：** 本例包装器仅可移动，使用堆分配与虚调用；不具备书中优化版本的值语义或小缓冲。

**源码：** [type_erasure.cpp](https://github.com/luckyJimLu/professional-cpp-learning/blob/main/patterns/examples/cpp_extensions/type_erasure.cpp)。下面给出完整文件；运行成功退出码为0。

```cpp
// 类型擦除
// 来源：H 第6章 Understanding Type Erasure；S Guidelines 31–34（External Polymorphism / Type
// Erasure） 独立教学改写；行为检查见 main。
#include <cassert>
#include <memory>
#include <string>
#include <utility>
#include <vector>

using namespace std;

class Drawable {
  struct Concept {
    virtual string draw() const = 0;
    virtual ~Concept() = default;
  };
  template <class T>
  struct Model : Concept {
    T value;
    explicit Model(T x) : value(move(x)) {}
    string draw() const override {
      return value.draw();
    }
  };
  unique_ptr<Concept> self;

public:
  template <class T>
  explicit Drawable(T x) : self(make_unique<Model<T>>(move(x))) {}
  string draw() const {
    return self->draw();
  }
};
struct Circle {
  string draw() const {
    return "circle";
  }
};
struct Square {
  string draw() const {
    return "square";
  }
};
int main() {
  vector<Drawable> shapes;
  shapes.emplace_back(Circle{});
  shapes.emplace_back(Square{});
  assert(shapes[0].draw() == "circle");
  assert(shapes[1].draw() == "square");
}
```

## Pimpl

**来源：** M 第7章 The Pimpl Idiom，pp.99–102；S Guideline 28（Bridge / Pimpl）

**书中案例与改写：** Person 的实现成员放入 Person::Impl；以下以 unique_ptr 管理生命周期。

**使用场景：** 公共头文件应隔离私有实现依赖，库接口需要减少重编译传播。

**使用原因：** 私有成员的类型也会暴露编译依赖；仅设置 private 并不能隔离头文件。

**好处：** 隐藏实现布局，减少调用方重编译，可辅助维持 ABI 稳定。

**取舍与边界：** 多一次分配和间接访问；本文件合并展示，实际拆分 .hpp/.cpp，析构定义必须在 Impl 完整后。

**源码：** [pimpl.cpp](https://github.com/luckyJimLu/professional-cpp-learning/blob/main/patterns/examples/cpp_extensions/pimpl.cpp)。下面给出完整文件；运行成功退出码为0。

```cpp
// Pimpl（实现隐藏惯用法）
// 来源：M 第7章 The Pimpl Idiom，pp.99–102；S Guideline 28（Bridge / Pimpl）
// 独立教学改写；行为检查见 main。
#include <cassert>
#include <memory>
#include <string>
#include <utility>

using namespace std;

// Public header portion:
class Person {
  struct Impl;
  unique_ptr<Impl> impl;

public:
  explicit Person(string name);
  ~Person();
  Person(const Person&) = delete;
  Person& operator=(const Person&) = delete;
  string greet() const;
};
// Implementation .cpp portion:
struct Person::Impl {
  string name;
};
Person::Person(string n) : impl(make_unique<Impl>(Impl{move(n)})) {}
Person::~Person() = default;
string Person::greet() const {
  return "hello " + impl->name;
}
int main() {
  Person p("Ann");
  assert(p.greet() == "hello Ann");
}
```

## Monitor

**来源：** H 第18章 Patterns for Concurrency / Monitor pattern，约 pp.571–573

**书中案例与改写：** 书中后台线程定时读取原子进度并退出；本例缩短周期且不输出不确定时间序列。

**使用场景：** 后台任务需要低频汇报进度或检测状态。

**使用原因：** 监控与计算分离，避免监控线程读取普通共享变量产生数据竞争。

**好处：** 监控逻辑集中，计算线程只维护计数，可明确通知结束并 join。

**取舍与边界：** 这里遵循本书的进度监控用法，不是封装共享状态与条件变量的经典管程；不承诺硬实时。

**源码：** [monitor.cpp](https://github.com/luckyJimLu/professional-cpp-learning/blob/main/patterns/examples/cpp_extensions/monitor.cpp)。下面给出完整文件；运行成功退出码为0。

```cpp
// Monitor（后台进度监控变体）
// 来源：H 第18章 Patterns for Concurrency / Monitor pattern，约 pp.571–573
// 独立教学改写；行为检查见 main。
#include <atomic>
#include <cassert>
#include <chrono>
#include <thread>

using namespace std;

int main() {
  atomic<int> progress{0};
  atomic<bool> done{false};
  int observed = 0;
  thread monitor([&] {
    while (!done.load(memory_order_acquire)) {
      observed = progress.load(memory_order_relaxed);
      this_thread::sleep_for(chrono::milliseconds(1));
    }
    observed = progress.load(memory_order_relaxed);
  });
  for (int i = 1; i <= 100; ++i) progress.store(i, memory_order_relaxed);
  done.store(true, memory_order_release);
  monitor.join();
  assert(observed == 100);
}
```
