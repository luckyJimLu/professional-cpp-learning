#include <iostream>
class SensorReading {
public:
 explicit SensorReading(int v): value_(v) {}
 int Value() const noexcept { return value_; }
 void Set(int v) noexcept { value_=v; }
 int AverageWith(const SensorReading& other) const noexcept { return (value_+other.value_)/2; }
 static bool IsInRange(int v) noexcept { return v>=0 && v<=1000; }
private: int value_;
};
int main(){ const SensorReading a{40}; const SensorReading b{44}; std::cout<<"valid="<<SensorReading::IsInRange(a.Value())<<" average="<<a.AverageWith(b)<<'\n'; }