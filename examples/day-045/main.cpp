#include <array>
#include <cassert>
#include <concepts>
#include <cstddef>
#include <utility>

enum class Status {
  kOk,
  kFull,
  kEmpty,
};

template <typename T, std::size_t Capacity>
class FixedQueue {
  static_assert(Capacity > 0U, "FixedQueue capacity must be positive");

public:
  [[nodiscard]] Status Push(const T& value) {
    if (size_ == Capacity) {
      return Status::kFull;
    }
    data_[tail_] = value;
    tail_ = (tail_ + 1U) % Capacity;
    ++size_;
    return Status::kOk;
  }

  [[nodiscard]] Status Push(T&& value) {
    if (size_ == Capacity) {
      return Status::kFull;
    }
    data_[tail_] = std::move(value);
    tail_ = (tail_ + 1U) % Capacity;
    ++size_;
    return Status::kOk;
  }

  [[nodiscard]] Status Pop(T& value) {
    if (size_ == 0U) {
      return Status::kEmpty;
    }
    value = std::move(data_[head_]);
    head_ = (head_ + 1U) % Capacity;
    --size_;
    return Status::kOk;
  }

  [[nodiscard]] std::size_t Size() const {
    return size_;
  }
  [[nodiscard]] constexpr std::size_t CapacityValue() const {
    return Capacity;
  }

private:
  std::array<T, Capacity> data_{};
  std::size_t head_{0U};
  std::size_t tail_{0U};
  std::size_t size_{0U};
};

template <typename Queue, typename T>
concept PopQueue = requires(Queue& queue, T& value) {
                     { queue.Pop(value) } -> std::same_as<Status>;
                   };

template <typename Queue, typename T>
  requires PopQueue<Queue, T>
std::size_t Drain(Queue& queue, T& last_value) {
  std::size_t count{0U};
  while (queue.Pop(last_value) == Status::kOk) {
    ++count;
  }
  return count;
}

int main() {
  FixedQueue<int, 3U> queue;

  assert(queue.Size() == 0U);
  assert(queue.CapacityValue() == 3U);
  assert(queue.Push(10) == Status::kOk);
  assert(queue.Push(20) == Status::kOk);
  assert(queue.Push(30) == Status::kOk);
  assert(queue.Push(40) == Status::kFull);

  int value{0};
  assert(queue.Pop(value) == Status::kOk);
  assert(value == 10);

  assert(queue.Push(40) == Status::kOk);

  const std::size_t drained = Drain<FixedQueue<int, 3U>, int>(queue, value);
  assert(drained == 3U);
  assert(value == 40);
  assert(queue.Pop(value) == Status::kEmpty);
}
