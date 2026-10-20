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
