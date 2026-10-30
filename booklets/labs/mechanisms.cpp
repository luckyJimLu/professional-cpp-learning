#include <cassert>
#include <cstdio>
#include <optional>
#include <type_traits>
#include <utility>
constexpr int square(int x) { return x * x; }
static_assert(square(6) == 36);
int constant_probe() { return square(6); }
int lambda_probe(int x) {
    auto add = [offset = 3](int value) { return value + offset; };
    return add(x);
}
struct Item {
    static inline int alive = 0;
    Item() { ++alive; }
    Item(const Item&) = delete;
    Item(Item&&) noexcept { ++alive; }
    ~Item() { --alive; }
};
int main() {
    int x = 1;
    static_assert(std::is_same_v<decltype(x), int>);
    static_assert(std::is_same_v<decltype((x)), int&>);
    assert(constant_probe() == 36);
    assert(lambda_probe(4) == 7);
    {
        std::optional<Item> source(std::in_place);
        std::optional<Item> target(std::move(source));
        assert(source.has_value()); // moving does not disengage optional
        assert(target.has_value());
        assert(Item::alive == 2);
        source.reset();
        assert(Item::alive == 1);
    }
    assert(Item::alive == 0);
    std::puts("C++20 implementation observations passed");
}
