/* Host-side checks for the C17 booklet. No device or C++ runtime required. */
#ifdef NDEBUG
#error "This self-test requires assertions; do not define NDEBUG."
#endif
#include <assert.h>
#include <ctype.h>
#include <errno.h>
#include <limits.h>
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static int compare_int(const void *left, const void *right) {
    const int a = *(const int *)left;
    const int b = *(const int *)right;
    return (a > b) - (a < b);
}

static bool parse_int(const char *text, int *result) {
    errno = 0;
    char *end = NULL;
    const long value = strtol(text, &end, 10);
    if (end == text || *end != '\0' || errno == ERANGE || value < INT_MIN || value > INT_MAX) {
        return false;
    }
    *result = (int)value;
    return true;
}

static void check_text_and_formats(void) {
    char editable[] = "cat";
    assert(sizeof editable == 4);
    assert(strlen(editable) == 3);
    editable[0] = 'b';
    assert(strcmp(editable, "bat") == 0);
    assert(strchr(editable, 'a') == &editable[1]);
    assert(strstr(editable, "at") == &editable[1]);

    char formatted[16];
    const int needed = snprintf(formatted, sizeof formatted, "%s-%d", "dev", 3);
    assert(needed == 5 && strcmp(formatted, "dev-3") == 0);
    char small[4];
    /* Use a runtime format argument to exercise truncation without relying on
       a compiler's static format-truncation diagnostic. */
    int (*format_text)(char *, size_t, const char *, ...) = snprintf;
    const int truncated = format_text(small, sizeof small, "%s", formatted);
    assert(truncated == 5 && small[3] == '\0');

    float temperature = 0.0f;
    double voltage = 0.0;
    assert(sscanf("12.5 3.25", "%f %lf", &temperature, &voltage) == 2);
    assert(temperature == 12.5f && voltage == 3.25);
    char name[16];
    assert(sscanf("uart0", "%15s", name) == 1 && strcmp(name, "uart0") == 0);
    assert(isdigit((unsigned char)'7'));
    assert(tolower((unsigned char)'A') == 'a');

    int value = 0;
    assert(parse_int("42", &value) && value == 42);
    assert(parse_int("0", &value) && value == 0);
    assert(!parse_int("", &value));
    assert(!parse_int("42x", &value));
    assert(!parse_int("999999999999999999999999999999", &value));
}

static void check_arrays_and_memory(void) {
    int values[] = {INT_MAX, 0, INT_MIN, 2};
    const size_t count = sizeof values / sizeof values[0];
    assert(count == 4);
    qsort(values, count, sizeof values[0], compare_int);
    assert(values[0] == INT_MIN && values[3] == INT_MAX);
    size_t visits = 0;
    for (size_t i = count; i > 0; --i) {
        assert(values[i - 1] >= INT_MIN);
        ++visits;
    }
    assert(visits == count);

    char buffer[5] = "abcd";
    memmove(buffer + 1, buffer, 3);
    assert(memcmp(buffer, "aabc", 4) == 0);
    char copy[5];
    memcpy(copy, buffer, sizeof copy);
    assert(memcmp(copy, buffer, sizeof copy) == 0);
    memset(copy, 0, sizeof copy);
    assert(copy[0] == '\0' && copy[4] == '\0');

    const size_t n = 4;
    assert(n <= SIZE_MAX / sizeof(int));
    int *data = malloc(n * sizeof *data);
    assert(data != NULL);
    for (size_t i = 0; i < n; ++i) data[i] = (int)i;
    const size_t new_count = 8;
    assert(new_count <= SIZE_MAX / sizeof *data);
    int *next = realloc(data, new_count * sizeof *data);
    if (next == NULL) {
        free(data);
        assert(0 && "test allocation failed");
        return;
    }
    data = next;
    assert(data[0] == 0 && data[3] == 3);
    for (size_t i = n; i < new_count; ++i) data[i] = 0;
    free(data);
    data = NULL;
    free(data);
}

static void check_file_io(void) {
    FILE *file = tmpfile();
    assert(file != NULL);
    const unsigned char payload[] = {0, 1, 255};
    assert(fwrite(payload, 1, sizeof payload, file) == sizeof payload);
    rewind(file);
    unsigned char received[8] = {0};
    const size_t count = fread(received, 1, sizeof received, file);
    assert(count == sizeof payload && !ferror(file));
    assert(memcmp(received, payload, sizeof payload) == 0);
    assert(feof(file));
    assert(fclose(file) == 0);
}

int main(void) {
    check_text_and_formats();
    check_arrays_and_memory();
    check_file_io();
    puts("C17 cheatsheet checks passed");
    return 0;
}
