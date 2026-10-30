#include <iostream>
#include <memory>
#include <string_view>

class ModemSession {
public:
  explicit ModemSession(int id) noexcept : id_{id} {
    std::cout << "session " << id_ << " created\n";
  }
  ~ModemSession() {
    std::cout << "session " << id_ << " destroyed\n";
  }
  void Send(std::string_view command) const {
    std::cout << "session " << id_ << " send: " << command << '\n';
  }

private:
  int id_{};
};

class DiagnosticsView {
public:
  explicit DiagnosticsView(std::weak_ptr<ModemSession> session) noexcept
      : session_{std::move(session)} {}
  void Poll() const {
    if (const auto session = session_.lock()) {
      session->Send("AT+CSQ");
    } else {
      std::cout << "session unavailable\n";
    }
  }

private:
  std::weak_ptr<ModemSession> session_;
};

int main() {
  auto owner = std::make_shared<ModemSession>(7);
  DiagnosticsView diagnostics{owner};
  std::cout << "owners=" << owner.use_count() << '\n';
  diagnostics.Poll();
  owner.reset();
  diagnostics.Poll();
}
