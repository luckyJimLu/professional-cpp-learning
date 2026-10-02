cmake_minimum_required(VERSION 3.20)
project(asio_framework_examples CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

include(FetchContent)

# 优先查找本地同级 asio 仓库头文件，未检测到则通过 FetchContent 自动下载
find_path(LOCAL_ASIO_INCLUDE asio.hpp
  PATHS
    "${CMAKE_CURRENT_SOURCE_DIR}/../../../../asio/include"
    "${CMAKE_CURRENT_SOURCE_DIR}/../../../asio/include"
    "/home/lujingjing/Project/asio/include"
)

if(LOCAL_ASIO_INCLUDE)
  message(STATUS "Using local standalone Asio headers from: ${LOCAL_ASIO_INCLUDE}")
  add_library(asio_headers INTERFACE)
  target_include_directories(asio_headers INTERFACE ${LOCAL_ASIO_INCLUDE})
  target_compile_definitions(asio_headers INTERFACE ASIO_STANDALONE)
else()
  message(STATUS "Local Asio not found, fetching standalone Asio from GitHub...")
  FetchContent_Declare(
    asio
    GIT_REPOSITORY https://github.com/chriskohlhoff/asio.git
    GIT_TAG asio-1-30-2
    GIT_SHALLOW TRUE
  )
  FetchContent_MakeAvailable(asio)
  add_library(asio_headers INTERFACE)
  target_include_directories(asio_headers INTERFACE ${asio_SOURCE_DIR}/asio/include)
  target_compile_definitions(asio_headers INTERFACE ASIO_STANDALONE)
endif()

find_package(Threads REQUIRED)

# 01: 同步阻塞 TCP Echo 服务器
add_executable(01_sync_tcp_echo 01_sync_tcp_echo.cpp)
target_link_libraries(01_sync_tcp_echo PRIVATE asio_headers Threads::Threads)

# 02: 异步标准会话生命周期管理 TCP Echo 服务器 (enable_shared_from_this 典范)
add_executable(02_async_tcp_echo 02_async_tcp_echo.cpp)
target_link_libraries(02_async_tcp_echo PRIVATE asio_headers Threads::Threads)

# 03: C++20 协程风格 TCP Echo 服务器 (co_await / use_awaitable)
add_executable(03_coroutine_echo 03_coroutine_echo.cpp)
target_link_libraries(03_coroutine_echo PRIVATE asio_headers Threads::Threads)
