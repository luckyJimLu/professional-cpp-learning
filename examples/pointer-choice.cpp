#include <cassert>
#include <functional>
#include <iostream>
#include <memory>
#include <optional>
#include <utility>
#include <vector>

struct Config {
  int timeout_ms = 1000;
  int retry_count = 3;
};

struct ITransport {
  virtual ~ITransport() = default;
  virtual void Send() = 0;
};

class TcpTransport final : public ITransport {
public:
  explicit TcpTransport(int& destruction_count) : destruction_count_(destruction_count) {}
  ~TcpTransport() override {
    ++destruction_count_;
    std::cout << "TcpTransport destroyed\n";
  }
  void Send() override {
    std::cout << "TCP send\n";
  }

private:
  int& destruction_count_;  // Test counter outlives the transport.
};

class OwnedService {
public:
  [[nodiscard]] static std::optional<OwnedService> Create(std::unique_ptr<ITransport> transport) {
    if (!transport) return std::nullopt;
    return OwnedService(std::move(transport));
  }
  void Send() {
    transport_->Send();
  }

private:
  explicit OwnedService(std::unique_ptr<ITransport> transport) : transport_(std::move(transport)) {}

  Config config_{};                        // Q1: Store simple configuration by value.
  std::unique_ptr<ITransport> transport_;  // Q2: This service owns it.
};

class BorrowedService {
public:
  explicit BorrowedService(ITransport& transport) : transport_(transport) {}
  void Send() {
    transport_.Send();
  }

private:
  ITransport& transport_;  // Q2: Application owns it; do not delete.
};

class Session {
public:
  Session(int& handled_count, int& destruction_count)
      : handled_count_(handled_count), destruction_count_(destruction_count) {}
  ~Session() {
    ++destruction_count_;
    std::cout << "Session destroyed\n";
  }
  void Handle() {
    ++handled_count_;
    std::cout << "Session handled\n";
  }

private:
  int& handled_count_;
  int& destruction_count_;
};

// Single-threaded deferred queue, not a production concurrent executor.
// Tasks are destroyed after RunAll; an executor retaining callbacks would
// also retain shared_ptr captures until those callbacks are released.
class Executor {
public:
  void Post(std::function<void()> task) {
    tasks_.push_back(std::move(task));
  }
  void RunAll() {
    auto pending = std::move(tasks_);
    tasks_.clear();
    for (auto& task : pending) {
      task();
    }
  }

private:
  std::vector<std::function<void()>> tasks_;
};

void CheckExclusiveOwnership() {
  int destroyed = 0;
  {
    auto transport = std::make_unique<TcpTransport>(destroyed);
    auto service = OwnedService::Create(std::move(transport));
    assert(service.has_value());
    assert(!transport);
    service->Send();
    assert(destroyed == 0);
  }
  assert(destroyed == 1);

  assert(!OwnedService::Create(nullptr));
}

void CheckBorrowing() {
  int destroyed = 0;
  {
    TcpTransport transport(destroyed);
    {
      BorrowedService service(transport);
      service.Send();
    }
    assert(destroyed == 0);
    transport.Send();  // Still alive after borrower destruction.
  }
  assert(destroyed == 1);
}

void CheckStrongCapture() {
  int handled = 0;
  int destroyed = 0;
  Executor executor;
  auto session = std::make_shared<Session>(handled, destroyed);
  std::weak_ptr<Session> observer = session;
  executor.Post([session] { session->Handle(); });
  session.reset();
  assert(!observer.expired());
  assert(destroyed == 0);
  executor.RunAll();
  assert(handled == 1);
  assert(destroyed == 1);
  assert(observer.expired());
}

void CheckWeakCaptureExpired() {
  int handled = 0;
  int destroyed = 0;
  int skipped = 0;
  Executor executor;
  auto session = std::make_shared<Session>(handled, destroyed);
  std::weak_ptr<Session> weak = session;
  executor.Post([weak, &skipped] {
    if (auto alive = weak.lock()) {
      alive->Handle();
    } else {
      ++skipped;
    }
  });
  session.reset();
  assert(destroyed == 1);
  executor.RunAll();
  assert(handled == 0);
  assert(skipped == 1);
}

void CheckWeakCaptureAlive() {
  int handled = 0;
  int destroyed = 0;
  Executor executor;
  auto session = std::make_shared<Session>(handled, destroyed);
  std::weak_ptr<Session> weak = session;
  executor.Post([weak] {
    if (auto alive = weak.lock()) {
      alive->Handle();
    }
  });
  executor.RunAll();
  assert(handled == 1);
  assert(destroyed == 0);
  session.reset();
  assert(destroyed == 1);
}

int main() {
  CheckExclusiveOwnership();
  CheckBorrowing();
  CheckStrongCapture();
  CheckWeakCaptureExpired();
  CheckWeakCaptureAlive();
  std::cout << "All ownership checks passed\n";
}
