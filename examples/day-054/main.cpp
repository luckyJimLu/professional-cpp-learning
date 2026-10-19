#include <chrono>
#include <cstddef>
#include <iostream>
#include <span>

enum class Status { kOk, kTimeout, kTransportError };

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
        std::cout << "write bytes=" << data.size()
                  << " timeout_ms=" << timeout.count() << '\n';
        return data.empty() ? Status::kTransportError : Status::kOk;
    }
};

class PacketSender {
public:
    explicit PacketSender(ITransport& transport) : transport_(transport) {}

    Status Send(std::span<const std::byte> payload,
                std::chrono::milliseconds timeout) {
        if (payload.empty() || payload.size() > kMaxPayload) {
            return Status::kTransportError;
        }
        return transport_.Write(payload, timeout);
    }

private:
    static constexpr std::size_t kMaxPayload{64};
    ITransport& transport_;
};

int main() {
    FakeTransport transport;
    PacketSender sender{transport};
    const std::byte payload[]{std::byte{0x41}, std::byte{0x54}};
    const auto status = sender.Send(payload, std::chrono::milliseconds{100});
    std::cout << "status=" << static_cast<int>(status) << '\n';
    return status == Status::kOk ? 0 : 1;
}
