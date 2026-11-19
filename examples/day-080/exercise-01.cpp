#include <cstddef>
#include <iostream>
#include <memory>
#include <utility>
class DynamicBuffer {
public:
 explicit DynamicBuffer(std::size_t n) : data_(n ? std::make_unique<std::byte[]>(n) : nullptr), size_(n) {}
 DynamicBuffer(const DynamicBuffer&) = delete;
 DynamicBuffer& operator=(const DynamicBuffer&) = delete;
 DynamicBuffer(DynamicBuffer&&) noexcept = default;
 DynamicBuffer& operator=(DynamicBuffer&&) noexcept = default;
 std::size_t Size() const noexcept { return size_; }
 bool Write(std::size_t i, std::byte v) noexcept { if (i >= size_) return false; data_[i] = v; return true; }
 std::byte Read(std::size_t i) const noexcept { return i < size_ ? data_[i] : std::byte{0}; }
private: std::unique_ptr<std::byte[]> data_; std::size_t size_{0U};
};
int main() { DynamicBuffer rx{16U}; const bool ok=rx.Write(3U,std::byte{0x2AU}); std::cout<<"size="<<rx.Size()<<" wrote="<<ok<<" value="<<std::to_integer<int>(rx.Read(3U))<<'\n'; DynamicBuffer moved{std::move(rx)}; std::cout<<"moved_size="<<moved.Size()<<'\n'; }