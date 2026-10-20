#include <chrono>
#include <cstddef>
#include <iostream>
#include <span>
#include <vector>

enum class Status { kOk, kInvalidInput, kTransportError };

class ModemClient {
public:
    Status Send(const std::byte* data, std::size_t length,
                int timeout_ms, bool retry) {
        if (data == nullptr || length == 0U || timeout_ms <= 0) {
            return Status::kInvalidInput;
        }

        std::vector<std::byte> copy(data, data + length);
        std::cout << "send bytes=" << copy.size()
                  << " timeout_ms=" << timeout_ms
                  << " retry=" << retry << '\n';
        return Status::kOk;
    }
};

int main() {
    ModemClient client;
    const std::byte command[]{std::byte{0x41}, std::byte{0x54}};
    const auto status = client.Send(command, 2U, 100, true);
    std::cout << "status=" << static_cast<int>(status) << '\n';
    return status == Status::kOk ? 0 : 1;
}
