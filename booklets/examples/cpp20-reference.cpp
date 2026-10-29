// Complete C++20 host self-test. No fixed user filename is written.
#include <algorithm>
#include <atomic>
#include <cassert>
#include <concepts>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <memory>
#include <mutex>
#include <numeric>
#include <optional>
#include <ranges>
#include <span>
#include <stdexcept>
#include <string>
#include <string_view>
#include <thread>
#include <type_traits>
#include <unordered_map>
#include <utility>
#include <vector>
#ifdef NDEBUG
#error "Booklet self-tests require assertions"
#endif

template<class T>
concept Addable = requires(T a, T b) {
    { a + b } -> std::convertible_to<T>;
};
template<Addable T>
T combine(const T& a, const T& b) { return a + b; }

struct Base {
    virtual ~Base() = default;
    virtual int value() const = 0;
};
struct Leaf final : Base {
    int value() const override { return 7; }
};
struct Count {
    explicit Count(int n) : value(n) {}
    explicit operator bool() const noexcept { return value != 0; }
    int value;
};
static_assert(!std::is_convertible_v<int, Count>);

int main(int argc, char* argv[]) {
    assert(argc == 2); // The checker supplies a path in its private temp directory.
    const int x = 3;
    static_assert(std::is_same_v<decltype(x), const int>);
    static_assert(std::is_same_v<decltype((x)), const int&>);
    assert(Count{3});
    assert(combine(2, 3) == 5);
    assert(combine(std::string{"C"}, std::string{"++"}) == "C++");

    std::vector<int> repeated(3, 7);
    std::vector<int> listed{3, 7};
    assert(repeated.size() == 3 && listed.size() == 2);
    listed.reserve(10);
    assert(listed.size() == 2 && listed.capacity() >= 10);
    std::vector<int> values{3, 1, 3, -1, 2};
    std::erase_if(values, [](int n) { return n < 0; });
    std::ranges::sort(values);
    const auto tail = std::ranges::unique(values);
    values.erase(tail.begin(), tail.end());
    assert((values == std::vector<int>{1, 2, 3}));
    assert(std::accumulate(values.begin(), values.end(), 0LL) == 6);
    const auto it = std::ranges::lower_bound(values, 2);
    assert(it != values.end() && *it == 2);
    std::span<const int> borrowed(values);
    assert(borrowed.size() == 3);
    auto positive = values | std::views::filter([](int n) { return n > 1; });
    assert(std::ranges::distance(positive) == 2);

    std::unordered_map<std::string, int> counts{{"apple", 2}};
    counts.try_emplace("apple", 99);
    assert(counts.at("apple") == 2 && counts.contains("apple"));
    assert(!counts.contains("absent") && counts.size() == 1);
    auto owner = std::make_unique<int>(7);
    auto task = [p = std::move(owner)] { return *p; };
    assert(!owner && task() == 7);
    std::unique_ptr<Base> poly = std::make_unique<Leaf>();
    assert(poly->value() == 7);
    auto shared = std::make_shared<int>(9);
    std::weak_ptr<int> weak = shared;
    assert(*weak.lock() == 9);
    shared.reset();
    assert(!weak.lock());
    const std::string source = "AT+READY";
    const std::string_view text(source);
    assert(text.starts_with("AT") && text.substr(3) == "READY");

    const std::filesystem::path path(argv[1]);
    {
        std::ofstream out(path);
        if (!out) throw std::runtime_error("open for writing failed");
        out << "first\nsecond\n";
        out.close();
        if (!out) throw std::runtime_error("write or close failed");
    }
    {
        std::ifstream in(path);
        if (!in) throw std::runtime_error("open for reading failed");
        std::string line;
        std::vector<std::string> lines;
        while (std::getline(in, line)) lines.push_back(line);
        if (in.bad() || !in.eof()) throw std::runtime_error("read failed");
        assert((lines == std::vector<std::string>{"first", "second"}));
    }
    std::filesystem::remove(path);
    std::mutex mutex;
    int protected_total = 0;
    std::atomic<int> completed{0};
    {
        std::vector<std::jthread> workers;
        for (int i = 0; i < 4; ++i) {
            workers.emplace_back([&] {
                {
                    std::scoped_lock lock(mutex);
                    ++protected_total;
                }
                completed.fetch_add(1, std::memory_order_relaxed);
            });
        }
    } // jthread joins before referenced state is destroyed.
    assert(protected_total == 4 && completed.load() == 4);
    std::cout << "C++20 booklet checks passed\n";
}
