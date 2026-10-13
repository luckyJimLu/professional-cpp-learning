#!/usr/bin/env bash
set -euo pipefail
build_dir=$(mktemp -d)
trap 'rm -rf "$build_dir"' EXIT
"${CXX:-g++}" -std=c++20 -Wall -Wextra -Werror -pedantic -pthread \
  'content/33. Cpp System Architecture/examples/bounded_thread_pool.cpp' \
  -o "$build_dir/bounded-thread-pool"
timeout 20s "$build_dir/bounded-thread-pool"

for example in asio_contracts coroutine_echo; do
  "${CXX:-g++}" -std=c++20 -Wall -Wextra -Werror -pedantic -pthread \
    "content/34. Boost Asio Deep Dive/examples/$example.cpp" \
    -o "$build_dir/$example"
done
timeout 20s "$build_dir/asio_contracts"
timeout 25s python3 'content/34. Boost Asio Deep Dive/examples/check_echo.py' "$build_dir/coroutine_echo"
