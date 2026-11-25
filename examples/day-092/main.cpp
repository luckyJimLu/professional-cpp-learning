#include <array>
#include <chrono>
#include <cstddef>
#include <cstdint>
#include <iostream>
#include <span>
#include <type_traits>

using namespace std::chrono_literals;

enum class Status : std::uint8_t {
  kOk,
  kInvalidArgument,
  kTooLarge,
  kTimeout,
};

class TxPipeline {
 public:
  static constexpr std::size_t kMaxPayloadBytes = 8U;

  virtual ~TxPipeline() = default;

  [[nodiscard]] Status Send(std::span<const std::byte> payload,
                            std::chrono::milliseconds timeout) noexcept {
    if (payload.empty()) {
      return Status::kInvalidArgument;
    }
    if (payload.size() > kMaxPayloadBytes) {
      return Status::kTooLarge;
    }
    if (timeout <= 0ms) {
      return Status::kTimeout;
    }

    const Status status = DoSend(payload, timeout);
    if (status == Status::kOk) {
      OnAccepted(payload.size());
    }
    return status;
  }

 protected:
  [[nodiscard]] virtual Status DoSend(
      std::span<const std::byte> payload,
      std::chrono::milliseconds timeout) noexcept = 0;

  virtual void OnAccepted(std::size_t bytes) noexcept {
    (void)bytes;
  }
};

class DmaUartPipeline : public TxPipeline {
 public:
  [[nodiscard]] std::uint32_t HardwareWriteCount() const noexcept {
    return hardware_write_count_;
  }

  [[nodiscard]] std::uint32_t AcceptedCount() const noexcept {
    return accepted_count_;
  }

 protected:
  [[nodiscard]] Status DoSend(
      std::span<const std::byte> payload,
      std::chrono::milliseconds timeout) noexcept override final {
    (void)timeout;
    ++hardware_write_count_;
    std::cout << "dma-submit bytes=" << payload.size() << '\n';
    return Status::kOk;
  }

  void OnAccepted(std::size_t bytes) noexcept override {
    ++accepted_count_;
    std::cout << "accepted bytes=" << bytes << '\n';
  }

 private:
  std::uint32_t hardware_write_count_{0U};
  std::uint32_t accepted_count_{0U};
};

class InstrumentedDmaUartPipeline final : public DmaUartPipeline {
 public:
  [[nodiscard]] std::uint32_t TelemetryCount() const noexcept {
    return telemetry_count_;
  }

 protected:
  void OnAccepted(std::size_t bytes) noexcept override {
    DmaUartPipeline::OnAccepted(bytes);
    ++telemetry_count_;
    std::cout << "telemetry bytes=" << bytes << '\n';
  }

 private:
  std::uint32_t telemetry_count_{0U};
};

[[nodiscard]] const char* ToString(Status status) noexcept {
  switch (status) {
    case Status::kOk:
      return "ok";
    case Status::kInvalidArgument:
      return "invalid-argument";
    case Status::kTooLarge:
      return "too-large";
    case Status::kTimeout:
      return "timeout";
  }
  return "unknown";
}

static_assert(std::is_base_of_v<TxPipeline, DmaUartPipeline>);
static_assert(std::is_final_v<InstrumentedDmaUartPipeline>);
static_assert(!std::is_final_v<DmaUartPipeline>);

int main() {
  InstrumentedDmaUartPipeline pipeline;
  const std::array<std::byte, 4U> payload{
      std::byte{0x41U}, std::byte{0x54U}, std::byte{0x0DU}, std::byte{0x0AU}};
  const std::array<std::byte, 9U> oversized{};

  const Status ok = pipeline.Send(std::span<const std::byte>{payload}, 20ms);
  const Status empty = pipeline.Send(std::span<const std::byte>{}, 20ms);
  const Status too_large =
      pipeline.Send(std::span<const std::byte>{oversized}, 20ms);
  const Status timeout = pipeline.Send(std::span<const std::byte>{payload}, 0ms);

  std::cout << "ok=" << ToString(ok)
            << " empty=" << ToString(empty)
            << " oversized=" << ToString(too_large)
            << " timeout=" << ToString(timeout) << '\n';
  std::cout << "hardware_writes=" << pipeline.HardwareWriteCount()
            << " accepted=" << pipeline.AcceptedCount()
            << " telemetry=" << pipeline.TelemetryCount() << '\n';
  std::cout << std::boolalpha
            << "instrumented_leaf_is_final="
            << std::is_final_v<InstrumentedDmaUartPipeline> << '\n';

  if (ok != Status::kOk || empty != Status::kInvalidArgument ||
      too_large != Status::kTooLarge || timeout != Status::kTimeout ||
      pipeline.HardwareWriteCount() != 1U ||
      pipeline.AcceptedCount() != 1U || pipeline.TelemetryCount() != 1U) {
    std::cerr << "final / NVI contract check failed\n";
    return 1;
  }

  std::cout << "NVI keeps validation stable; final closes only the hardware hook\n";
  return 0;
}
