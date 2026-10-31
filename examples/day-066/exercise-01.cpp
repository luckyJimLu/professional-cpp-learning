#include <array>
#include <cstddef>
#include <iostream>
#include <memory>
#include <optional>

enum class ResourceKind {
    fixed_driver,
    session,
    telemetry_batch
};

struct Driver {
    void Poll() const { std::cout << "driver poll\n"; }
};

struct Session {
    explicit Session(int value) noexcept : id{value} {}
    int id{};
};

int main() {
    Driver driver;
    Driver& required_borrow = driver;
    required_borrow.Poll();

    auto session_owner = std::make_unique<Session>(7);
    Session& session_borrow = *session_owner;
    std::cout << "session=" << session_borrow.id << '\n';

    std::array<std::optional<int>, 2> bounded_slots{};
    bounded_slots[0].emplace(10);
    bounded_slots[1].emplace(20);

    std::cout << "bounded values="
              << bounded_slots[0].value() << ","
              << bounded_slots[1].value() << '\n';

    std::cout << "Code review: justify each resource boundary; do not replace all three with shared_ptr.\n";
    return 0;
}
