#include <array>
#include <chrono>
#include <cstddef>
#include <iostream>
#include <span>

enum class Status { kOk, kInvalidInput, kTimeout };

class ITransport {
public:
    virtual ~ITransport() = default;
    virtual Status Write(std::span<const std::byte> data,
                         std::chrono::milliseconds timeout) = 0;
};

class FakeTransport final : public ITransport {
public:
    Status Write(std::span<const std::byte> data,
                 std::chrono::milliseconds timeout) override {
        std::cout << "transport bytes=" << data.size()
                  << " timeout_ms=" << timeout.count() << '\n';
        return timeout.count() <= 0 ? Status::kTimeout : Status::kOk;
    }
};

class CommandSender {
public:
    explicit CommandSender(ITransport& transport) : transport_(transport) {}

    Status Send(std::span<const std::byte> command,
                std::chrono::milliseconds timeout) {
        if (command.empty() || command.size() > kMaxCommandBytes) {
            return Status::kInvalidInput;
        }
        return transport_.Write(command, timeout);
    }

private:
    static constexpr std::size_t kMaxCommandBytes{16};
    ITransport& transport_;
};

int main() {
    FakeTransport transport;
    CommandSender sender{transport};
    const std::array command{std::byte{0x41}, std::byte{0x54},
                             std::byte{0x0D}};
    const auto status = sender.Send(command, std::chrono::milliseconds{100});
    std::cout << "status=" << static_cast<int>(status) << '\n';
    return status == Status::kOk ? 0 : 1;
}
