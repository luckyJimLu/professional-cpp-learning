# 创建型设计模式：书籍案例与 C++17 示例

[返回分类索引](book-examples.md) · [工程化学习指南](README.md)

本页来源缩写和改写规则见[书籍来源](book-examples.md#书籍来源)。完整 `.cpp` 可单独编译；每项分别说明使用场景、使用原因、好处和边界。

## 工厂方法

**来源：** M 第3章 Factories，pp.49–60；H 第13章 Virtual Constructors and Factories

**书中案例与改写：** 工厂接口创建饮品；这里改写为 Creator 的虚工厂方法，避免把静态工厂误称为 GoF 工厂方法。

**使用场景：** 框架流程固定，但创建的产品随插件或子类变化。

**使用原因：** 调用方需要依赖产品接口，避免在业务流程中反复选择具体类型。

**好处：** 新增产品时扩展创建者，复用统一流程；可以注入替代实现做测试。

**取舍与边界：** 会增加类层次；只有一两个固定类型时普通函数可能更清楚。

**源码：** [factory_method.cpp](https://github.com/luckyJimLu/professional-cpp-learning/blob/main/patterns/examples/creational/factory_method.cpp)。下面给出完整文件；运行成功退出码为0。

```cpp
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
```

## 抽象工厂

**来源：** M 第3章 Abstract Factory，pp.56–59

**书中案例与改写：** 书中的 CoffeeFactory/TeaFactory 创建热饮；本例扩展为饮品与杯具的配套产品族，以展示 GoF 产品族约束。

**使用场景：** 需要切换一整套配套产品，例如平台控件、数据库驱动族或主题。

**使用原因：** 只替换单个产品容易混用互不兼容的对象，需要在创建边界保持一致。

**好处：** 客户端不依赖具体产品，实现整族替换，并集中维护兼容关系。

**取舍与边界：** 增加新的产品类别通常要修改所有工厂接口；这里的配套关系由工厂约定保证。

**源码：** [abstract_factory.cpp](https://github.com/luckyJimLu/professional-cpp-learning/blob/main/patterns/examples/creational/abstract_factory.cpp)。下面给出完整文件；运行成功退出码为0。

```cpp
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
```

## 建造者

**来源：** M 第2章 Simple Builder / Fluent Builder，pp.33–47；H 第9章 Builder

**书中案例与改写：** HtmlBuilder 逐步创建列表；改写保留链式添加和最终构建。

**使用场景：** 复杂配置、请求或树形文档需要多个可选步骤。

**使用原因：** 长构造函数难读，构建过程与对象表示需要分离。

**好处：** 步骤有明确名称，支持链式调用，可以在 build 阶段统一校验。

**取舍与边界：** 简单对象直接聚合初始化即可；本例仅接收固定标签和可信文本，不是安全 HTML 模板引擎。

**源码：** [builder.cpp](https://github.com/luckyJimLu/professional-cpp-learning/blob/main/patterns/examples/creational/builder.cpp)。下面给出完整文件；运行成功退出码为0。

```cpp
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
```

## 原型

**来源：** M 第4章 Duplication via Copy Construction，pp.63–74；S Guideline 30: Apply Prototype for Abstract Copy Operations

**书中案例与改写：** 联系人与地址的深拷贝；补充多态 clone 接口。

**使用场景：** 运行时只知道基类，但需要复制完整动态类型或预配置模板。

**使用原因：** 直接复制基类会切片，共享内部可变指针又可能导致意外联动。

**好处：** 保持动态类型并封装深拷贝规则，便于从模板创建独立对象。

**取舍与边界：** 必须明确共享与深拷贝边界，复杂对象图还需处理循环引用。

**源码：** [prototype.cpp](https://github.com/luckyJimLu/professional-cpp-learning/blob/main/patterns/examples/creational/prototype.cpp)。下面给出完整文件；运行成功退出码为0。

```cpp
// 原型
// 来源：M 第4章 Duplication via Copy Construction，pp.63–74；S Guideline 30: Apply Prototype for
// Abstract Copy Operations 独立教学改写；行为检查见 main。
#include <cassert>
#include <memory>
#include <string>
#include <utility>

using namespace std;

struct Address {
  string city;
};
struct Contact {
  virtual unique_ptr<Contact> clone() const = 0;
  virtual ~Contact() = default;
};
struct Employee : Contact {
  string name;
  unique_ptr<Address> address;
  Employee(string n, string city)
      : name(move(n)), address(make_unique<Address>(Address{move(city)})) {}
  Employee(const Employee& x) : name(x.name), address(make_unique<Address>(*x.address)) {}
  unique_ptr<Contact> clone() const override {
    return make_unique<Employee>(*this);
  }
};
int main() {
  Employee a("Ann", "London");
  auto copy = a.clone();
  auto& b = dynamic_cast<Employee&>(*copy);
  b.address->city = "Paris";
  assert(a.address->city == "London");
  assert(b.address->city == "Paris");
}
```

## 单例

**来源：** M 第5章 Classic Implementation / Thread Safety / The Trouble with Singleton，pp.75–86；S Guideline 38: Design Singletons for Change

**书中案例与改写：** 函数内 static 数据库实例，禁用复制。

**使用场景：** 确实要求进程内唯一的服务入口或资源协调对象。

**使用原因：** 多个实例会破坏资源唯一性，需要控制构建与访问。

**好处：** 实例按需初始化，C++11 起局部静态初始化受线程安全保证。

**取舍与边界：** 初始化线程安全不等于成员访问线程安全；隐藏全局依赖不利于测试，业务层优先注入接口。

**源码：** [singleton.cpp](https://github.com/luckyJimLu/professional-cpp-learning/blob/main/patterns/examples/creational/singleton.cpp)。下面给出完整文件；运行成功退出码为0。

```cpp
// 单例
// 来源：M 第5章 Classic Implementation / Thread Safety / The Trouble with Singleton，pp.75–86；S
// Guideline 38: Design Singletons for Change 独立教学改写；行为检查见 main。
#include <cassert>
#include <string>

using namespace std;

class Database {
  Database() = default;

public:
  Database(const Database&) = delete;
  Database& operator=(const Database&) = delete;
  static Database& instance() {
    static Database db;
    return db;
  }
  int population(const string& city) const {
    return city == "London" ? 100 : 0;
  }
};
int main() {
  assert(&Database::instance() == &Database::instance());
  assert(Database::instance().population("London") == 100);
}
```
