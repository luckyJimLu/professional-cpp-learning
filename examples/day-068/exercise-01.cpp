#include <iostream>
#include <new>

struct Reading {
    double value{0.0};

    void SetValue(double new_value) noexcept {
        value = new_value;
    }
};

// Review target: the returned raw pointer silently transfers ownership.
[[nodiscard]] Reading* CreateReading(double value) noexcept {
    auto* reading = new (std::nothrow) Reading{};
    if (reading == nullptr) {
        return nullptr;
    }

    reading->SetValue(value);
    return reading;
}

int main() {
    Reading* reading = CreateReading(42.5);
    if (reading == nullptr) {
        std::cout << "allocation failed\n";
        return 1;
    }

    std::cout << "reading value=" << reading->value << '\n';
    delete reading;
    reading = nullptr;
    std::cout << "manual release complete: "
              << (reading == nullptr ? "yes" : "no") << '\n';
    std::cout << "Review task: prefer a value return; if dynamic ownership is required, encode it with unique_ptr.\n";
    return 0;
}
