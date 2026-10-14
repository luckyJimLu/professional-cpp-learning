/**
 * 内置的 visualizer.h 头文件源码
 * 当读者在 Web 端编写 #include "visualizer.h" 时，
 * 编译前置处理器将自动解析并内联该头文件，保证在浏览器 Wasm 编译沙箱中 100% 成功编译。
 */
export const VISUALIZER_HEADER_SOURCE = `#pragma once

#include <iostream>
#include <cstdlib>
#include <cstddef>
#include <memory>
#include <string>
#include <utility>

namespace vis {
namespace detail {

inline bool& in_visualizer() {
    static thread_local bool flag = false;
    return flag;
}

class ScopeGuard {
public:
    ScopeGuard(const char* name, int line) : name_(name), line_(line) {
        std::cout << "[VIS]{\\"op\\":\\"scope_enter\\",\\"line\\":" << line_ 
                  << ",\\"name\\":\\"" << name_ << "\\"}" << std::endl;
    }
    ~ScopeGuard() {
        std::cout << "[VIS]{\\"op\\":\\"scope_exit\\",\\"name\\":\\"" << name_ << "\\"}" << std::endl;
    }
private:
    const char* name_;
    int line_;
};

} // namespace detail

inline void step(int line, const char* label = "") {
    std::cout << "[VIS]{\\"op\\":\\"step\\",\\"line\\":" << line;
    if (label && *label) {
        std::cout << ",\\"label\\":\\"" << label << "\\"";
    }
    std::cout << "}" << std::endl;
}

template <typename T>
inline void track_var(const char* name, const char* type_name, const T& val, int line, const void* addr = nullptr) {
    std::cout << "[VIS]{\\"op\\":\\"var_decl\\",\\"line\\":" << line
              << ",\\"name\\":\\"" << name << "\\""
              << ",\\"type\\":\\"" << type_name << "\\""
              << ",\\"value\\":\\"" << val << "\\"";
    if (addr) {
        std::cout << ",\\"addr\\":\\"" << addr << "\\"";
    }
    std::cout << "}" << std::endl;
}

class LifetimeTracker {
public:
    LifetimeTracker(const char* name, const char* type_name, int line, const void* addr = nullptr)
        : name_(name), line_(line) {
        std::cout << "[VIS]{\\"op\\":\\"obj_ctor\\",\\"line\\":" << line_
                  << ",\\"id\\":\\"" << name_ << "\\""
                  << ",\\"type\\":\\"" << type_name << "\\"";
        if (addr) {
            std::cout << ",\\"addr\\":\\"" << addr << "\\"";
        }
        std::cout << "}" << std::endl;
    }

    ~LifetimeTracker() {
        std::cout << "[VIS]{\\"op\\":\\"obj_dtor\\",\\"line\\":" << line_
                  << ",\\"id\\":\\"" << name_ << "\\"}" << std::endl;
    }

private:
    std::string name_;
    int line_;
};

template <typename T>
class unique_ptr {
public:
    unique_ptr() : ptr_(nullptr), var_name_(""), line_(0) {}

    unique_ptr(T* p, const char* var_name, int line) 
        : ptr_(p), var_name_(var_name), line_(line) {
        emit_ptr_set();
    }

    ~unique_ptr() {
        if (ptr_) {
            delete ptr_;
            ptr_ = nullptr;
        }
    }

    unique_ptr(const unique_ptr&) = delete;
    unique_ptr& operator=(const unique_ptr&) = delete;

    unique_ptr(unique_ptr&& other) noexcept 
        : ptr_(other.ptr_), var_name_(""), line_(other.line_) {
        std::cout << "[VIS]{\\"op\\":\\"ptr_move\\",\\"line\\":" << line_
                  << ",\\"from\\":\\"" << other.var_name_ << "\\""
                  << ",\\"toVar\\":\\"" << var_name_ << "\\""
                  << ",\\"addr\\":\\"" << static_cast<const void*>(ptr_) << "\\"}" << std::endl;
        other.ptr_ = nullptr;
    }

    void bind_name(const char* name, int line) {
        var_name_ = name;
        line_ = line;
        emit_ptr_set();
    }

    T* get() const noexcept { return ptr_; }
    T& operator*() const { return *ptr_; }
    T* operator->() const noexcept { return ptr_; }
    explicit operator bool() const noexcept { return ptr_ != nullptr; }

    void reset(T* p = nullptr) {
        if (ptr_ != p) {
            delete ptr_;
            ptr_ = p;
            emit_ptr_set();
        }
    }

private:
    void emit_ptr_set() {
        std::cout << "[VIS]{\\"op\\":\\"ptr_set\\",\\"line\\":" << line_
                  << ",\\"var\\":\\"" << var_name_ << "\\"";
        if (ptr_) {
            std::cout << ",\\"to\\":\\"" << static_cast<const void*>(ptr_) << "\\"";
        } else {
            std::cout << ",\\"to\\":null";
        }
        std::cout << ",\\"isSmart\\":true}" << std::endl;
    }

    T* ptr_;
    std::string var_name_;
    int line_;
};

} // namespace vis

#define VIS_SCOPE(name) ::vis::detail::ScopeGuard _vis_scope_##__LINE__(name, __LINE__)
#define VIS_STEP() ::vis::step(__LINE__)
#define VIS_STEP_L(label) ::vis::step(__LINE__, label)
#define VIS_TRACK(var, type) ::vis::LifetimeTracker _vis_tracker_##var(#var, #type, __LINE__, &var)
#define VIS_PTR(var, val) \\
    std::cout << "[VIS]{\\"op\\":\\"ptr_set\\",\\"line\\":" << __LINE__ \\
              << ",\\"var\\":\\"" #var "\\",\\"to\\":\\"" << static_cast<const void*>(val) << "\\"}" << std::endl

#ifndef VIS_NO_GLOBAL_NEW_DELETE
inline void* operator new(std::size_t size) {
    void* ptr = std::malloc(size);
    if (!ptr) throw std::bad_alloc();
    if (!vis::detail::in_visualizer()) {
        vis::detail::in_visualizer() = true;
        std::cout << "[VIS]{\\"op\\":\\"heap_alloc\\",\\"line\\":0,\\"addr\\":\\"" << ptr 
                  << "\\",\\"size\\":" << size << "}" << std::endl;
        vis::detail::in_visualizer() = false;
    }
    return ptr;
}

inline void operator delete(void* ptr) noexcept {
    if (!ptr) return;
    if (!vis::detail::in_visualizer()) {
        vis::detail::in_visualizer() = true;
        std::cout << "[VIS]{\\"op\\":\\"heap_free\\",\\"line\\":0,\\"addr\\":\\"" << ptr << "\\"}" << std::endl;
        vis::detail::in_visualizer() = false;
    }
    std::free(ptr);
}

inline void operator delete(void* ptr, std::size_t) noexcept {
    ::operator delete(ptr);
}
#endif
`;

/**
 * 前置预处理 C++ 代码：如果包含 #include "visualizer.h"，内联注入头文件源码
 */
export function preprocessCppCode(source: string): string {
  const includePattern = /#include\s+["<]visualizer\.h[">]/;
  if (!includePattern.test(source)) {
    return source;
  }
  // 用内联源码替换掉 #include 行
  return source.replace(includePattern, `// --- Begin Builtin visualizer.h ---\n${VISUALIZER_HEADER_SOURCE}\n// --- End Builtin visualizer.h ---`);
}
