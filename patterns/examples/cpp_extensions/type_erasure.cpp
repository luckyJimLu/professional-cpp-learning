// 类型擦除
// 来源：H 第6章 Understanding Type Erasure；S Guidelines 31–34（External Polymorphism / Type
// Erasure） 独立教学改写；行为检查见 main。
#include <cassert>
#include <memory>
#include <string>
#include <utility>
#include <vector>

using namespace std;

class Drawable {
  struct Concept {
    virtual string draw() const = 0;
    virtual ~Concept() = default;
  };
  template <class T>
  struct Model : Concept {
    T value;
    explicit Model(T x) : value(move(x)) {}
    string draw() const override {
      return value.draw();
    }
  };
  unique_ptr<Concept> self;

public:
  template <class T>
  explicit Drawable(T x) : self(make_unique<Model<T>>(move(x))) {}
  string draw() const {
    return self->draw();
  }
};
struct Circle {
  string draw() const {
    return "circle";
  }
};
struct Square {
  string draw() const {
    return "square";
  }
};
int main() {
  vector<Drawable> shapes;
  shapes.emplace_back(Circle{});
  shapes.emplace_back(Square{});
  assert(shapes[0].draw() == "circle");
  assert(shapes[1].draw() == "square");
}
