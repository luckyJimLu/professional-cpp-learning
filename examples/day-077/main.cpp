#include <cassert>
#include <cstdint>
#include <iostream>

enum class Status : std::uint8_t {
    kOk,
    kTimeout
};

class FakeTransport {
public:
    FakeTransport() noexcept : running_{true} {
        std::cout << "transport started\n";
    }

    FakeTransport(const FakeTransport&) = delete;
    FakeTransport& operator=(const FakeTransport&) = delete;

    ~FakeTransport() noexcept {
        if (running_) {
            // A bounded, non-blocking safety fallback for this host-side model.
            running_ = false;
            std::cout << "transport destructor fallback\n";
        }
        std::cout << "transport destroyed\n";
    }

    void UnregisterCallback() noexcept {
        std::cout << "callback unregistered while transport alive\n";
    }

    [[nodiscard]] Status Stop(std::uint32_t timeout_ms) noexcept {
        if (!running_) {
            return Status::kOk;
        }
        if (timeout_ms < 10U) {
            std::cout << "transport stop timed out\n";
            return Status::kTimeout;
        }
        running_ = false;
        std::cout << "transport stopped\n";
        return Status::kOk;
    }

private:
    bool running_;
};

class CallbackRegistration {
public:
    explicit CallbackRegistration(FakeTransport& transport) noexcept
        : transport_{&transport}, active_{true} {
        std::cout << "callback registered\n";
    }

    CallbackRegistration(const CallbackRegistration&) = delete;
    CallbackRegistration& operator=(const CallbackRegistration&) = delete;

    ~CallbackRegistration() noexcept {
        Reset();
    }

    void Reset() noexcept {
        if (active_) {
            transport_->UnregisterCallback();
            active_ = false;
            transport_ = nullptr;
        }
    }

private:
    FakeTransport* transport_;  // Borrow; FakeTransport must outlive this token.
    bool active_;
};

class ModemService {
public:
    ModemService() noexcept
        : transport_{}, callback_{transport_} {}

    ModemService(const ModemService&) = delete;
    ModemService& operator=(const ModemService&) = delete;

    [[nodiscard]] Status Stop(std::uint32_t timeout_ms) noexcept {
        callback_.Reset();
        return transport_.Stop(timeout_ms);
    }

private:
    // Declaration order is the lifetime contract:
    // transport is constructed first and destroyed last.
    FakeTransport transport_;
    CallbackRegistration callback_;
};

int main() {
    std::cout << "=== explicit shutdown and retry ===\n";
    {
        ModemService service;
        const Status first = service.Stop(2U);
        assert(first == Status::kTimeout);
        std::cout << "first Stop: timeout\n";

        const Status second = service.Stop(20U);
        assert(second == Status::kOk);
        std::cout << "second Stop: ok\n";
    }

    std::cout << "=== destructor fallback ===\n";
    {
        ModemService service;
        // Deliberately omit Stop(): member RAII still unregisters first,
        // then the transport performs only its bounded fallback.
    }

    std::cout << "all teardown assertions passed\n";
    return 0;
}
