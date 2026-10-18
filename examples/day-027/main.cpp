#include <cassert>
#include <iostream>
enum class State { Idle, Connecting, Ready };
enum class Event { Start, Connected, Failed };
bool Apply(State& state, Event event) {
  if (state == State::Idle && event == Event::Start) {
    state = State::Connecting;
    return true;
  }
  if (state == State::Connecting && event == Event::Connected) {
    state = State::Ready;
    return true;
  }
  if (state == State::Connecting && event == Event::Failed) {
    state = State::Idle;
    return true;
  }
  return false;
}
int main() {
  State state{State::Idle};
  assert(!Apply(state, Event::Connected));
  assert(state == State::Idle);
  assert(Apply(state, Event::Start));
  assert(Apply(state, Event::Failed));
  assert(state == State::Idle);
  assert(Apply(state, Event::Start));
  assert(Apply(state, Event::Connected));
  assert(state == State::Ready);
  std::cout << "state transitions and rejection passed\n";
}
