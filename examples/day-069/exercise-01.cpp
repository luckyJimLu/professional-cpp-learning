#include <cstdint>
#include <iostream>

enum class Status {
    kOk,
    kInvalidArgument
};

[[nodiscard]] constexpr const char* ToString(Status status) noexcept {
    switch (status) {
        case Status::kOk:
            return "ok";
        case Status::kInvalidArgument:
            return "invalid argument";
    }
    return "unknown";
}

class ModemSession {
public:
    ModemSession(std::uint32_t timeout_ms, std::uint8_t retry_count) noexcept {
        timeout_ms_ = timeout_ms;
        retry_count_ = retry_count;
    }

    [[nodiscard]] Status Connect() const noexcept {
        if (timeout_ms_ == 0U || retry_count_ > kMaxRetryCount) {
            return Status::kInvalidArgument;
        }
        return Status::kOk;
    }

    [[nodiscard]] std::uint32_t timeout_ms() const noexcept {
        return timeout_ms_;
    }

    [[nodiscard]] std::uint8_t retry_count() const noexcept {
        return retry_count_;
    }

private:
    static constexpr std::uint8_t kMaxRetryCount{5U};

    std::uint32_t timeout_ms_{1'000U};
    std::uint8_t retry_count_{3U};
};

int main() {
    ModemSession session{0U, 9U};

    std::cout << "constructed session: timeout=" << session.timeout_ms()
              << "ms, retries=" << static_cast<unsigned int>(session.retry_count())
              << '\n';
    std::cout << "connect: " << ToString(session.Connect()) << '\n';

    return session.Connect() == Status::kInvalidArgument ? 0 : 1;
}
