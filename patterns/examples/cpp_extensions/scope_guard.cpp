// ScopeGuard（作用域回滚）
// 来源：H 第11章 ScopeGuard basics / Generic ScopeGuard，约 pp.295–305
// 独立教学改写；行为检查见 main。
#include <cassert>
#include <functional>
#include <stdexcept>
#include <utility>
#include <vector>

using namespace std;

class ScopeGuard {
  function<void()> rollback;
  bool active = true;

public:
  explicit ScopeGuard(function<void()> f) : rollback(move(f)) {}
  ScopeGuard(const ScopeGuard&) = delete;
  ScopeGuard& operator=(const ScopeGuard&) = delete;
  ~ScopeGuard() noexcept {
    if (active) rollback();
  }
  void commit() noexcept {
    active = false;
  }
};
int main() {
  vector<int> values;
  try {
    values.push_back(1);
    ScopeGuard g([&]() noexcept { values.pop_back(); });
    throw runtime_error("fail");
  } catch (const runtime_error&) {
  }
  assert(values.empty());
  {
    values.push_back(2);
    ScopeGuard g([&]() noexcept { values.pop_back(); });
    g.commit();
  }
  assert(values.size() == 1 && values[0] == 2);
}
