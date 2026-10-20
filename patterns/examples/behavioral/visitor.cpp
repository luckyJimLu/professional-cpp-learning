// 访问者
// 来源：M 第24章 Classic Visitor，pp.293–297；S Guideline 16: Use Visitor to Extend Operations；H
// 第17章 独立教学改写；行为检查见 main。
#include <cassert>
#include <memory>
#include <utility>

using namespace std;

struct Number;
struct Add;
struct Visitor {
  virtual int visit(const Number&) = 0;
  virtual int visit(const Add&) = 0;
  virtual ~Visitor() = default;
};
struct Expr {
  virtual int accept(Visitor&) const = 0;
  virtual ~Expr() = default;
};
struct Number : Expr {
  int value;
  explicit Number(int n) : value(n) {}
  int accept(Visitor& v) const override {
    return v.visit(*this);
  }
};
struct Add : Expr {
  unique_ptr<Expr> left, right;
  Add(unique_ptr<Expr> l, unique_ptr<Expr> r) : left(move(l)), right(move(r)) {}
  int accept(Visitor& v) const override {
    return v.visit(*this);
  }
};
struct Evaluator : Visitor {
  int visit(const Number& n) override {
    return n.value;
  }
  int visit(const Add& a) override {
    return a.left->accept(*this) + a.right->accept(*this);
  }
};
int main() {
  Add a(make_unique<Number>(2), make_unique<Number>(3));
  Evaluator e;
  assert(a.accept(e) == 5);
}
