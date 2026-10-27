#include <iostream>
#include <memory>
#include <string_view>

struct ModemSession {
    int id{};
    int signal_dbm{-85};

    void Print() const {
        std::cout << "session=" << id << " signal=" << signal_dbm << " dBm\n";
    }
};

int main() {
    auto session = std::make_shared<ModemSession>(ModemSession{62, -73});

    // Aliasing shared_ptr: shares session's control block, but points at a subobject.
    std::shared_ptr<int> signal_view{session, &session->signal_dbm};

    std::cout << "owners before reset=" << session.use_count() << '\n';
    session.reset();

    // The alias keeps the complete ModemSession alive even though it points at signal_dbm.
    std::cout << "aliased signal=" << *signal_view << " dBm\n";
    std::cout << "owners after reset=" << signal_view.use_count() << '\n';
    return 0;
}
