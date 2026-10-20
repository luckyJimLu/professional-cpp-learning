// 外观
// 来源：M 第10章 How the Terminal Works / An Advanced Terminal，pp.133–138
// 独立教学改写；行为检查见 main。
#include <cassert>
#include <string>

using namespace std;

struct Buffer {
  string text;
  void append(const string& s) {
    text += s;
  }
};
struct Viewport {
  string render(const Buffer& b) const {
    return b.text;
  }
};
class Console {
  Buffer buffer;
  Viewport viewport;

public:
  string write_line(const string& s) {
    buffer.append(s + "\n");
    return viewport.render(buffer);
  }
};
int main() {
  Console c;
  assert(c.write_line("hello") == "hello\n");
}
