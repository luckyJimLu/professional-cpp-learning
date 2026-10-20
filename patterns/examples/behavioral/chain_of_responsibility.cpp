// 责任链
// 来源：M 第13章 Pointer Chain，pp.161–166
// 独立教学改写；行为检查见 main。
#include <cassert>
#include <functional>
#include <vector>

using namespace std;

struct Creature {
  int attack = 2;
};
using Handler = function<bool(Creature&)>;
void handle(Creature& c, const vector<Handler>& chain) {
  for (const auto& h : chain)
    if (!h(c)) break;
}
int main() {
  Creature a;
  handle(a, {[](Creature& c) {
               c.attack *= 2;
               return true;
             },
             [](Creature& c) {
               c.attack += 1;
               return true;
             }});
  assert(a.attack == 5);
  Creature b;
  handle(b, {[](Creature&) { return false; },
             [](Creature& c) {
               c.attack *= 2;
               return true;
             }});
  assert(b.attack == 2);
}
