/**
 * 内置的 visualizer.h 头文件源码（与 include/visualizer.h 严格保持单一事实来源同步）
 * 当读者在 Web 端编写 #include "visualizer.h" 时，
 * 编译前置处理器将自动解析并内联该头文件，保证在浏览器 Wasm 编译沙箱中 100% 成功编译。
 */
export const VISUALIZER_HEADER_SOURCE = `#pragma once

#include <iostream>
#include <cstdlib>
#include <cstddef>
#include <memory>
#include <sstream>
#include <string>
#include <utility>

namespace vis {
namespace detail {

// 内部防重入标志，避免在打印日志时（如果触发了分配）引起死递归
inline bool& in_visualizer() {
    static thread_local bool flag = false;
    return flag;
}

// 追踪最近一次执行的源码行号，用于析构函数与全局 new/delete 的行号回退
inline int& last_line() {
    static thread_local int line = 1;
    return line;
}

// 安全转义 JSON 字符串，防止特殊字符破坏 [VIS] 协议载荷
inline std::string escape_json(const std::string& input) {
    std::string out;
    out.reserve(input.size() + 8);
    for (char c : input) {
        switch (c) {
            case '"':  out += "\\\\\\""; break;
            case '\\\\': out += "\\\\\\\\"; break;
            case '\\n': out += "\\\\n"; break;
            case '\\r': out += "\\\\r"; break;
            case '\\t': out += "\\\\t"; break;
            default:   out += c; break;
        }
    }
    return out;
}

template <typename T>
inline std::string to_escaped_string(const T& val) {
    std::ostringstream oss;
    oss << val;
    return escape_json(oss.str());
}

// 格式化输出 [VIS] JSON
inline void emit_raw(const std::string& json_payload) {
    bool prev = in_visualizer();
    in_visualizer() = true;
    std::cout << "[VIS]" << json_payload << std::endl;
    in_visualizer() = prev;
}

// 作用域守卫 RAII
class ScopeGuard {
public:
    ScopeGuard(const char* name, int line) : name_(name ? name : "scope"), line_(line) {
        last_line() = line_;
        bool prev = in_visualizer();
        in_visualizer() = true;
        std::cout << "[VIS]{\\"op\\":\\"scope_enter\\",\\"line\\":" << line_
                  << ",\\"name\\":\\"" << escape_json(name_) << "\\"}" << std::endl;
        in_visualizer() = prev;
    }
    ~ScopeGuard() {
        bool prev = in_visualizer();
        in_visualizer() = true;
        std::cout << "[VIS]{\\"op\\":\\"scope_exit\\",\\"line\\":" << last_line()
                  << ",\\"name\\":\\"" << escape_json(name_) << "\\"}" << std::endl;
        in_visualizer() = prev;
    }
private:
    std::string name_;
    int line_;
};

} // namespace detail

// 步进打点
inline void step(int line, const char* label = "") {
    detail::last_line() = line;
    bool prev = detail::in_visualizer();
    detail::in_visualizer() = true;
    std::cout << "[VIS]{\\"op\\":\\"step\\",\\"line\\":" << line;
    if (label && *label) {
        std::cout << ",\\"label\\":\\"" << detail::escape_json(label) << "\\"";
    }
    std::cout << "}" << std::endl;
    detail::in_visualizer() = prev;
}

// 变量声明与追踪
template <typename T>
inline void track_var(const char* name, const char* type_name, const T& val, int line, const void* addr = nullptr) {
    detail::last_line() = line;
    std::string val_str = detail::to_escaped_string(val);
    bool prev = detail::in_visualizer();
    detail::in_visualizer() = true;
    std::cout << "[VIS]{\\"op\\":\\"var_decl\\",\\"line\\":" << line
              << ",\\"name\\":\\"" << detail::escape_json(name ? name : "var") << "\\""
              << ",\\"type\\":\\"" << detail::escape_json(type_name ? type_name : "auto") << "\\""
              << ",\\"value\\":\\"" << val_str << "\\"";
    if (addr) {
        std::cout << ",\\"addr\\":\\"" << addr << "\\"";
    }
    std::cout << "}" << std::endl;
    detail::in_visualizer() = prev;
}

// 堆块字段更新追踪（例如链表节点 curr->next = prev）
template <typename T>
inline void track_field(const void* addr, const char* field, const T& val, int line) {
    detail::last_line() = line;
    std::string val_str = detail::to_escaped_string(val);
    bool prev = detail::in_visualizer();
    detail::in_visualizer() = true;
    std::cout << "[VIS]{\\"op\\":\\"heap_field_set\\",\\"line\\":" << line
              << ",\\"addr\\":\\"" << addr << "\\""
              << ",\\"field\\":\\"" << detail::escape_json(field ? field : "field") << "\\""
              << ",\\"value\\":\\"" << val_str << "\\"}" << std::endl;
    detail::in_visualizer() = prev;
}

// 构造与析构生命周期守卫
class LifetimeTracker {
public:
    LifetimeTracker(const char* name, const char* type_name, int line, const void* addr = nullptr)
        : name_(name ? name : "obj"), line_(line) {
        detail::last_line() = line_;
        bool prev = detail::in_visualizer();
        detail::in_visualizer() = true;
        std::cout << "[VIS]{\\"op\\":\\"obj_ctor\\",\\"line\\":" << line_
                  << ",\\"id\\":\\"" << detail::escape_json(name_) << "\\""
                  << ",\\"type\\":\\"" << detail::escape_json(type_name ? type_name : "Object") << "\\"";
        if (addr) {
            std::cout << ",\\"addr\\":\\"" << addr << "\\"";
        }
        std::cout << "}" << std::endl;
        detail::in_visualizer() = prev;
    }

    ~LifetimeTracker() {
        bool prev = detail::in_visualizer();
        detail::in_visualizer() = true;
        std::cout << "[VIS]{\\"op\\":\\"obj_dtor\\",\\"line\\":" << detail::last_line()
                  << ",\\"id\\":\\"" << detail::escape_json(name_) << "\\"}" << std::endl;
        detail::in_visualizer() = prev;
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
    unique_ptr() : ptr_(nullptr), var_name_(""), moved_from_(""), line_(0) {}

    unique_ptr(T* p, const char* var_name, int line)
        : ptr_(p), var_name_(var_name ? var_name : ""), moved_from_(""), line_(line) {
        detail::last_line() = line_;
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

    // 移动构造：若目标变量名尚未绑定，记录 moved_from_ 待 bind_name 时发射完整 ptr_move
    unique_ptr(unique_ptr&& other) noexcept
        : ptr_(other.ptr_), var_name_(""), moved_from_(other.var_name_), line_(other.line_) {
        other.ptr_ = nullptr;
    }

    // 移动赋值：若目标已有名字，直接发射 ptr_move
    unique_ptr& operator=(unique_ptr&& other) noexcept {
        if (this != &other) {
            if (ptr_) {
                delete ptr_;
            }
            ptr_ = other.ptr_;
            other.ptr_ = nullptr;
            if (!var_name_.empty() && !other.var_name_.empty()) {
                emit_ptr_move(other.var_name_, var_name_, detail::last_line());
            } else {
                moved_from_ = other.var_name_;
            }
        }
        return *this;
    }

    // 绑定目标变量名（如在移动构造后或宏定义中调用）
    void bind_name(const char* name, int line) {
        var_name_ = name ? name : "";
        line_ = line;
        detail::last_line() = line;
        if (!moved_from_.empty() && !var_name_.empty()) {
            emit_ptr_move(moved_from_, var_name_, line);
            moved_from_.clear();
        } else {
            emit_ptr_set();
        }
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
    void emit_ptr_move(const std::string& from_var, const std::string& to_var, int line) {
        bool prev = detail::in_visualizer();
        detail::in_visualizer() = true;
        std::cout << "[VIS]{\\"op\\":\\"ptr_move\\",\\"line\\":" << line
                  << ",\\"from\\":\\"" << detail::escape_json(from_var) << "\\""
                  << ",\\"toVar\\":\\"" << detail::escape_json(to_var) << "\\""
                  << ",\\"addr\\":\\"" << static_cast<const void*>(ptr_) << "\\"}" << std::endl;
        detail::in_visualizer() = prev;
    }

    void emit_ptr_set() {
        if (var_name_.empty()) return;
        bool prev = detail::in_visualizer();
        detail::in_visualizer() = true;
        std::cout << "[VIS]{\\"op\\":\\"ptr_set\\",\\"line\\":" << line_
                  << ",\\"var\\":\\"" << detail::escape_json(var_name_) << "\\"";
        if (ptr_) {
            std::cout << ",\\"to\\":\\"" << static_cast<const void*>(ptr_) << "\\"";
        } else {
            std::cout << ",\\"to\\":null";
        }
        std::cout << ",\\"isSmart\\":true}" << std::endl;
        detail::in_visualizer() = prev;
    }

    T* ptr_;
    std::string var_name_;
    std::string moved_from_;
    int line_;
};

} // namespace vis

// 宏定义：作用域守卫
#define VIS_SCOPE(name) ::vis::detail::ScopeGuard _vis_scope_##__LINE__(name, __LINE__)

// 宏定义：单步指示
#define VIS_STEP() ::vis::step(__LINE__)
#define VIS_STEP_L(label) ::vis::step(__LINE__, label)

// 宏定义：追踪生命周期与变量
#define VIS_TRACK(var, type) ::vis::LifetimeTracker _vis_tracker_##var(#var, #type, __LINE__, &var)
#define VIS_VAR(var, type) ::vis::track_var(#var, #type, var, __LINE__, &var)

// 宏定义：堆分配与指针绑定
#define VIS_PTR(var, val) \\
    do { \\
        ::vis::detail::last_line() = __LINE__; \\
        bool _vis_prev = ::vis::detail::in_visualizer(); \\
        ::vis::detail::in_visualizer() = true; \\
        std::cout << "[VIS]{\\"op\\":\\"ptr_set\\",\\"line\\":" << __LINE__ \\
                  << ",\\"var\\":\\"" #var "\\",\\"to\\":\\"" << static_cast<const void*>(val) << "\\"}" << std::endl; \\
        ::vis::detail::in_visualizer() = _vis_prev; \\
    } while (0)

// 宏定义：追踪堆结构体成员更新
#define VIS_FIELD(ptr, field, val) ::vis::track_field(static_cast<const void*>(ptr), #field, val, __LINE__)

// 全局 operator new / operator delete 拦截（可捕获所有原生 new 与 delete）
#ifndef VIS_NO_GLOBAL_NEW_DELETE
inline void* operator new(std::size_t size) {
    void* ptr = std::malloc(size);
    if (!ptr) throw std::bad_alloc();
    if (!vis::detail::in_visualizer()) {
        vis::detail::in_visualizer() = true;
        std::cout << "[VIS]{\\"op\\":\\"heap_alloc\\",\\"line\\":" << vis::detail::last_line()
                  << ",\\"addr\\":\\"" << ptr
                  << "\\",\\"size\\":" << size << "}" << std::endl;
        vis::detail::in_visualizer() = false;
    }
    return ptr;
}

inline void operator delete(void* ptr) noexcept {
    if (!ptr) return;
    if (!vis::detail::in_visualizer()) {
        vis::detail::in_visualizer() = true;
        std::cout << "[VIS]{\\"op\\":\\"heap_free\\",\\"line\\":" << vis::detail::last_line()
                  << ",\\"addr\\":\\"" << ptr << "\\"}" << std::endl;
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
  const match = includePattern.exec(source);
  if (!match) return source;
  const includeLine = source.slice(0, match.index).split(/\r?\n/).length;
  return source.replace(
    includePattern,
    `#line 1 "visualizer.h"\n${VISUALIZER_HEADER_SOURCE}\n#line ${includeLine + 1} "main.cpp"`,
  );
}

