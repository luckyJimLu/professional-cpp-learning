// 解释器
// 来源：M 第15章 Numeric Expression Evaluator / Abstract Syntax Tree，pp.189–202
// 独立教学改写；行为检查见 main。
#include <cassert>
#include <memory>
#include <stdexcept>
#include <utility>

using namespace std;

struct Expr {
  virtual int eval() const = 0;
  virtual ~Expr() = default;
};
struct Number : Expr {
  int n;
  explicit Number(int x) : n(x) {}
  int eval() const override {
    return n;
  }
};
struct Binary : Expr {
  char op;
  unique_ptr<Expr> left, right;
  Binary(char o, unique_ptr<Expr> l, unique_ptr<Expr> r) : op(o), left(move(l)), right(move(r)) {}
  int eval() const override {
    if (op == '+') return left->eval() + right->eval();
    if (op == '-') return left->eval() - right->eval();
    throw invalid_argument("operator");
  }
};
int main() {
  Binary x('-', make_unique<Number>(10),
           make_unique<Binary>('+', make_unique<Number>(2), make_unique<Number>(3)));
  assert(x.eval() == 5);
}
