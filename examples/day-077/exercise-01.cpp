#include <cassert>
#include <iostream>

struct LifetimeLedger {
    bool transport_alive{false};
    bool callback_registered{false};
    bool violation{false};
};

class FakeTransport {
public:
    explicit FakeTransport(LifetimeLedger& ledger) noexcept : ledger_{ledger} {
        ledger_.transport_alive = true;
        std::cout << "transport constructed\n";
    }

    FakeTransport(const FakeTransport&) = delete;
    FakeTransport& operator=(const FakeTransport&) = delete;

    ~FakeTransport() noexcept {
        ledger_.transport_alive = false;
        std::cout << "transport destroyed\n";
    }

private:
    LifetimeLedger& ledger_;
};

class CallbackRegistration {
public:
    explicit CallbackRegistration(LifetimeLedger& ledger) noexcept
        : ledger_{ledger} {}

    CallbackRegistration(const CallbackRegistration&) = delete;
    CallbackRegistration& operator=(const CallbackRegistration&) = delete;

    void Register() noexcept {
        ledger_.callback_registered = true;
        std::cout << "callback registered\n";
    }

    ~CallbackRegistration() noexcept {
        if (!ledger_.callback_registered) {
            return;
        }
        if (!ledger_.transport_alive) {
            ledger_.violation = true;
            std::cout << "ERROR: callback token outlived transport\n";
        } else {
            std::cout << "callback unregistered before transport destruction\n";
        }
        ledger_.callback_registered = false;
    }

private:
    LifetimeLedger& ledger_;
};

class ModemService {
public:
    explicit ModemService(LifetimeLedger& ledger) noexcept
        : callback_{ledger}, transport_{ledger} {
        callback_.Register();
    }

private:
    // EXERCISE BUG: reverse destruction destroys transport before callback.
    // Reorder these members and the initializer list to repair the lifetime.
    CallbackRegistration callback_;
    FakeTransport transport_;
};

int main() {
    LifetimeLedger ledger{};
    {
        ModemService service{ledger};
    }

    std::cout << "lifetime violation observed: "
              << (ledger.violation ? "true" : "false") << '\n';
    assert(ledger.violation);
    return 0;
}
