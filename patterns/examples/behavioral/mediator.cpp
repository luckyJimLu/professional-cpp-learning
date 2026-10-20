// 中介者
// 来源：M 第17章 Chat Room，pp.217–223
// 独立教学改写；行为检查见 main。
#include <algorithm>
#include <cassert>
#include <string>
#include <vector>

using namespace std;

struct Person {
  string name;
  vector<string> inbox;
};
struct ChatRoom {
  vector<Person*> people;
  void join(Person& p) {
    if (find(people.begin(), people.end(), &p) == people.end()) people.push_back(&p);
  }
  void broadcast(const Person& from, const string& msg) {
    for (auto* p : people)
      if (p != &from) p->inbox.push_back(from.name + ":" + msg);
  }
};
int main() {
  Person a{"Ann", {}}, b{"Bob", {}};
  ChatRoom room;
  room.join(a);
  room.join(b);
  room.broadcast(a, "hello");
  assert(a.inbox.empty());
  assert(b.inbox.at(0) == "Ann:hello");
}
