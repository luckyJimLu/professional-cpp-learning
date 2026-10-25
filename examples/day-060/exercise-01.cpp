#include <iostream>
#include <memory>

class Worker;
class Service {
public:
    void Attach(std::shared_ptr<Worker> worker) { worker_ = std::move(worker); }
    ~Service() { std::cout << "Service destroyed\n"; }
private:
    std::shared_ptr<Worker> worker_;
};
class Worker {
public:
    void Attach(std::shared_ptr<Service> service) { service_ = std::move(service); }
    ~Worker() { std::cout << "Worker destroyed\n"; }
private:
    std::shared_ptr<Service> service_;
};
int main() {
    auto service = std::make_shared<Service>();
    auto worker = std::make_shared<Worker>();
    service->Attach(worker);
    worker->Attach(service);
    std::cout << "service owners=" << service.use_count()
              << " worker owners=" << worker.use_count() << '\n';
    std::cout << "Code review: destructors will not run because ownership forms a cycle.\n";
}
