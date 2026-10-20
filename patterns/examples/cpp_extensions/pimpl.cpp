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
