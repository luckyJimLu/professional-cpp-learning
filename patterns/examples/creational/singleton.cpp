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
