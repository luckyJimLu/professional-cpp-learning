#include <cassert>
#include <expected>
#include <iostream>
#include <string>
#include <type_traits>
#include <utility>
#ifdef NDEBUG
#error "Booklet self-tests require assertions"
#endif

enum class State : unsigned char { idle, busy };
std::expected<int, std::string> read_count(bool valid) {
    if (!valid) return std::unexpected(std::string{"invalid count"});
    return 7;
}
int main() {
    static_assert(std::is_same_v<decltype(std::to_underlying(State::busy)), unsigned char>);
    assert(std::to_underlying(State::busy) == 1);
    assert(std::string{"C++23"}.contains("++"));
    const auto ok = read_count(true);
    const auto error = read_count(false);
    assert(ok && *ok == 7);
    assert(!error && error.error() == "invalid count");
    std::cout << "C++23 booklet checks passed\n";
}
