// 桥接
// 来源：M 第7章 Bridge，pp.102–105；S Guideline 28: Build Bridges to Remove Physical Dependencies
// 独立教学改写；行为检查见 main。
#include <cassert>
#include <string>

using namespace std;

struct Renderer {
  virtual string circle(int radius) const = 0;
  virtual ~Renderer() = default;
};
struct VectorRenderer : Renderer {
  string circle(int r) const override {
    return "vector:" + to_string(r);
  }
};
struct RasterRenderer : Renderer {
  string circle(int r) const override {
    return "raster:" + to_string(r);
  }
};
struct Circle {
  const Renderer& renderer;
  int radius;
  string draw() const {
    return renderer.circle(radius);
  }
};
int main() {
  VectorRenderer v;
  RasterRenderer r;
  assert((Circle{v, 2}.draw() == "vector:2"));
  assert((Circle{r, 2}.draw() == "raster:2"));
}
