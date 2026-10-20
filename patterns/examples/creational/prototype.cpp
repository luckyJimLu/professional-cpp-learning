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
