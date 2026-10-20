// 状态
// 来源：M 第21章 Handmade State Machine，pp.263–267
// 独立教学改写；行为检查见 main。
#include <algorithm>
#include <cassert>
#include <map>
#include <utility>

using namespace std;

enum class State { idle, connecting, connected };
enum class Event { dial, accept, hangup };
class Phone {
  State current = State::idle;
  const map<pair<State, Event>, State> rules{{{State::idle, Event::dial}, State::connecting},
                                             {{State::connecting, Event::accept}, State::connected},
                                             {{State::connecting, Event::hangup}, State::idle},
                                             {{State::connected, Event::hangup}, State::idle}};

public:
  bool send(Event e) {
    auto it = rules.find({current, e});
    if (it == rules.end()) return false;
    current = it->second;
    return true;
  }
  State state() const {
    return current;
  }
};
int main() {
  Phone p;
  assert(!p.send(Event::accept));
  assert(p.state() == State::idle);
  assert(p.send(Event::dial));
  assert(p.send(Event::accept));
  assert(p.state() == State::connected);
  assert(p.send(Event::hangup));
  assert(p.state() == State::idle);
}
