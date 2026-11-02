#include <iostream>
#include <memory>

class Cell;

void PrintCell(const Cell& cell) noexcept;

class Cell {
public:
    void SetValue(double value) noexcept {
        this->value_ = value;
        PrintCell(*this);
    }

#if defined(__cpp_explicit_this_parameter)
    // C++23 显式对象参数；GCC 14+ / Clang 18+ 支持。
    void SetValueExplicit(this Cell& self, double value) noexcept {
        self.value_ = value;
        PrintCell(self);
    }
#endif

    [[nodiscard]] double GetValue() const noexcept {
        return value_;
    }

private:
    double value_{0.0};
};

void PrintCell(const Cell& cell) noexcept {
    std::cout << "cell value=" << cell.GetValue() << '\n';
}

int main() {
    std::cout << "automatic object:\n";
    Cell local_cell;
    local_cell.SetValue(6.0);

    std::cout << "explicit object parameter:\n";
#if defined(__cpp_explicit_this_parameter)
    local_cell.SetValueExplicit(7.5);
#else
    std::cout << "skipped: compiler lacks C++23 explicit object parameter "
                 "(requires GCC 14+ or Clang 18+)\n";
#endif

    std::cout << "dynamic object owned by unique_ptr:\n";
    auto heap_cell = std::make_unique<Cell>();
    heap_cell->SetValue(3.7);

    heap_cell.reset();
    std::cout << "unique_ptr reset: "
              << (heap_cell == nullptr ? "empty" : "not empty") << '\n';
    return 0;
}
