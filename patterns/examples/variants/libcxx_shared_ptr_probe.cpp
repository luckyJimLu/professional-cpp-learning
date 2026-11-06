// shared_ptr 可观察生命周期实验：强/弱计数、对象析构、控制块回收、aliasing 与 deleter。
// 源码导读见 patterns/libcxx-shared-ptr-reading.md。
// 编译：c++ -std=c++17 -Wall -Wextra -Wconversion -Wpedantic -pthread <file>
#include <cassert>
#include <cstddef>
#include <iostream>
#include <memory>
#include <utility>

namespace {

struct Counters {
  static std::size_t allocations;
  static std::size_t deallocations;
};

std::size_t Counters::allocations = 0;
std::size_t Counters::deallocations = 0;

// 用同一个静态计数器观察 allocate_shared 的控制块分配与释放。
template <class T>
struct CountingAllocator {
  using value_type = T;

  CountingAllocator() noexcept = default;

  template <class U>
  CountingAllocator(const CountingAllocator<U>&) noexcept {}

  T* allocate(std::size_t count) {
    ++Counters::allocations;
    return std::allocator<T>{}.allocate(count);
  }

  void deallocate(T* pointer, std::size_t count) noexcept {
    ++Counters::deallocations;
    std::allocator<T>{}.deallocate(pointer, count);
  }

  template <class U>
  bool operator==(const CountingAllocator<U>&) const noexcept {
    return true;
  }

  template <class U>
  bool operator!=(const CountingAllocator<U>&) const noexcept {
    return false;
  }
};

struct Tracked {
  static int alive;

  explicit Tracked(int initial) : value(initial) {
    ++alive;
  }
  ~Tracked() {
    --alive;
  }

  int value;
};

int Tracked::alive = 0;

void CheckStrongAndWeakCounts() {
  // 一次分配同时容纳控制块与 Tracked 对象。
  auto owner = std::allocate_shared<Tracked>(CountingAllocator<Tracked>{}, 42);
  assert(Tracked::alive == 1);
  assert(owner.use_count() == 1);
  assert(Counters::allocations == 1);

  std::weak_ptr<Tracked> observer = owner;
  assert(observer.use_count() == 1);
  assert(!observer.expired());

  auto copy = owner;
  assert(owner.use_count() == 2);
  copy.reset();
  assert(owner.use_count() == 1);

  owner.reset();
  // 强引用归零：对象析构，但 weak_ptr 仍让控制块存活。
  assert(Tracked::alive == 0);
  assert(observer.expired());
  assert(observer.use_count() == 0);
  assert(observer.lock() == nullptr);
  assert(Counters::allocations == 1);
  assert(Counters::deallocations == 0);

  observer.reset();
  // 最后一个弱引用释放：合并分配的控制块（含对象存储）才回收。
  assert(Counters::deallocations == 1);
}

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

void CheckAliasingConstructor() {
  auto owner = std::make_shared<Pair>(1, 2);
  std::shared_ptr<int> alias(owner, &owner->second);

  assert(alias.get() == &owner->second);
  assert(alias.use_count() == 2);
  *alias = 9;
  assert(owner->second == 9);

  owner.reset();
  // alias 与 owner 共享同一个控制块，因此 Pair 仍然存活。
  assert(Pair::destroyed == 0);
  assert(*alias == 9);

  alias.reset();
  assert(Pair::destroyed == 1);
}

struct Resource {
  static int deleted;

  explicit Resource(int initial) : id(initial) {}

  int id;
};

int Resource::deleted = 0;

void CheckCustomDeleter() {
  auto deleter = [](Resource* resource) {
    ++Resource::deleted;
    delete resource;
  };

  std::shared_ptr<Resource> owner(new Resource(7), deleter);
  std::weak_ptr<Resource> observer = owner;

  owner.reset();
  // 强引用归零时 deleter 已经执行；控制块仍由 observer 持有。
  assert(Resource::deleted == 1);
  assert(observer.expired());
  assert(observer.lock() == nullptr);

  observer.reset();
}

}  // namespace

int main() {
  CheckStrongAndWeakCounts();
  CheckAliasingConstructor();
  CheckCustomDeleter();

  std::cout << "shared_ptr probe passed: allocations=" << Counters::allocations
            << ", deallocations=" << Counters::deallocations << '\n';
  return 0;
}
