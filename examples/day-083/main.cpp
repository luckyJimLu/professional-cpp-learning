#include <atomic>
#include <iostream>
class Sensor {
public:
 explicit Sensor(int offset): offset_(offset) {}
 int Calibrate(int raw) const noexcept { ++read_count_; return raw+offset_; }
 static unsigned ReadCount() noexcept { return read_count_.load(); }
private: const int offset_; inline static std::atomic<unsigned> read_count_{0U};
};
int main(){ const Sensor a{3}; Sensor b{7}; std::cout<<"a="<<a.Calibrate(10)<<" b="<<b.Calibrate(10)<<" reads="<<Sensor::ReadCount()<<'\n'; }