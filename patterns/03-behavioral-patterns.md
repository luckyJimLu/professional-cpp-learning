# 行为型设计模式：书籍案例与 C++17 示例

[返回分类索引](book-examples.md) · [工程化学习指南](README.md)

本页来源缩写和改写规则见[书籍来源](book-examples.md#书籍来源)。完整 `.cpp` 可单独编译；每项分别说明使用场景、使用原因、好处和边界。

## 责任链

**来源：** M 第13章 Pointer Chain，pp.161–166

**书中案例与改写：** CreatureModifier 链逐步修改角色属性，某个处理器可以停止转发。

**使用场景：** 请求校验、审批、过滤器或游戏属性修改需要按顺序处理。

**使用原因：** 发起者不应绑定具体处理者列表；处理步骤需要可组合。

**好处：** 自由调整处理顺序，局部处理器可决定继续或终止。

**取舍与边界：** 必须明确中止语义和顺序；本例函数链是对书中指针链的简化。

**源码：** [chain_of_responsibility.cpp](https://github.com/luckyJimLu/professional-cpp-learning/blob/main/patterns/examples/behavioral/chain_of_responsibility.cpp)。下面给出完整文件；运行成功退出码为0。

```cpp
// 责任链
// 来源：M 第13章 Pointer Chain，pp.161–166
// 独立教学改写；行为检查见 main。
#include <cassert>
#include <functional>
#include <vector>

using namespace std;

struct Creature {
  int attack = 2;
};
using Handler = function<bool(Creature&)>;
void handle(Creature& c, const vector<Handler>& chain) {
  for (const auto& h : chain)
    if (!h(c)) break;
}
int main() {
  Creature a;
  handle(a, {[](Creature& c) {
               c.attack *= 2;
               return true;
             },
             [](Creature& c) {
               c.attack += 1;
               return true;
             }});
  assert(a.attack == 5);
  Creature b;
  handle(b, {[](Creature&) { return false; },
             [](Creature& c) {
               c.attack *= 2;
               return true;
             }});
  assert(b.attack == 2);
}
```

## 命令

**来源：** M 第14章 BankAccountCommand / Undo Operations，pp.173–183

**书中案例与改写：** 将账户存取操作封装为对象，记录执行结果以决定是否撤销。

**使用场景：** 撤销、排队、菜单动作、宏命令需要把操作作为数据管理。

**使用原因：** 直接调用方法无法统一保存操作参数、执行状态和逆操作。

**好处：** 解耦发起者与执行者，支持延迟执行和有条件撤销。

**取舍与边界：** 撤销不总是简单取反；失败操作不可反向补偿，本例不模拟真实金融事务。

**源码：** [command.cpp](https://github.com/luckyJimLu/professional-cpp-learning/blob/main/patterns/examples/behavioral/command.cpp)。下面给出完整文件；运行成功退出码为0。

```cpp
// 命令
// 来源：M 第14章 BankAccountCommand / Undo Operations，pp.173–183
// 独立教学改写；行为检查见 main。
#include <cassert>
#include <stdexcept>

using namespace std;

struct Account {
  int balance = 0;
};
class Withdraw {
  Account& account;
  int amount;
  bool applied = false;

public:
  Withdraw(Account& a, int n) : account(a), amount(n) {
    if (n <= 0) throw invalid_argument("amount");
  }
  bool execute() {
    if (applied || account.balance < amount) return false;
    account.balance -= amount;
    applied = true;
    return true;
  }
  void undo() {
    if (applied) {
      account.balance += amount;
      applied = false;
    }
  }
};
int main() {
  Account a{100};
  Withdraw good(a, 30);
  assert(good.execute());
  assert(a.balance == 70);
  good.undo();
  good.undo();
  assert(a.balance == 100);
  Withdraw bad(a, 200);
  assert(!bad.execute());
  bad.undo();
  assert(a.balance == 100);
}
```

## 解释器

**来源：** M 第15章 Numeric Expression Evaluator / Abstract Syntax Tree，pp.189–202

**书中案例与改写：** 将整数与加减组合为表达式树并递归求值；本例只实现 AST 求值层。

**使用场景：** 简单表达式、规则语言或配置 DSL 的文法较小且稳定。

**使用原因：** 把每个语法规则映射为节点，避免把所有语义挤入一个分支函数。

**好处：** 语法结构与求值结构对应，节点可递归组合。

**取舍与边界：** 完整语言还需要词法、解析、错误定位；本例不接收原始文本，也不处理整数溢出。

**源码：** [interpreter.cpp](https://github.com/luckyJimLu/professional-cpp-learning/blob/main/patterns/examples/behavioral/interpreter.cpp)。下面给出完整文件；运行成功退出码为0。

```cpp
// 解释器
// 来源：M 第15章 Numeric Expression Evaluator / Abstract Syntax Tree，pp.189–202
// 独立教学改写；行为检查见 main。
#include <cassert>
#include <memory>
#include <stdexcept>
#include <utility>

using namespace std;

struct Expr {
  virtual int eval() const = 0;
  virtual ~Expr() = default;
};
struct Number : Expr {
  int n;
  explicit Number(int x) : n(x) {}
  int eval() const override {
    return n;
  }
};
struct Binary : Expr {
  char op;
  unique_ptr<Expr> left, right;
  Binary(char o, unique_ptr<Expr> l, unique_ptr<Expr> r) : op(o), left(move(l)), right(move(r)) {}
  int eval() const override {
    if (op == '+') return left->eval() + right->eval();
    if (op == '-') return left->eval() - right->eval();
    throw invalid_argument("operator");
  }
};
int main() {
  Binary x('-', make_unique<Number>(10),
           make_unique<Binary>('+', make_unique<Number>(2), make_unique<Number>(3)));
  assert(x.eval() == 5);
}
```

## 迭代器

**来源：** M 第16章 Traversing a Binary Tree，pp.208–215

**书中案例与改写：** 二叉树中序遍历，迭代器隐藏栈和节点细节。

**使用场景：** 集合有不同内部结构，但调用方需要统一顺序遍历。

**使用原因：** 调用方不应知道树指针、递归或存储布局。

**好处：** 容器与遍历算法分离，可接入范围 for；本例提供最小范围迭代接口。

**取舍与边界：** 迭代期间修改树可能使迭代器失效；本例未声称满足全部 STL 迭代器概念。

**源码：** [iterator.cpp](https://github.com/luckyJimLu/professional-cpp-learning/blob/main/patterns/examples/behavioral/iterator.cpp)。下面给出完整文件；运行成功退出码为0。

```cpp
// 迭代器
// 来源：M 第16章 Traversing a Binary Tree，pp.208–215
// 独立教学改写；行为检查见 main。
#include <cassert>
#include <memory>
#include <vector>

using namespace std;

struct Node {
  int value;
  unique_ptr<Node> left, right;
  explicit Node(int n) : value(n) {}
};
struct Inorder {
  const Node* root;
  struct Iterator {
    vector<const Node*> pending;
    void push(const Node* n) {
      while (n) {
        pending.push_back(n);
        n = n->left.get();
      }
    }
    explicit Iterator(const Node* n) {
      push(n);
    }
    int operator*() const {
      return pending.back()->value;
    }
    Iterator& operator++() {
      const auto* n = pending.back();
      pending.pop_back();
      push(n->right.get());
      return *this;
    }
    bool operator!=(const Iterator& x) const {
      return pending != x.pending;
    }
  };
  Iterator begin() const {
    return Iterator(root);
  }
  Iterator end() const {
    return Iterator(nullptr);
  }
};
int main() {
  Node root(2);
  root.left = make_unique<Node>(1);
  root.right = make_unique<Node>(3);
  vector<int> values;
  for (int n : Inorder{&root}) values.push_back(n);
  assert((values == vector<int>{1, 2, 3}));
}
```

## 中介者

**来源：** M 第17章 Chat Room，pp.217–223

**书中案例与改写：** 聊天室负责加入与广播，参与者不持有彼此的引用。

**使用场景：** 多个 UI 控件、模块或会话对象需要相互协调。

**使用原因：** 参与者互相引用会形成密集依赖，改变协作规则很难。

**好处：** 集中维护协作规则，参与者可以独立演进。

**取舍与边界：** 中介者可能变复杂；本例不拥有参与者且无 leave，真实系统需要安全退订。

**源码：** [mediator.cpp](https://github.com/luckyJimLu/professional-cpp-learning/blob/main/patterns/examples/behavioral/mediator.cpp)。下面给出完整文件；运行成功退出码为0。

```cpp
// 中介者
// 来源：M 第17章 Chat Room，pp.217–223
// 独立教学改写；行为检查见 main。
#include <algorithm>
#include <cassert>
#include <string>
#include <vector>

using namespace std;

struct Person {
  string name;
  vector<string> inbox;
};
struct ChatRoom {
  vector<Person*> people;
  void join(Person& p) {
    if (find(people.begin(), people.end(), &p) == people.end()) people.push_back(&p);
  }
  void broadcast(const Person& from, const string& msg) {
    for (auto* p : people)
      if (p != &from) p->inbox.push_back(from.name + ":" + msg);
  }
};
int main() {
  Person a{"Ann", {}}, b{"Bob", {}};
  ChatRoom room;
  room.join(a);
  room.join(b);
  room.broadcast(a, "hello");
  assert(a.inbox.empty());
  assert(b.inbox.at(0) == "Ann:hello");
}
```

## 备忘录

**来源：** M 第18章 Bank Account / Undo and Redo，pp.229–235

**书中案例与改写：** 账户返回私有状态快照，再恢复到指定快照。

**使用场景：** 编辑器或工作流需要恢复历史状态，状态不应暴露给外部修改。

**使用原因：** 外部直接保存和还原内部字段会破坏封装。

**好处：** 把状态保存与恢复交给原对象，快照管理者只负责保管。

**取舍与边界：** 大状态快照耗内存；本例快照仅应用于原对象，不是持久化或跨账户恢复协议。

**源码：** [memento.cpp](https://github.com/luckyJimLu/professional-cpp-learning/blob/main/patterns/examples/behavioral/memento.cpp)。下面给出完整文件；运行成功退出码为0。

```cpp
// 备忘录
// 来源：M 第18章 Bank Account / Undo and Redo，pp.229–235
// 独立教学改写；行为检查见 main。
#include <cassert>
#include <stdexcept>

using namespace std;

class Account {
  int balance;

public:
  class Snapshot {
    int value;
    explicit Snapshot(int n) : value(n) {}
    friend class Account;

  public:
    Snapshot(const Snapshot&) = default;
  };
  explicit Account(int n) : balance(n) {}
  Snapshot save() const {
    return Snapshot(balance);
  }
  void deposit(int n) {
    if (n <= 0) throw invalid_argument("amount");
    balance += n;
  }
  void restore(const Snapshot& s) {
    balance = s.value;
  }
  int value() const {
    return balance;
  }
};
int main() {
  Account a(100);
  auto before = a.save();
  a.deposit(50);
  auto after = a.save();
  a.restore(before);
  assert(a.value() == 100);
  a.restore(after);
  assert(a.value() == 150);
}
```

## 观察者

**来源：** M 第20章 Observable / Unsubscription and Thread Safety / Reentrancy，pp.243–256

**书中案例与改写：** 属性变化通知订阅者；改写增加订阅 ID 与回调期间退订处理。

**使用场景：** 模型变化需要通知多个视图、监控器或缓存。

**使用原因：** 被观察对象不应依赖每个具体接收方。

**好处：** 动态添加和移除订阅者，一次状态变化触发多个响应。

**取舍与边界：** 本例单线程；回调捕获对象的寿命、回调异常和跨线程同步仍需调用方约定。

**源码：** [observer.cpp](https://github.com/luckyJimLu/professional-cpp-learning/blob/main/patterns/examples/behavioral/observer.cpp)。下面给出完整文件；运行成功退出码为0。

```cpp
// 观察者
// 来源：M 第20章 Observable / Unsubscription and Thread Safety / Reentrancy，pp.243–256
// 独立教学改写；行为检查见 main。
#include <cassert>
#include <functional>
#include <map>
#include <utility>

using namespace std;

class Person {
  int age = 0, next = 0;
  map<int, function<void(int)>> observers;

public:
  int subscribe(function<void(int)> f) {
    observers[++next] = move(f);
    return next;
  }
  void unsubscribe(int id) {
    observers.erase(id);
  }
  void set_age(int n) {
    if (n == age) return;
    age = n;
    const int announced = age;
    auto snapshot = observers;
    for (const auto& kv : snapshot)
      if (observers.count(kv.first)) kv.second(announced);
  }
};
int main() {
  Person p;
  int calls = 0, last = 0;
  int id = p.subscribe([&](int n) {
    ++calls;
    last = n;
  });
  p.set_age(20);
  p.set_age(20);
  assert(calls == 1 && last == 20);
  p.unsubscribe(id);
  p.set_age(21);
  assert(calls == 1);
  int self = 0;
  self = p.subscribe([&](int) {
    p.unsubscribe(self);
    ++calls;
  });
  p.set_age(22);
  p.set_age(23);
  assert(calls == 2);
}
```

## 状态

**来源：** M 第21章 Handmade State Machine，pp.263–267

**书中案例与改写：** 电话状态和触发事件组成转移表；避免散落的条件判断。

**使用场景：** 订单、连接、设备或审批流程有明确的状态与合法事件。

**使用原因：** 同一操作的行为取决于当前状态，需显式拒绝非法转换。

**好处：** 状态规则可审查，合法与非法路径可独立验证。

**取舍与边界：** 本例采用表驱动状态机，是状态模式的变体；不是每状态一个类的 GoF 实现。

**源码：** [state.cpp](https://github.com/luckyJimLu/professional-cpp-learning/blob/main/patterns/examples/behavioral/state.cpp)。下面给出完整文件；运行成功退出码为0。

```cpp
// 状态
// 来源：M 第21章 Handmade State Machine，pp.263–267
// 独立教学改写；行为检查见 main。
#include <algorithm>
#include <cassert>
#include <map>
#include <utility>

using namespace std;

enum class State { idle, connecting, connected };
enum class Event { dial, accept, hangup };
class Phone {
  State current = State::idle;
  const map<pair<State, Event>, State> rules{{{State::idle, Event::dial}, State::connecting},
                                             {{State::connecting, Event::accept}, State::connected},
                                             {{State::connecting, Event::hangup}, State::idle},
                                             {{State::connected, Event::hangup}, State::idle}};

public:
  bool send(Event e) {
    auto it = rules.find({current, e});
    if (it == rules.end()) return false;
    current = it->second;
    return true;
  }
  State state() const {
    return current;
  }
};
int main() {
  Phone p;
  assert(!p.send(Event::accept));
  assert(p.state() == State::idle);
  assert(p.send(Event::dial));
  assert(p.send(Event::accept));
  assert(p.state() == State::connected);
  assert(p.send(Event::hangup));
  assert(p.state() == State::idle);
}
```

## 策略

**来源：** M 第22章 Dynamic Strategy，pp.273–278；S Guideline 19: Use Strategy to Isolate How Things Are Done

**书中案例与改写：** TextProcessor 将列表格式委派给 HTML 或 Markdown 策略。

**使用场景：** 业务目标相同但算法可替换，例如定价、压缩、格式化。

**使用原因：** 算法变化不应迫使上下文或调用方修改。

**好处：** 通过组合注入算法，可在运行时替换，便于独立测试。

**取舍与边界：** 策略引用必须有效；简单算法可以直接使用函数对象，本例文本不做 HTML 转义。

**源码：** [strategy.cpp](https://github.com/luckyJimLu/professional-cpp-learning/blob/main/patterns/examples/behavioral/strategy.cpp)。下面给出完整文件；运行成功退出码为0。

```cpp
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
```

## 模板方法

**来源：** M 第23章 Game Simulation，pp.281–284；H 第14章 Template Method / Non-Virtual Interface

**书中案例与改写：** Game::run 固定游戏流程，子类实现开始、回合和结束条件。

**使用场景：** 多个实现共享算法骨架，只有少数步骤不同。

**使用原因：** 重复复制整个流程会造成步骤顺序与约束逐渐不一致。

**好处：** 复用骨架并集中维护流程约束，子类只实现变化点。

**取舍与边界：** 继承耦合较强；需要动态组合步骤时更适合策略。

**源码：** [template_method.cpp](https://github.com/luckyJimLu/professional-cpp-learning/blob/main/patterns/examples/behavioral/template_method.cpp)。下面给出完整文件；运行成功退出码为0。

```cpp
// 模板方法
// 来源：M 第23章 Game Simulation，pp.281–284；H 第14章 Template Method / Non-Virtual Interface
// 独立教学改写；行为检查见 main。
#include <cassert>

using namespace std;

class Game {
public:
  virtual ~Game() = default;
  void run() {
    start();
    while (!finished()) turn();
  }

protected:
  virtual void start() = 0;
  virtual bool finished() const = 0;
  virtual void turn() = 0;
};
class ThreeTurns : public Game {
  int count = 0;
  void start() override {
    count = 0;
  }
  bool finished() const override {
    return count == 3;
  }
  void turn() override {
    ++count;
  }

public:
  int turns() const {
    return count;
  }
};
int main() {
  ThreeTurns g;
  Game& api = g;
  api.run();
  assert(g.turns() == 3);
}
```

## 访问者

**来源：** M 第24章 Classic Visitor，pp.293–297；S Guideline 16: Use Visitor to Extend Operations；H 第17章

**书中案例与改写：** 数值与加法表达式通过 accept 分派给求值访问者。

**使用场景：** 节点类型相对稳定，但需要不断增加打印、求值或序列化操作。

**使用原因：** 新增操作不应反复修改每种节点的业务实现。

**好处：** 把操作集中在访问者中，双分派选择具体节点处理函数。

**取舍与边界：** 增加节点种类通常要修改所有访问者；需先判断变化主要来自类型还是操作。

**源码：** [visitor.cpp](https://github.com/luckyJimLu/professional-cpp-learning/blob/main/patterns/examples/behavioral/visitor.cpp)。下面给出完整文件；运行成功退出码为0。

```cpp
// 访问者
// 来源：M 第24章 Classic Visitor，pp.293–297；S Guideline 16: Use Visitor to Extend Operations；H
// 第17章 独立教学改写；行为检查见 main。
#include <cassert>
#include <memory>
#include <utility>

using namespace std;

struct Number;
struct Add;
struct Visitor {
  virtual int visit(const Number&) = 0;
  virtual int visit(const Add&) = 0;
  virtual ~Visitor() = default;
};
struct Expr {
  virtual int accept(Visitor&) const = 0;
  virtual ~Expr() = default;
};
struct Number : Expr {
  int value;
  explicit Number(int n) : value(n) {}
  int accept(Visitor& v) const override {
    return v.visit(*this);
  }
};
struct Add : Expr {
  unique_ptr<Expr> left, right;
  Add(unique_ptr<Expr> l, unique_ptr<Expr> r) : left(move(l)), right(move(r)) {}
  int accept(Visitor& v) const override {
    return v.visit(*this);
  }
};
struct Evaluator : Visitor {
  int visit(const Number& n) override {
    return n.value;
  }
  int visit(const Add& a) override {
    return a.left->accept(*this) + a.right->accept(*this);
  }
};
int main() {
  Add a(make_unique<Number>(2), make_unique<Number>(3));
  Evaluator e;
  assert(a.accept(e) == 5);
}
```
