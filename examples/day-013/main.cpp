#include <cassert>
#include <chrono>
#include <cstdint>

using namespace std::chrono_literals;

enum class Status {
  kOk,
  kInvalidArgument,
};

enum class AttachMode {
  kAutomatic,
  kManual,
};

struct AttachOptions {
  AttachMode mode{AttachMode::kAutomatic};
  std::chrono::milliseconds timeout{5000ms};
  std::uint8_t retry_count{2};
};

class ModemSession {
public:
  Status Attach(const AttachOptions& options) {
    if (options.timeout <= 0ms) {
      return Status::kInvalidArgument;
    }
    options_ = options;
    return Status::kOk;
  }

private:
  AttachOptions options_{};
};

int main() {
  ModemSession modem;
  AttachOptions options;
  options.timeout = 3s;

  assert(modem.Attach(options) == Status::kOk);
}
