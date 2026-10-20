// 迭代器
// 来源：M 第16章 Traversing a Binary Tree，pp.208–215
// 独立教学改写；行为检查见 main。
#include <cassert>
#include <memory>
#include <vector>

using namespace std;

struct Node {
  int value;
  unique_ptr<Node> left, right;
  explicit Node(int n) : value(n) {}
};
struct Inorder {
  const Node* root;
  struct Iterator {
    vector<const Node*> pending;
    void push(const Node* n) {
      while (n) {
        pending.push_back(n);
        n = n->left.get();
      }
    }
    explicit Iterator(const Node* n) {
      push(n);
    }
    int operator*() const {
      return pending.back()->value;
    }
    Iterator& operator++() {
      const auto* n = pending.back();
      pending.pop_back();
      push(n->right.get());
      return *this;
    }
    bool operator!=(const Iterator& x) const {
      return pending != x.pending;
    }
  };
  Iterator begin() const {
    return Iterator(root);
  }
  Iterator end() const {
    return Iterator(nullptr);
  }
};
int main() {
  Node root(2);
  root.left = make_unique<Node>(1);
  root.right = make_unique<Node>(3);
  vector<int> values;
  for (int n : Inorder{&root}) values.push_back(n);
  assert((values == vector<int>{1, 2, 3}));
}
