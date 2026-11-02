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

    void SetValueExplicit(this Cell& self, double value) noexcept {
        self.value_ = value;
        PrintCell(self);
    }

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
    local_cell.SetValueExplicit(7.5);

    std::cout << "dynamic object owned by unique_ptr:\n";
    auto heap_cell = std::make_unique<Cell>();
    heap_cell->SetValue(3.7);

    heap_cell.reset();
    std::cout << "unique_ptr reset: "
              << (heap_cell == nullptr ? "empty" : "not empty") << '\n';
    return 0;
}
