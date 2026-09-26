// Day 17 lab: error handling, assert, and clear control flow.
//
// A fake temperature-sensor driver with no exceptions and no dynamic
// allocation. Demonstrates:
//   - strong error types (enum class) instead of int codes,
//   - [[nodiscard]] as a contract on the caller,
//   - early return keeping the happy path flat,
//   - assert used ONLY for internal invariants, never for runtime errors.
//
// Build:
//   g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic main.cpp -o day017

#include <array>
#include <cassert>
#include <chrono>
#include <cstddef>
#include <cstdint>
#include <format>
#include <iostream>
#include <span>

namespace {

constexpr std::uint8_t kSensorAddress = 0x48;

enum class SensorError {
  kOk,
  kTimeout,
  kCrcMismatch,
};

const char* ToString(SensorError error) {
  switch (error) {
    case SensorError::kOk:
      return "ok";
    case SensorError::kTimeout:
      return "timeout";
    case SensorError::kCrcMismatch:
      return "crc mismatch";
  }
  return "unknown";  // Unreachable; keeps -Wreturn-type quiet.
}

// Fake hardware: canned frames, one transfer times out.
[[nodiscard]] bool I2cRead(std::uint8_t address,
                           std::span<std::uint8_t> out,
                           std::chrono::milliseconds timeout) noexcept {
  assert(!out.empty() && "I2cRead with empty buffer is a bug");
  assert(timeout.count() > 0 && "I2cRead with non-positive timeout is a bug");
  static_cast<void>(address);

  static unsigned call_count = 0;
  ++call_count;
  if (call_count == 2) {
    return false;  // This transfer times out: a recoverable runtime error.
  }

  // Canned frames: {whole degrees, hundredths, crc_lo, crc_hi}.
  constexpr std::array<std::array<std::uint8_t, 4>, 4> kFrames = {{
      {{23, 50, 0xA5, 0x5A}},
      {{0, 0, 0, 0}},  // Unreachable: call 2 times out.
      {{23, 75, 0xA5, 0x5A}},
      {{23, 99, 0xA5, 0x5A}},
  }};
  const unsigned index = call_count - 1;
  assert(index < kFrames.size() && "ran out of canned frames");
  for (std::size_t i = 0; i < out.size() && i < kFrames[index].size(); ++i) {
    out[i] = kFrames[index][i];
  }
  return true;
}

[[nodiscard]] bool CheckCrc(std::span<const std::uint8_t> frame) noexcept {
  assert(frame.size() >= 4 && "frame too short for CRC is a bug");
  static unsigned call_count = 0;
  ++call_count;
  return call_count != 3;  // The 3rd frame arrives corrupted.
}

[[nodiscard]] float Convert(std::span<const std::uint8_t> raw) noexcept {
  assert(raw.size() >= 2 && "need 2 bytes to convert is a bug");
  return static_cast<float>(raw[0]) + static_cast<float>(raw[1]) / 100.0f;
}

[[nodiscard]] SensorError ReadTemperature(
    float& out_temp,
    std::chrono::milliseconds timeout) noexcept {
  std::array<std::uint8_t, 4> raw{};
  if (!I2cRead(kSensorAddress, raw, timeout)) {
    return SensorError::kTimeout;
  }
  if (!CheckCrc(raw)) {
    return SensorError::kCrcMismatch;
  }
  out_temp = Convert(raw);
  return SensorError::kOk;
}

}  // namespace

int main() {
  using namespace std::chrono_literals;

  for (int read = 1; read <= 3; ++read) {
    float temp = 0.0f;
    SensorError err = ReadTemperature(temp, 100ms);
    if (err == SensorError::kTimeout) {
      std::cout << "read " << read << ": timeout, retrying...\n";
      err = ReadTemperature(temp, 100ms);  // One retry, then move on.
    }
    switch (err) {
      case SensorError::kOk:
        std::cout << "read " << read << ": ok, temp="
                  << std::format("{:.2f}", temp) << "\n";
        break;
      case SensorError::kTimeout:
        std::cout << "read " << read << ": " << ToString(err)
                  << " again, giving up\n";
        break;
      case SensorError::kCrcMismatch:
        std::cout << "read " << read << ": crc mismatch, discarding frame\n";
        break;
    }
  }
  return 0;
}
