#pragma once

#include <iostream>
#include <cstdlib>
#include <cstddef>
#include <memory>
#include <string>
#include <utility>

namespace vis {
namespace detail {

// 内部防重入标志，避免在打印日志时（如果触发了分配）引起死递归
inline bool& in_visualizer() {
    static thread_local bool flag = false;
    return flag;
}

// 格式化输出 [VIS] JSON
inline void emit_raw(const std::string& json_payload) {
    std::cout << "[VIS]" << json_payload << std::endl;
}

// 作用域守卫 RAII
class ScopeGuard {
public:
    ScopeGuard(const char* name, int line) : name_(name), line_(line) {
        std::cout << "[VIS]{\"op\":\"scope_enter\",\"line\":" << line_ 
                  << ",\"name\":\"" << name_ << "\"}" << std::endl;
    }
    ~ScopeGuard() {
        std::cout << "[VIS]{\"op\":\"scope_exit\",\"name\":\"" << name_ << "\"}" << std::endl;
    }
private:
    const char* name_;
    int line_;
};

} // namespace detail

// 步进打点
inline void step(int line, const char* label = "") {
    std::cout << "[VIS]{\"op\":\"step\",\"line\":" << line;
    if (label && *label) {
        std::cout << ",\"label\":\"" << label << "\"";
    }
    std::cout << "}" << std::endl;
}

// 变量声明与追踪
template <typename T>
inline void track_var(const char* name, const char* type_name, const T& val, int line, const void* addr = nullptr) {
    std::cout << "[VIS]{\"op\":\"var_decl\",\"line\":" << line
              << ",\"name\":\"" << name << "\""
              << ",\"type\":\"" << type_name << "\""
              << ",\"value\":\"" << val << "\"";
    if (addr) {
        std::cout << ",\"addr\":\"" << addr << "\"";
    }
    std::cout << "}" << std::endl;
}

// 构造与析构生命周期守卫
class LifetimeTracker {
public:
    LifetimeTracker(const char* name, const char* type_name, int line, const void* addr = nullptr)
        : name_(name), line_(line) {
        std::cout << "[VIS]{\"op\":\"obj_ctor\",\"line\":" << line_
                  << ",\"id\":\"" << name_ << "\""
                  << ",\"type\":\"" << type_name << "\"";
        if (addr) {
            std::cout << ",\"addr\":\"" << addr << "\"";
        }
        std::cout << "}" << std::endl;
    }

    ~LifetimeTracker() {
        std::cout << "[VIS]{\"op\":\"obj_dtor\",\"line\":" << line_
                  << ",\"id\":\"" << name_ << "\"}" << std::endl;
    }

private:
    std::string name_;
    int line_;
};

// ========================================================
// 智能指针薄包装 vis::unique_ptr
// ========================================================
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

    // 禁止拷贝
    unique_ptr(const unique_ptr&) = delete;
    unique_ptr& operator=(const unique_ptr&) = delete;

    // 移动构造
    unique_ptr(unique_ptr&& other) noexcept 
        : ptr_(other.ptr_), var_name_(""), line_(other.line_) {
        std::cout << "[VIS]{\"op\":\"ptr_move\",\"line\":" << line_
                  << ",\"from\":\"" << other.var_name_ << "\""
                  << ",\"toVar\":\"" << var_name_ << "\""
                  << ",\"addr\":\"" << static_cast<const void*>(ptr_) << "\"}" << std::endl;
        other.ptr_ = nullptr;
    }

    // 移动并重命名（为了在宏中捕获目标变量名）
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
        std::cout << "[VIS]{\"op\":\"ptr_set\",\"line\":" << line_
                  << ",\"var\":\"" << var_name_ << "\"";
        if (ptr_) {
            std::cout << ",\"to\":\"" << static_cast<const void*>(ptr_) << "\"";
        } else {
            std::cout << ",\"to\":null";
        }
        std::cout << ",\"isSmart\":true}" << std::endl;
    }

    T* ptr_;
    std::string var_name_;
    int line_;
};

} // namespace vis

// 宏定义：作用域守卫
#define VIS_SCOPE(name) ::vis::detail::ScopeGuard _vis_scope_##__LINE__(name, __LINE__)

// 宏定义：单步指示
#define VIS_STEP() ::vis::step(__LINE__)
#define VIS_STEP_L(label) ::vis::step(__LINE__, label)

// 宏定义：追踪生命周期
#define VIS_TRACK(var, type) ::vis::LifetimeTracker _vis_tracker_##var(#var, #type, __LINE__, &var)

// 宏定义：堆分配与指针绑定
#define VIS_PTR(var, val) \
    std::cout << "[VIS]{\"op\":\"ptr_set\",\"line\":" << __LINE__ \
              << ",\"var\":\"" #var "\",\"to\":\"" << static_cast<const void*>(val) << "\"}" << std::endl

// 全局 operator new / operator delete 拦截（可捕获所有原生 new 与 delete）
#ifndef VIS_NO_GLOBAL_NEW_DELETE
inline void* operator new(std::size_t size) {
    void* ptr = std::malloc(size);
    if (!ptr) throw std::bad_alloc();
    if (!vis::detail::in_visualizer()) {
        vis::detail::in_visualizer() = true;
        std::cout << "[VIS]{\"op\":\"heap_alloc\",\"line\":0,\"addr\":\"" << ptr 
                  << "\",\"size\":" << size << "}" << std::endl;
        vis::detail::in_visualizer() = false;
    }
    return ptr;
}

inline void operator delete(void* ptr) noexcept {
    if (!ptr) return;
    if (!vis::detail::in_visualizer()) {
        vis::detail::in_visualizer() = true;
        std::cout << "[VIS]{\"op\":\"heap_free\",\"line\":0,\"addr\":\"" << ptr << "\"}" << std::endl;
        vis::detail::in_visualizer() = false;
    }
    std::free(ptr);
}

inline void operator delete(void* ptr, std::size_t) noexcept {
    ::operator delete(ptr);
}
#endif
