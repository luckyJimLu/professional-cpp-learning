# 结构型模式（Structural Patterns）

[返回分类索引](book-examples.md) · [工程化学习指南](README.md)

本页来源缩写和改写规则见[书籍来源](book-examples.md#书籍来源)。完整 `.cpp` 可单独编译；每项分别说明使用场景、使用原因、好处和边界。

## 适配器（Adapter）

**来源：** M 第6章 LineToPointAdapter，pp.89–97；H 第16章 The Adapter Pattern

**书中案例与改写：** 将直线转换为点序列，供只会处理点的旧接口使用。

**使用场景：** 复用遗留类、第三方 SDK 或协议，双方接口不兼容。

**使用原因：** 直接修改原接口代价高，需在边界完成接口或数据形状转换。

**好处：** 旧组件保持可复用，转换逻辑集中；调用方只依赖目标接口。

**取舍与边界：** 转换可能昂贵；本例明确仅支持水平或垂直线段，斜线抛出异常。

**源码：** [adapter.cpp](https://github.com/luckyJimLu/professional-cpp-learning/blob/main/patterns/examples/structural/adapter.cpp)。下面给出完整文件；运行成功退出码为0。

```cpp
// 适配器
// 来源：M 第6章 LineToPointAdapter，pp.89–97；H 第16章 The Adapter Pattern
// 独立教学改写；行为检查见 main。
#include <algorithm>
#include <cassert>
#include <stdexcept>
#include <vector>

using namespace std;

struct Point {
  int x, y;
};
struct Line {
  Point a, b;
};
vector<Point> adapt(Line l) {
  vector<Point> points;
  if (l.a.y == l.b.y)
    for (int x = min(l.a.x, l.b.x); x <= max(l.a.x, l.b.x); ++x) points.push_back({x, l.a.y});
  else if (l.a.x == l.b.x)
    for (int y = min(l.a.y, l.b.y); y <= max(l.a.y, l.b.y); ++y) points.push_back({l.a.x, y});
  else
    throw invalid_argument("axis-aligned lines only");
  return points;
}
int main() {
  auto p = adapt({{3, 1}, {1, 1}});
  assert(p.size() == 3 && p.front().x == 1 && p.back().x == 3);
  bool rejected = false;
  try {
    adapt({{0, 0}, {1, 1}});
  } catch (const invalid_argument&) {
    rejected = true;
  }
  assert(rejected);
}
```

## 桥接（Bridge）

**来源：** M 第7章 Bridge，pp.102–105；S Guideline 28: Build Bridges to Remove Physical Dependencies

**书中案例与改写：** Circle 通过 Renderer 调用矢量或栅格实现；不再为每种组合派生类。

**使用场景：** 业务抽象和底层实现有两个独立变化维度，例如图形与渲染后端。

**使用原因：** 把两个维度放进同一继承树会形成组合爆炸。

**好处：** 两侧独立扩展，可在运行时组合与替换后端。

**取舍与边界：** 增加一层间接调用；本例引用不拥有渲染器，其生命周期必须覆盖图形。

**源码：** [bridge.cpp](https://github.com/luckyJimLu/professional-cpp-learning/blob/main/patterns/examples/structural/bridge.cpp)。下面给出完整文件；运行成功退出码为0。

```cpp
// 桥接
// 来源：M 第7章 Bridge，pp.102–105；S Guideline 28: Build Bridges to Remove Physical Dependencies
// 独立教学改写；行为检查见 main。
#include <cassert>
#include <string>

using namespace std;

struct Renderer {
  virtual string circle(int radius) const = 0;
  virtual ~Renderer() = default;
};
struct VectorRenderer : Renderer {
  string circle(int r) const override {
    return "vector:" + to_string(r);
  }
};
struct RasterRenderer : Renderer {
  string circle(int r) const override {
    return "raster:" + to_string(r);
  }
};
struct Circle {
  const Renderer& renderer;
  int radius;
  string draw() const {
    return renderer.circle(radius);
  }
};
int main() {
  VectorRenderer v;
  RasterRenderer r;
  assert((Circle{v, 2}.draw() == "vector:2"));
  assert((Circle{r, 2}.draw() == "raster:2"));
}
```

## 组合（Composite）

**来源：** M 第8章 Grouping Graphic Objects，pp.111–114

**书中案例与改写：** GraphicObject 的叶节点和 Group 共享 draw 接口；组可递归包含组。

**使用场景：** 文件系统、菜单、UI 控件树、组织树等部分与整体的层次结构。

**使用原因：** 调用方不应为单个对象和对象集合重复编写处理流程。

**好处：** 统一操作叶子和容器，递归组合，简化客户端遍历。

**取舍与边界：** 树的所有权必须清楚；本例 unique_ptr 防止共享和循环，不表达任意图。

**源码：** [composite.cpp](https://github.com/luckyJimLu/professional-cpp-learning/blob/main/patterns/examples/structural/composite.cpp)。下面给出完整文件；运行成功退出码为0。

```cpp
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
```

## 装饰器（Decorator）

**来源：** M 第9章 Dynamic Decorator，pp.119–124；S Guideline 35: Use Decorators to Add Customization Hierarchically；H 第16章

**书中案例与改写：** ColoredShape 包装 Shape 并增加颜色描述。

**使用场景：** 按需组合日志、压缩、校验或样式等附加职责。

**使用原因：** 为所有功能组合创建子类会指数增长。

**好处：** 不修改核心类型即可叠加功能，包装顺序明确。

**取舍与边界：** 包装层过多会增加追踪成本；装饰器保持同一接口，不负责转换接口。

**源码：** [decorator.cpp](https://github.com/luckyJimLu/professional-cpp-learning/blob/main/patterns/examples/structural/decorator.cpp)。下面给出完整文件；运行成功退出码为0。

```cpp
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
```

## 外观（Facade）

**来源：** M 第10章 How the Terminal Works / An Advanced Terminal，pp.133–138

**书中案例与改写：** 终端的缓冲区和视口封装到一个便捷接口；以下是简化改写。

**使用场景：** 子系统包含多个协作组件，但多数调用方只需要常见操作。

**使用原因：** 调用方逐个协调组件会暴露过多内部顺序和依赖。

**好处：** 提供稳定入口，集中编排，降低学习和迁移成本。

**取舍与边界：** 避免让外观吞并所有业务成为大类；专业调用方可能仍需底层接口。

**源码：** [facade.cpp](https://github.com/luckyJimLu/professional-cpp-learning/blob/main/patterns/examples/structural/facade.cpp)。下面给出完整文件；运行成功退出码为0。

```cpp
// 外观
// 来源：M 第10章 How the Terminal Works / An Advanced Terminal，pp.133–138
// 独立教学改写；行为检查见 main。
#include <cassert>
#include <string>

using namespace std;

struct Buffer {
  string text;
  void append(const string& s) {
    text += s;
  }
};
struct Viewport {
  string render(const Buffer& b) const {
    return b.text;
  }
};
class Console {
  Buffer buffer;
  Viewport viewport;

public:
  string write_line(const string& s) {
    buffer.append(s + "\n");
    return viewport.render(buffer);
  }
};
int main() {
  Console c;
  assert(c.write_line("hello") == "hello\n");
}
```

## 享元（Flyweight）

**来源：** M 第11章 User Names，pp.139–143

**书中案例与改写：** 将重复用户名字符串驻留；改写使用共享的不可变字符串。

**使用场景：** 大量对象具有重复且可共享的内在状态，例如字体、材质、姓名。

**使用原因：** 每个对象保存重复大字段会浪费内存。

**好处：** 相同内容共享存储，外在状态由使用者单独保存。

**取舍与边界：** 池和查找也有成本；本例池持有强引用且非线程安全，生产环境需清理策略。

**源码：** [flyweight.cpp](https://github.com/luckyJimLu/professional-cpp-learning/blob/main/patterns/examples/structural/flyweight.cpp)。下面给出完整文件；运行成功退出码为0。

```cpp
// 享元
// 来源：M 第11章 User Names，pp.139–143
// 独立教学改写；行为检查见 main。
#include <algorithm>
#include <cassert>
#include <map>
#include <memory>
#include <string>

using namespace std;

class Names {
  map<string, shared_ptr<const string>> pool;

public:
  shared_ptr<const string> intern(const string& s) {
    auto it = pool.find(s);
    if (it != pool.end()) return it->second;
    auto p = make_shared<const string>(s);
    pool.emplace(s, p);
    return p;
  }
};
int main() {
  Names n;
  auto a = n.intern("Ann"), b = n.intern("Ann"), c = n.intern("Bob");
  assert(a == b && a != c);
  assert(*a == "Ann");
}
```

## 代理（Proxy）

**来源：** M 第12章 Virtual Proxy，pp.152–154

**书中案例与改写：** LazyBitmap 在第一次 draw 时才构造真实 Bitmap。

**使用场景：** 对象加载昂贵，或访问时需要权限控制、远程调用、缓存。

**使用原因：** 希望维持相同接口，同时把访问管理从真实业务对象中分离。

**好处：** 延迟开销，统一控制访问，客户端不需要知道对象何时创建。

**取舍与边界：** 延迟初始化需考虑并发和错误传播；本例只演示单线程惰性加载。

**源码：** [proxy.cpp](https://github.com/luckyJimLu/professional-cpp-learning/blob/main/patterns/examples/structural/proxy.cpp)。下面给出完整文件；运行成功退出码为0。

```cpp
// 代理
// 来源：M 第12章 Virtual Proxy，pp.152–154
// 独立教学改写；行为检查见 main。
#include <cassert>
#include <memory>
#include <string>
#include <utility>

using namespace std;

struct Image {
  virtual string draw() = 0;
  virtual ~Image() = default;
};
struct Bitmap : Image {
  string file;
  explicit Bitmap(string f) : file(move(f)) {}
  string draw() override {
    return file;
  }
};
struct LazyBitmap : Image {
  string file;
  unique_ptr<Bitmap> real;
  explicit LazyBitmap(string f) : file(move(f)) {}
  string draw() override {
    if (!real) real = make_unique<Bitmap>(file);
    return real->draw();
  }
};
int main() {
  LazyBitmap p("photo.png");
  assert(!p.real);
  assert(p.draw() == "photo.png");
  auto* first = p.real.get();
  p.draw();
  assert(p.real.get() == first);
}
```
