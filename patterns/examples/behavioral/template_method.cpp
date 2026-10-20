// 模板方法
// 来源：M 第23章 Game Simulation，pp.281–284；H 第14章 Template Method / Non-Virtual Interface
// 独立教学改写；行为检查见 main。
#include <cassert>

using namespace std;

class Game {
public:
  virtual ~Game() = default;
  void run() {
    start();
    while (!finished()) turn();
  }

protected:
  virtual void start() = 0;
  virtual bool finished() const = 0;
  virtual void turn() = 0;
};
class ThreeTurns : public Game {
  int count = 0;
  void start() override {
    count = 0;
  }
  bool finished() const override {
    return count == 3;
  }
  void turn() override {
    ++count;
  }

public:
  int turns() const {
    return count;
  }
};
int main() {
  ThreeTurns g;
  Game& api = g;
  api.run();
  assert(g.turns() == 3);
}
