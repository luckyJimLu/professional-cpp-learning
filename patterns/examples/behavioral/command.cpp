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
