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
