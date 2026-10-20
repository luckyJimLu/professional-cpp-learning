// 适配器
// 来源：M 第6章 LineToPointAdapter，pp.89–97；H 第16章 The Adapter Pattern
// 独立教学改写；行为检查见 main。
#include <algorithm>
#include <cassert>
#include <stdexcept>
#include <vector>

using namespace std;

struct Point {
  int x, y;
};
struct Line {
  Point a, b;
};
vector<Point> adapt(Line l) {
  vector<Point> points;
  if (l.a.y == l.b.y)
    for (int x = min(l.a.x, l.b.x); x <= max(l.a.x, l.b.x); ++x) points.push_back({x, l.a.y});
  else if (l.a.x == l.b.x)
    for (int y = min(l.a.y, l.b.y); y <= max(l.a.y, l.b.y); ++y) points.push_back({l.a.x, y});
  else
    throw invalid_argument("axis-aligned lines only");
  return points;
}
int main() {
  auto p = adapt({{3, 1}, {1, 1}});
  assert(p.size() == 3 && p.front().x == 1 && p.back().x == 3);
  bool rejected = false;
  try {
    adapt({{0, 0}, {1, 1}});
  } catch (const invalid_argument&) {
    rejected = true;
  }
  assert(rejected);
}
