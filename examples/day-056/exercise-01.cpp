#include <cstddef>
#include <iostream>

class PacketBuffer {
public:
  explicit PacketBuffer(std::size_t size) : size_{size}, data_{new unsigned char[size]} {}
  ~PacketBuffer() {
    delete[] data_;
  }

  unsigned char* Data() noexcept {
    return data_;
  }
  std::size_t Size() const noexcept {
    return size_;
  }

private:
  std::size_t size_{};
  unsigned char* data_{};
};

int main() {
  PacketBuffer packet{32};
  packet.Data()[0] = 7U;
  std::cout << "packet bytes=" << packet.Size()
            << " first=" << static_cast<unsigned int>(packet.Data()[0]) << '\n';
  std::cout << "Code review: copying PacketBuffer would duplicate the owning pointer.\n";
}
