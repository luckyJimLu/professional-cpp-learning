// shared_ptr 实现原理实验：用可观测行为验证正文模型
//
// 本实验不依赖任何一家标准库源码，只观测标准保证的行为，
// 再对照正文里的 libc++ 实现（__shared_count / __shared_weak_count）理解"为什么"。
//
// 覆盖正文的 5 个要点：
//   实验 1：make_shared 只有 1 次分配（对象与控制块同块）
//   实验 2：shared_ptr(new T) 有 2 次分配（对象 + 控制块各一次）
//   实验 3：weak_ptr 让控制块在对象析构后继续存活，直到弱引用也归零
//   实验 4：自定义 deleter 被类型擦除进控制块（shared_ptr<void> 类型相同）
//   实验 5：weak_ptr::lock()：有效则续命，过期则返回空（不抛异常）
//
// 编译：g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic lab/main.cpp -o lab_main
// 运行：./lab_main

#include <atomic>
#include <cstddef>
#include <cstdlib>
#include <iostream>
#include <memory>
#include <new>
#include <type_traits>

// ---------- 全局 new/delete 计数：观测"几次分配" ----------

namespace {

std::atomic<std::size_t> g_new_count{0};
std::atomic<std::size_t> g_delete_count{0};

struct AllocationSnapshot {
  std::size_t news{0};
  std::size_t deletes{0};
};

[[nodiscard]] AllocationSnapshot TakeSnapshot() {
  return AllocationSnapshot{g_new_count.load(), g_delete_count.load()};
}

[[nodiscard]] std::size_t NewDelta(const AllocationSnapshot& before) {
  return g_new_count.load() - before.news;
}

[[nodiscard]] std::size_t DeleteDelta(const AllocationSnapshot& before) {
  return g_delete_count.load() - before.deletes;
}

void Report(const char* name, const AllocationSnapshot& before) {
  std::cout << name << "：new +" << NewDelta(before) << "，delete +" << DeleteDelta(before) << '\n';
}

}  // namespace

void* operator new(std::size_t size) {
  g_new_count.fetch_add(1);
  if (void* ptr = std::malloc(size)) {
    return ptr;
  }
  throw std::bad_alloc{};
}

void operator delete(void* ptr) noexcept {
  g_delete_count.fetch_add(1);
  std::free(ptr);
}

// -Wsized-deallocation 要求同时提供 sized 版本；两者都只计数一次，
// 同一次释放编译器只会选用其中之一。
void operator delete(void* ptr, std::size_t) noexcept {
  g_delete_count.fetch_add(1);
  std::free(ptr);
}

void* operator new[](std::size_t size) {
  g_new_count.fetch_add(1);
  if (void* ptr = std::malloc(size)) {
    return ptr;
  }
  throw std::bad_alloc{};
}

void operator delete[](void* ptr) noexcept {
  g_delete_count.fetch_add(1);
  std::free(ptr);
}

void operator delete[](void* ptr, std::size_t) noexcept {
  g_delete_count.fetch_add(1);
  std::free(ptr);
}

// ---------- 被管理的对象：构造/析构打点 ----------

class Widget {
public:
  explicit Widget(int id) : id_(id) {
    std::cout << "  [ctor] Widget " << id_ << '\n';
  }

  ~Widget() {
    std::cout << "  [dtor] Widget " << id_ << " destroyed\n";
  }

  Widget(const Widget&) = delete;
  Widget& operator=(const Widget&) = delete;

  [[nodiscard]] int Id() const {
    return id_;
  }

private:
  int id_;
};

struct Pair {
  static int destroyed;

  Pair(int first_value, int second_value) : first(first_value), second(second_value) {}
  ~Pair() {
    ++destroyed;
  }

  int first;
  int second;
};

int Pair::destroyed = 0;

// ---------- 实验 ----------

void ExperimentMakeSharedSingleAllocation() {
  std::cout << "实验 1：make_shared 只有 1 次分配（对象与控制块同块）\n";
  const auto before = TakeSnapshot();
  {
    auto sp = std::make_shared<Widget>(1);
    std::cout << "  use_count = " << sp.use_count() << '\n';
  }
  Report("  分配统计", before);  // 预期：new +1，delete +1
  std::cout << '\n';
}

void ExperimentNewTwiceAllocation() {
  std::cout << "实验 2：shared_ptr(new Widget) 有 2 次分配\n";
  const auto before = TakeSnapshot();
  {
    // 注意：new Widget 先执行；若控制块分配抛异常，shared_ptr 构造函数会用删除器
    // 释放 Widget，不会泄漏。make_shared 的优势是少一次分配和更好的局部性。
    std::shared_ptr<Widget> sp(new Widget(2));
    std::cout << "  use_count = " << sp.use_count() << '\n';
  }
  Report("  分配统计", before);  // 预期：new +2，delete +2
  std::cout << '\n';
}

void ExperimentWeakHoldsControlBlock() {
  std::cout << "实验 3：weak_ptr 让控制块在对象析构后继续存活\n";
  std::weak_ptr<Widget> wp;
  const auto before = TakeSnapshot();
  {
    auto sp = std::make_shared<Widget>(3);
    wp = sp;
    std::cout << "  sp.reset() 前：use_count = " << sp.use_count() << '\n';
    sp.reset();  // 强计数归零 -> Widget 析构，但控制块内存不释放
    std::cout << "  sp.reset() 后：expired = " << wp.expired() << '\n';
    Report("  此时分配统计", before);  // 预期：new +1，delete +0（控制块还在）
  }
  wp.reset();                         // 弱计数归零 -> 控制块内存释放
  Report("  wp.reset() 后", before);  // 预期：new +1，delete +1
  std::cout << '\n';
}

void ExperimentDeleterTypeErasure() {
  std::cout << "实验 4：自定义 deleter 被类型擦除进控制块\n";
  int deleter_a_calls = 0;
  int deleter_b_calls = 0;
  const auto before = TakeSnapshot();
  {
    std::shared_ptr<void> a(new Widget(4), [&deleter_a_calls](void* p) {
      ++deleter_a_calls;
      delete static_cast<Widget*>(p);
    });
    std::shared_ptr<void> b(new Widget(5), [&deleter_b_calls](void* p) {
      ++deleter_b_calls;
      delete static_cast<Widget*>(p);
    });
    // 两个 lambda 类型不同，但 shared_ptr<void> 类型相同：
    // deleter 的具体类型只活在控制块里，对外不可见。
    static_assert(std::is_same_v<decltype(a), decltype(b)>);
    std::cout << "  a.use_count = " << a.use_count() << "，b.use_count = " << b.use_count() << '\n';
  }
  Report("  分配统计", before);  // 预期：new +4（2 个对象 + 2 个含 deleter 的控制块）
  std::cout << "  deleter A 调用 " << deleter_a_calls << " 次，deleter B 调用 " << deleter_b_calls
            << " 次\n\n";
}

void ExperimentWeakLock() {
  std::cout << "实验 5：weak_ptr::lock()：有效则续命，过期则返回空\n";
  std::weak_ptr<Widget> wp;
  {
    auto sp = std::make_shared<Widget>(6);
    wp = sp;
    if (auto locked = wp.lock()) {
      // lock() 成功 = 原子地把强计数加一，对象在此期间不可能被销毁。
      std::cout << "  对象存活时 lock 成功，use_count = " << locked.use_count() << '\n';
    }
  }
  if (auto locked = wp.lock()) {
    std::cout << "  不应执行到这里\n";
  } else {
    // 对比：shared_ptr<Widget> bad(wp) 在过期时会抛 std::bad_weak_ptr；
    // lock() 只是返回空，不抛异常。
    std::cout << "  对象已析构时 lock 返回空 shared_ptr（不抛异常）\n";
  }
  std::cout << '\n';
}

void ExperimentAliasingConstructor() {
  std::cout << "实验 6：aliasing constructor 共享控制块，但不改变销毁对象\n";
  const auto before = TakeSnapshot();
  {
    auto owner = std::make_shared<Pair>(1, 2);
    std::shared_ptr<int> alias(owner, &owner->second);
    std::cout << "  alias.use_count = " << alias.use_count() << '\n';
    owner.reset();
    std::cout << "  owner.reset() 后 Pair::destroyed = " << Pair::destroyed << '\n';
    std::cout << "  *alias = " << *alias << '\n';
  }
  Report("  分配统计", before);  // 预期：new +1，delete +1
  std::cout << "  alias 释放后 Pair::destroyed = " << Pair::destroyed << '\n';
  std::cout << '\n';
}

int main() {
  // 先触发一次 iostream 内部初始化，使其分配不计入各实验的快照。
  std::cout << "shared_ptr 实现原理实验：控制块与引用计数的可观测验证\n\n";

  ExperimentMakeSharedSingleAllocation();
  ExperimentNewTwiceAllocation();
  ExperimentWeakHoldsControlBlock();
  ExperimentDeleterTypeErasure();
  ExperimentWeakLock();
  ExperimentAliasingConstructor();

  std::cout << "全部实验结束。\n";
  return 0;
}
