// Host-side Armv7-M CFSR exercise. No target register access or frame dereference.
#include <array>
#include <cassert>
#include <cstdint>
#include <iostream>
#include <optional>

struct FaultSnapshot {
  std::uint32_t cfsr;
  std::uint32_t bfar;
  std::uint32_t mmfar;
};

struct FaultSummary {
  bool precise;
  bool imprecise;
  bool frame_unreliable;
  std::optional<std::uint32_t> bus_address;
  std::optional<std::uint32_t> memory_address;
};

[[nodiscard]] constexpr FaultSummary Decode(const FaultSnapshot& snapshot) {
  constexpr std::uint32_t kPrecise = 1U << 9U;
  constexpr std::uint32_t kImprecise = 1U << 10U;
  constexpr std::uint32_t kBfarValid = 1U << 15U;
  constexpr std::uint32_t kMmarValid = 1U << 7U;
  // MMFSR: MUNSTKERR/MSTKERR/MLSPERR; BFSR: UNSTKERR/STKERR/LSPERR.
  constexpr std::uint32_t kFrameError = 0x00003838U;
  return {
      (snapshot.cfsr & kPrecise) != 0U,
      (snapshot.cfsr & kImprecise) != 0U,
      (snapshot.cfsr & kFrameError) != 0U,
      (snapshot.cfsr & kBfarValid) != 0U
          ? std::optional{snapshot.bfar} : std::nullopt,
      (snapshot.cfsr & kMmarValid) != 0U
          ? std::optional{snapshot.mmfar} : std::nullopt,
  };
}

int main() {
  constexpr auto precise = Decode({0x8200U, 0x60000010U, 0U});
  static_assert(precise.precise && !precise.imprecise);
  static_assert(precise.bus_address == 0x60000010U);
  static_assert(!precise.memory_address.has_value());

  constexpr auto delayed = Decode({0x400U, 0xDEADBEEFU, 0U});
  static_assert(delayed.imprecise && !delayed.bus_address.has_value());
  constexpr auto zero = Decode({0U, 0xDEADBEEFU, 0x12345678U});
  static_assert(!zero.bus_address && !zero.memory_address);
  constexpr auto memory = Decode({0x80U, 0U, 0x20000004U});
  static_assert(memory.memory_address == 0x20000004U);
  constexpr auto both = Decode({0x8600U, 0x60000010U, 0U});
  static_assert(both.precise && both.imprecise && both.bus_address.has_value());
  for (const auto bit : std::array{3U, 4U, 5U, 11U, 12U, 13U}) {
    assert(Decode({1U << bit, 0U, 0U}).frame_unreliable);
  }
  std::cout << "precise: valid BFAR=0x" << std::hex << *precise.bus_address
            << "\nimprecise: BFAR unavailable\n"
            << "all decoder checks passed\n";
}
