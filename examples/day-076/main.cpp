#include <cassert>
#include <cstdint>
#include <iostream>
#include <type_traits>

enum class Status {
    ok,
    timeout
};

[[nodiscard]] const char* ToString(Status status) noexcept {
    switch (status) {
        case Status::ok:
            return "ok";
        case Status::timeout:
            return "timeout";
    }
    return "unknown";
}

class FakeTransport {
public:
    [[nodiscard]] Status Start() noexcept {
        if (started_) {
            return Status::ok;
        }
        started_ = true;
        std::cout << "transport started\n";
        return Status::ok;
    }

    [[nodiscard]] Status Stop(std::uint32_t timeout_ms) noexcept {
        if (!started_) {
            std::cout << "transport already stopped\n";
            return Status::ok;
        }

        if (timeout_ms < kMinimumStopBudgetMs) {
            std::cout << "transport stop timed out\n";
            return Status::timeout;
        }

        started_ = false;
        std::cout << "transport stopped\n";
        return Status::ok;
    }

    [[nodiscard]] bool IsStarted() const noexcept {
        return started_;
    }

    void OnCallbackUnregistered() noexcept {
        std::cout << "transport callback endpoint released\n";
    }

    ~FakeTransport() noexcept {
        if (started_) {
            // Simulates a bounded, non-blocking hardware-safe fallback.
            started_ = false;
            std::cout << "transport destructor: non-blocking fallback disable\n";
        }
        std::cout << "transport destroyed\n";
    }

private:
    static constexpr std::uint32_t kMinimumStopBudgetMs{10U};
    bool started_{false};
};

class CallbackRegistration {
public:
    explicit CallbackRegistration(FakeTransport& transport) noexcept
        : transport_{transport} {}

    [[nodiscard]] bool Register() noexcept {
        if (registered_) {
            return true;
        }
        if (!transport_.IsStarted()) {
            return false;
        }
        registered_ = true;
        std::cout << "callback registered\n";
        return true;
    }

    void Unregister() noexcept {
        if (!registered_) {
            return;
        }
        registered_ = false;
        transport_.OnCallbackUnregistered();
        std::cout << "callback unregistered\n";
    }

    ~CallbackRegistration() noexcept {
        Unregister();
    }

private:
    FakeTransport& transport_; // borrowed; FakeTransport must outlive this object
    bool registered_{false};
};

class ModemService {
public:
    ModemService() noexcept
        : transport_{}, callback_{transport_} {}

    [[nodiscard]] Status Start() noexcept {
        const Status status = transport_.Start();
        if (status != Status::ok) {
            return status;
        }
        if (!callback_.Register()) {
            (void)transport_.Stop(10U);
            return Status::timeout;
        }
        return Status::ok;
    }

    [[nodiscard]] Status Stop(std::uint32_t timeout_ms) noexcept {
        callback_.Unregister();
        return transport_.Stop(timeout_ms);
    }

    ~ModemService() noexcept = default;

private:
    // Declaration order is intentional: callback_ is destroyed before transport_.
    FakeTransport transport_;
    CallbackRegistration callback_;
};

int main() {
    static_assert(std::is_nothrow_destructible_v<ModemService>);

    std::cout << "=== explicit shutdown ===\n";
    {
        ModemService service;
        assert(service.Start() == Status::ok);

        const Status first_stop = service.Stop(2U);
        std::cout << "first Stop: " << ToString(first_stop) << '\n';

        const Status second_stop = service.Stop(20U);
        std::cout << "second Stop: " << ToString(second_stop) << '\n';
        assert(second_stop == Status::ok);
    }

    std::cout << "=== destructor fallback ===\n";
    {
        ModemService service;
        assert(service.Start() == Status::ok);
        // Deliberately omit Stop(): member destructors still run in safe order.
    }

    return 0;
}
