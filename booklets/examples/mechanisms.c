#include <assert.h>
#include <stdatomic.h>
#include <stdio.h>
#define kind(x) _Generic((x), int: 1, double: 2, default: 0)
_Static_assert(sizeof(char) == 1, "C byte unit");
int generic_probe(void) {
    int value = 0;
    int selected = kind(value++);
    return selected + value; /* controlling expression is not evaluated */
}
int atomic_probe(_Atomic int *counter) {
    return atomic_fetch_add_explicit(counter, 1, memory_order_relaxed);
}
int main(void) {
    _Atomic int counter = 2;
    assert(generic_probe() == 1);
    assert(atomic_probe(&counter) == 2);
    assert(atomic_load(&counter) == 3);
    puts("C17 implementation observations passed");
}
