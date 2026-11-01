#include <cassert>
#include <cstddef>
#include <cstdint>
#include <cstdio>
#include <functional>
#include <memory>
#include <optional>
#include <type_traits>

// No deletion through these base types: no virtual destructor slots in this probe.
struct Base {
  int base_data = 1;
  virtual int Speak() const { return base_data; }
  virtual int Walk() const { return 7; }
};
struct Derived : Base {
  int derived_data = 2;
  int Speak() const override { return base_data + derived_data; }
};
struct Left {
  int left = 10;
  virtual int ReadLeft() const { return left; }
};
struct Right {
  int right = 20;
  virtual int ReadRight() const { return right; }
};
struct Both : Left, Right {
  int extra = 30;
  int ReadRight() const override { return left + right + extra; }
};
int Dispatch(const Base* p) { return p->Speak(); }
int DispatchRight(const Right* p) { return p->ReadRight(); }
int KnownDerived() {
  Derived object;
  return object.Speak();
}
int CapturedLambda(int input) {
  auto add = [bias = 3](int value) { return value + bias; };
  return add(input);
}
template<class T>
int CompileTimeBranch(const T& value) {
  if constexpr (std::is_integral_v<T>) return static_cast<int>(value);
  else return static_cast<int>(value.size());
}
struct ConstructionBase {
  int seen;
  ConstructionBase() : seen(Read()) {}
  virtual int Read() const { return 1; }
};
struct ConstructionDerived : ConstructionBase {
  int Read() const override { return 2; }
};
int main() {
  Derived derived;
  Both both;
  Right* right = &both;
  const auto address = [](const auto* p) {
    return reinterpret_cast<std::uintptr_t>(p);
  };
  std::printf("pointer=%zu Base=%zu Derived=%zu Both=%zu\n",
              sizeof(void*), sizeof(Base), sizeof(Derived), sizeof(Both));
  std::printf("base_data=%zu derived_data=%zu Right-subobject=%zu\n",
              static_cast<std::size_t>(address(&derived.base_data)-address(&derived)),
              static_cast<std::size_t>(address(&derived.derived_data)-address(&derived)),
              static_cast<std::size_t>(address(right)-address(&both)));
  std::printf("optional<int>=%zu std::function<int(int)>=%zu\n",
              sizeof(std::optional<int>), sizeof(std::function<int(int)>));
  assert(Dispatch(&derived) == 3);
  assert(DispatchRight(right) == 60);
  assert(KnownDerived() == 3);
  assert(CapturedLambda(4) == 7);
  assert(CompileTimeBranch(5) == 5);
  ConstructionDerived construction;
  assert(construction.seen == 1);
  assert(construction.Read() == 2);
  auto owner = std::make_unique<int>(9);
  auto destination = std::move(owner);
  assert(!owner && *destination == 9);
  std::puts("Object-model semantics passed (sizes are observations, not assertions)");
}
