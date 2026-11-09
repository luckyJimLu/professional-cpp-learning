#include <iostream>

struct LifetimeProbe {
    bool transport_alive{false};
    bool callback_registered{false};
    bool order_violation{false};
};

class FakeTransport {
public:
    explicit FakeTransport(LifetimeProbe& probe) noexcept
        : probe_{probe} {
        probe_.transport_alive = true;
        std::cout << "transport constructed\n";
    }

    ~FakeTransport() noexcept {
        probe_.transport_alive = false;
        std::cout << "transport destroyed\n";
    }

private:
    LifetimeProbe& probe_;
};

class CallbackRegistration {
public:
    explicit CallbackRegistration(LifetimeProbe& probe) noexcept
        : probe_{probe} {
        probe_.callback_registered = true;
        std::cout << "callback registered\n";
    }

    ~CallbackRegistration() noexcept {
        if (!probe_.callback_registered) {
            return;
        }

        if (!probe_.transport_alive) {
            probe_.order_violation = true;
            std::cout << "ERROR: callback teardown ran after transport destruction\n";
        } else {
            std::cout << "callback unregistered while transport is alive\n";
        }
        probe_.callback_registered = false;
    }

private:
    LifetimeProbe& probe_;
};

class ModemService {
public:
    explicit ModemService(LifetimeProbe& probe) noexcept
        : callback_{probe}, transport_{probe} {}

private:
    // Deliberate design defect: reverse destruction destroys transport_ first.
    CallbackRegistration callback_;
    FakeTransport transport_;
};

int main() {
    LifetimeProbe probe{};
    {
        ModemService service{probe};
        std::cout << "leaving ModemService scope\n";
    }

    std::cout << "order violation observed: " << std::boolalpha
              << probe.order_violation << '\n';
    return 0;
}
