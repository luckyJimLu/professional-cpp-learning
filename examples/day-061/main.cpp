#include <iostream>
#include <memory>
#include <string_view>
#include <utility>

class ModemSession : public std::enable_shared_from_this<ModemSession> {
public:
    explicit ModemSession(int id) noexcept : id_{id} {
        std::cout << "session " << id_ << " created\n";
    }

    ~ModemSession() {
        std::cout << "session " << id_ << " destroyed\n";
    }

    [[nodiscard]] auto MakeCallback() {
        std::weak_ptr<ModemSession> weak_self = weak_from_this();
        return [weak_self](std::string_view command) {
            if (const auto self = weak_self.lock()) {
                self->Send(command);
            } else {
                std::cout << "callback skipped: session expired\n";
            }
        };
    }

private:
    void Send(std::string_view command) const {
        std::cout << "session " << id_ << " send: " << command << '\n';
    }

    int id_{};
};

int main() {
    auto session = std::make_shared<ModemSession>(61);
    auto callback = session->MakeCallback();

    callback("AT+CSQ");
    session.reset();
    callback("AT+CREG?");

    return 0;
}
