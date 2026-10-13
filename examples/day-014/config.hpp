#ifndef MODEM_CONFIG_HPP
#define MODEM_CONFIG_HPP
#include <chrono>
namespace modem {
struct Config { std::chrono::milliseconds timeout{100}; };
}
#endif
