// 代理
// 来源：M 第12章 Virtual Proxy，pp.152–154
// 独立教学改写；行为检查见 main。
#include <cassert>
#include <memory>
#include <string>
#include <utility>

using namespace std;

struct Image {
  virtual string draw() = 0;
  virtual ~Image() = default;
};
struct Bitmap : Image {
  string file;
  explicit Bitmap(string f) : file(move(f)) {}
  string draw() override {
    return file;
  }
};
struct LazyBitmap : Image {
  string file;
  unique_ptr<Bitmap> real;
  explicit LazyBitmap(string f) : file(move(f)) {}
  string draw() override {
    if (!real) real = make_unique<Bitmap>(file);
    return real->draw();
  }
};
int main() {
  LazyBitmap p("photo.png");
  assert(!p.real);
  assert(p.draw() == "photo.png");
  auto* first = p.real.get();
  p.draw();
  assert(p.real.get() == first);
}
