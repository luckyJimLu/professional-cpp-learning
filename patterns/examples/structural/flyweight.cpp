// 享元
// 来源：M 第11章 User Names，pp.139–143
// 独立教学改写；行为检查见 main。
#include <algorithm>
#include <cassert>
#include <map>
#include <memory>
#include <string>

using namespace std;

class Names {
  map<string, shared_ptr<const string>> pool;

public:
  shared_ptr<const string> intern(const string& s) {
    auto it = pool.find(s);
    if (it != pool.end()) return it->second;
    auto p = make_shared<const string>(s);
    pool.emplace(s, p);
    return p;
  }
};
int main() {
  Names n;
  auto a = n.intern("Ann"), b = n.intern("Ann"), c = n.intern("Bob");
  assert(a == b && a != c);
  assert(*a == "Ann");
}
