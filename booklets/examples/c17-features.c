/* C17 language/library checks for the extended quick reference. */
#ifdef NDEBUG
#error "This self-test requires assertions."
#endif
#include <assert.h>
#include <errno.h>
#include <inttypes.h>
#include <limits.h>
#include <math.h>
#include <setjmp.h>
#include <signal.h>
#include <stdarg.h>
#include <stddef.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#if !defined(__STDC_NO_ATOMICS__)
#include <stdatomic.h>
#endif

_Static_assert(INT_MAX >= 32767, "C17 minimum int range");
#define TYPE_NAME(x) _Generic((x), int: "int", double: "double", default: "other")

struct Packet { size_t length; unsigned char data[]; };
struct Point { int x; int y; };
static volatile sig_atomic_t signal_seen = 0;

static void on_signal(int number) {
    (void)number;
    signal_seen = 1;
}

static int sum_ints(int count, ...) {
    va_list args;
    va_start(args, count);
    int total = 0;
    for (int i = 0; i < count; ++i) total += va_arg(args, int);
    va_end(args);
    return total;
}

static unsigned long factorial(unsigned int n) {
    assert(n <= 10u);
    if (n <= 1u) return 1UL;
    return (unsigned long)n * factorial(n - 1u);
}

static int compare_int(const void *left, const void *right) {
    const int a = *(const int *)left;
    const int b = *(const int *)right;
    return (a > b) - (a < b);
}

int main(void) {
    int values[5] = {[2] = 7};
    struct Point point = {.y = 4};
    assert(values[0] == 0 && values[2] == 7 && values[4] == 0);
    assert(point.x == 0 && point.y == 4);
    const int *literal = (int[]){2, 4, 6};
    assert(literal[2] == 6);
    assert(strcmp(TYPE_NAME(3), "int") == 0);
    assert(strcmp(TYPE_NAME(3.0), "double") == 0);
    assert(sum_ints(3, 2, 4, 6) == 12);
    assert(factorial(10u) == 3628800UL);
    assert((values + 5) - values == 5);
    _Alignas(max_align_t) unsigned char storage[64];
    assert(sizeof storage == 64);
    assert(_Alignof(max_align_t) >= _Alignof(int));

    const size_t count = 8;
    assert(count <= SIZE_MAX - sizeof(struct Packet));
    struct Packet *packet = malloc(sizeof *packet + count);
    assert(packet != NULL);
    packet->length = count;
    memset(packet->data, 0, count);
    packet->data[7] = 9;
    assert(packet->length == 8 && packet->data[7] == 9);
    free(packet);

    int sorted[] = {1, 3, 5, 7};
    int key = 5;
    int *found = bsearch(&key, sorted, 4, sizeof sorted[0], compare_int);
    assert(found != NULL && *found == 5);
    key = 6;
    assert(bsearch(&key, sorted, 4, sizeof sorted[0], compare_int) == NULL);
    assert(fabs(sqrt(9.0) - 3.0) < 1e-12);
    assert(isfinite(3.0));

#if defined(UINT32_MAX)
    char formatted[32];
    uint32_t id = UINT32_C(42);
    const int length = snprintf(formatted, sizeof formatted, "%" PRIu32, id);
    assert(length == 2 && strcmp(formatted, "42") == 0);
#endif
#if !defined(__STDC_NO_ATOMICS__)
    atomic_uint counter = ATOMIC_VAR_INIT(0u);
    const unsigned int before = atomic_fetch_add_explicit(&counter, 1u, memory_order_relaxed);
    assert(before == 0 && atomic_load(&counter) == 1u);
#endif

    char *end = NULL;
    errno = 0;
    const double number = strtod("12.5", &end);
    assert(number == 12.5 && *end == '\0' && errno == 0);
    const char *invalid = "invalid";
    (void)strtod(invalid, &end);
    assert(end == invalid);
    (void)strtod("12.5x", &end);
    assert(*end == 'x');
    errno = 0;
    (void)strtod("1e999999", &end);
    assert(errno == ERANGE);

    FILE *stream = tmpfile();
    assert(stream != NULL);
    const int written = fputs("abc", stream);
    assert(written != EOF);
    const int repositioned = fseek(stream, 0L, SEEK_SET);
    assert(repositioned == 0 && ftell(stream) == 0L);
    fpos_t beginning;
    const int saved = fgetpos(stream, &beginning);
    assert(saved == 0 && fgetc(stream) == 'a');
    const int restored = fsetpos(stream, &beginning);
    assert(restored == 0 && fgetc(stream) == 'a');
    const int closed = fclose(stream);
    assert(closed == 0);

    jmp_buf environment;
    if (setjmp(environment) == 0) {
        longjmp(environment, 1);
    } else {
        /* The saved environment is still live; no changed local value is read. */
    }
    void (*previous)(int) = signal(SIGTERM, on_signal);
    assert(previous != SIG_ERR);
    const int raised = raise(SIGTERM);
    assert(raised == 0 && signal_seen == 1);
    assert(signal(SIGTERM, previous) != SIG_ERR);
    puts("C17 feature checks passed");
    return 0;
}
