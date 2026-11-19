#include <cstddef>
#include <iostream>
#include <memory>
class Buffer {
public:
 explicit Buffer(std::size_t n): data_(std::make_unique<int[]>(n)), size_(n) {}
 Buffer(const Buffer&)=delete;
 Buffer& operator=(const Buffer&)=delete;
 bool Set(std::size_t i,int v) noexcept { if(i>=size_) return false; data_[i]=v; return true; }
 int Sum() const noexcept { int s=0; for(std::size_t i=0;i<size_;++i) s+=data_[i]; return s; }
private: std::unique_ptr<int[]> data_; std::size_t size_;
};
int main(){ Buffer b{4U}; const bool ok=b.Set(2U,7); std::cout<<"set="<<ok<<" sum="<<b.Sum()<<'\n'; }