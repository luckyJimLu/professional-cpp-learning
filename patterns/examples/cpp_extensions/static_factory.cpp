// 静态工厂（补充）
// 来源：M 第3章 Factory Method / Factory，pp.49–56
// 独立教学改写；行为检查见 main。
#include <cassert>
#include <cmath>
#include <stdexcept>

using namespace std;

class Point {
  Point(double a, double b) : x(a), y(b) {}

public:
  double x, y;
  static Point cartesian(double x, double y) {
    return Point(x, y);
  }
  static Point polar(double radius, double angle) {
    if (radius < 0) throw invalid_argument("radius");
    return Point(radius * cos(angle), radius * sin(angle));
  }
};
int main() {
  auto p = Point::polar(2, 0);
  assert(abs(p.x - 2) < 1e-9 && abs(p.y) < 1e-9);
  auto q = Point::cartesian(1, 3);
  assert(q.y == 3);
}
