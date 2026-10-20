// 空对象（补充）
// 来源：M 第19章 Null Object，pp.237–242
// 独立教学改写；行为检查见 main。
#include <cassert>
#include <string>
#include <vector>

using namespace std;

struct Logger {
  virtual void info(const string&) = 0;
  virtual ~Logger() = default;
};
struct NullLogger : Logger {
  void info(const string&) override {}
};
struct MemoryLogger : Logger {
  vector<string> lines;
  void info(const string& s) override {
    lines.push_back(s);
  }
};
struct Account {
  Logger& logger;
  int balance = 0;
  void deposit(int n) {
    balance += n;
    logger.info("deposit");
  }
};
int main() {
  NullLogger null;
  Account a{null};
  a.deposit(10);
  assert(a.balance == 10);
  MemoryLogger log;
  Account b{log};
  b.deposit(20);
  assert(log.lines.size() == 1);
}
