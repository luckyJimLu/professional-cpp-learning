# C 语言速查

以 **ISO C17 宿主环境**为基线，覆盖核心语法、对象与内存规则、常用标准库和 29 个标准头文件。裸机启动与库能力以实现为准；C23、POSIX 和编译器扩展单独区分。

除标明完整程序外，代码均为局部片段：头文件和函数定义放文件作用域，操作语句放函数内，并补齐头文件及上下文变量。每条按“用途 → 写法 → 限制”查阅。

内容组织参考 [Coddy · C Cheat Sheet](https://coddy.tech/cheat-sheets/c)，中文说明与示例为本项目重新编写，并补充类型、边界和生命周期提醒。语言与库规则可交叉查询 [cppreference · C](https://en.cppreference.com/w/c.html)。参考日期：2026-10-29。

## 起步与类型 <!-- category: basics -->

### 程序入口与编译 <!-- entry: main -->
关键词：main hello world 程序入口 编译 gcc clang C17 注释

完整程序从 `main` 进入；返回 0 表示成功。`//` 是行注释，`/* ... */` 是块注释，块注释不能嵌套。

```c
#include <stdio.h>
int main(void) {
    printf("Hello, C!\n");
    return 0;
}
```

在提供 GCC 的终端运行：`gcc -std=c17 -Wall -Wextra -Wpedantic main.c -o main`，编译成功后运行生成的程序。Windows 和 Linux 的执行路径不同。

### 命令行参数 <!-- entry: arguments -->
关键词：argc argv 命令行 参数 main

`argc` 是参数数量，`argv` 是字符串指针数组；用户参数通常从下标 1 开始。访问前验证下标小于 `argc`。

```c
#include <stdio.h>
int main(int argc, char *argv[]) {
    for (int i = 1; i < argc; ++i) {
        printf("%s\n", argv[i]);
    }
    return 0;
}
```

`argv[argc]` 是空指针。命令行给出的数字仍然是字符串，需经带检查的数值转换后使用。

### 变量与初始化 <!-- entry: initialization -->
关键词：变量 初始化 声明 赋值 int double char 未初始化

声明确定类型；初始化提供初值；后续用 `=` 赋值。局部自动变量没有显式初始化时，不要读取它的未定值。

```c
int count = 0;
double voltage = 3.3;
char grade = 'A';
count = 2;
```

> 注意：C17 的普通字符常量（如 `'A'`）类型是 `int`，可以赋给 `char`；`"A"` 是含终止符的字符数组字面量，不是同一种类型。

### 整数、浮点与大小 <!-- entry: types -->
关键词：数据类型 int unsigned long long long float double char sizeof CHAR_BIT stdint limits

`int` 至少 16 位，`long` 至少 32 位，`long long` 至少 64 位；具体宽度以实现为准。`float`、`double` 用于浮点近似，不承诺十进制金额计算精确。

```c
#include <limits.h>
#include <stdint.h>
#include <stddef.h>
unsigned int flags = 0u;
long long total = 123LL;
size_t element_size = sizeof(int);
```

`sizeof(char)` 恒为 1，但一个 C 字节不必是 8 位，用 `CHAR_BIT` 查询位数。`uint32_t` 等恰好位宽类型仅在实现提供对应类型时存在；不能假定 `sizeof(int) == 4`。

### 布尔、大小与空指针 <!-- entry: bool-size-null -->
关键词：bool true false _Bool stdbool size_t NULL stddef 空指针 编译器实现 底层机制 深入讨论

C17 的 `bool`、`true`、`false` 由 `<stdbool.h>` 提供；`size_t` 是 `sizeof` 的无符号结果类型；空指针用 `NULL` 表达。

```c
#include <stdbool.h>
#include <stddef.h>
bool ready = true;
size_t length = 0;
int *optional_value = NULL;
```

> 注意：`size_t` 是无符号类型，递减循环不能依赖 `i >= 0` 停止。C17 没有 C++ 的 `nullptr` 关键字。

**标准版本：C99：_Bool。**

**实现机制（标准要求与常见实现）：** 前端把转为 _Bool 的结果规范为 0 或 1，布局由 ABI 决定；C17 的 bool/true/false 是头文件宏。

**深入讨论与应用：** 用于逻辑状态。C23 将 bool/true/false 变为关键字，并新增 nullptr；不能用 memset 代替可移植的空指针初始化。

### const 与类型转换 <!-- entry: const-casts -->
关键词：const 常量 类型转换 强制转换 cast 截断 窄化

`const` 限制经该对象或访问路径修改；转换写法是 `(目标类型)表达式`，转换不会替你验证范围。

```c
const int limit = 10;
int whole = (int)3.8;     /* 得到 3，向零截断 */
double ratio = 5.0 / 2.0; /* 2.5 */
```

不要修改原本定义为 `const` 的对象，即使强制去掉限定。C 中 `const int n = 10;` 不普遍等价于整数常量表达式，固定数组容量可用枚举常量或宏。

### 数字字面量与后缀 <!-- entry: literals -->
关键词：字面量 十进制 八进制 十六进制 后缀 u U l L LL f F 0x 0b

前缀确定整数进制，后缀参与确定类型。整数常量实际类型还取决于其值和进制。

```c
int decimal = 10;
int octal = 010;             /* 8，不是十进制 10 */
unsigned int hex = 0x10u;    /* 16 */
long long large = 123LL;
float single = 1.5f;        /* 无 f 的 1.5 是 double */
```

C17 不规定 `0b1010` 二进制字面量。负号是单独的运算符；极小负数边界优先使用 `<limits.h>` 的 `INT_MIN` 等宏。

### 零初始化、指定初始化与复合字面量 <!-- entry: initializers -->
关键词：初始化 零初始化 指定初始化 复合字面量 designated initializer compound literal 编译器实现 底层机制 深入讨论

部分初始化时，其余成员按静态初始化规则处理：算术值为零、指针为空指针。C17 用 `{0}`，不使用空的 `{}`。

```c
int zeros[4] = {0};
int slots[5] = {[2] = 7};        /* 0, 0, 7, 0, 0 */
struct Point { int x; int y; };
struct Point p = {.y = 4};      /* x 为 0 */
const int *values = (int[]){2, 4, 6};
```

复合字面量在文件作用域有静态存储期，在块作用域有对应块的自动存储期；不要让借用指针越过其生命周期。

**标准版本：C99：指定初始化与复合字面量。**

**实现机制（标准要求与常见实现）：** 前端将成员/下标映射到布局；静态对象可形成数据段，自动对象生成存储或复制。复合字面量引入未命名对象，不是堆分配。

**深入讨论与应用：** 用于配置和稀疏表；C17 块内复合字面量具有关联块的自动存储期，块外为静态存储期。C 的指定初始化不同于 C++20。

### 定宽整数的输入输出 <!-- entry: integer-formats -->
关键词：inttypes PRIu32 PRId64 SCNu32 uint32_t int64_t 定宽整数 格式宏 编译器实现 底层机制 深入讨论

`<stdint.h>` 提供类型，`<inttypes.h>` 提供匹配的格式宏；类型存在时再使用对应宏。

```c
#include <inttypes.h>
uint32_t id = UINT32_C(42);
printf("id=%" PRIu32 "\n", id); /* 另需 <stdio.h> */
/* scanf("%" SCNu32, &id) 的返回值仍需检查 */
```

`uint32_t` 不保证总是 `unsigned int`；不要硬写 `%u`。`int_least32_t` 表达至少 32 位，`int_fast32_t` 表达至少 32 位的实现选定快速类型，二者不承诺恰好 32 位。

**标准版本：C99：stdint.h / inttypes.h。**

**实现机制（标准要求与常见实现）：** 头文件将类型名映射到 ABI 支持的基础整数类型，PRI/SCN 宏展开成相应格式串。

**深入讨论与应用：** 解决 int/long 宽度的平台差异；格式诊断不会在运行时自动修正错误的可变参数类型。

### C17 关键字 <!-- entry: keywords -->
关键词：关键字 reserved auto register _Alignas _Alignof _Atomic _Generic _Noreturn _Static_assert _Thread_local _Bool _Complex _Imaginary 编译器实现 底层机制 深入讨论

C17 有 44 个关键字，不能用作普通标识符。

```text
auto break case char const continue default do
double else enum extern float for goto if
int long register return short signed sizeof static
struct switch typedef union unsigned void volatile while
inline restrict _Bool _Complex _Imaginary
_Alignas _Alignof _Atomic _Generic _Noreturn _Static_assert _Thread_local
```

`bool` 是 C17 `<stdbool.h>` 中的宏，不是本标准的关键字。C23 新增的 `nullptr`、`constexpr`、`typeof` 等不属于本册默认语法；实现可选择不提供部分复数、原子或线程能力。

**标准版本：C11：_Noreturn。**

**实现机制（标准要求与常见实现）：** 前端把不返回调用者的契约传给控制流分析，优化器可去掉调用后的路径。

**深入讨论与应用：** 用于终止型错误处理；不自动插入 exit，违反契约正常返回为未定义行为；C23 推荐 [[noreturn]] 属性。

## 输入与输出 <!-- category: io -->

### printf 格式说明 <!-- entry: printf -->
关键词：printf 输出 格式化 %d %u %ld %lld %f %.2f %c %s %p %zu %x %%

来自 `<stdio.h>`。格式必须与实际参数类型匹配；格式字符串应为你控制的字符串。

```c
printf("count=%d flags=%u\n", 3, 5u);
printf("value=%.2f\n", 3.14159);
printf("bytes=%zu\n", sizeof(int));
printf("address=%p\n", (void *)&count);
printf("%s", user_text); /* 不写 printf(user_text) */
```

| 格式 | printf 的值类型 | scanf 的目标类型 |
| --- | --- | --- |
| `%d`、`%i` | `int` | `int *` |
| `%u`、`%x`、`%o` | `unsigned int` | `unsigned int *` |
| `%ld`、`%lld` | `long`、`long long` | 对应类型的指针 |
| `%zu`、`%td` | `size_t`、`ptrdiff_t` | 对应类型的指针 |
| `%f`、`%lf` | `double`（float 已提升） | 分别为 `float *`、`double *` |
| `%Lf` | `long double` | `long double *` |
| `%c` | 提升后的字符整数 | `char *` |
| `%s` | 有终止符的字符指针 | 容量足够的 `char *` |
| `%p` | `void *` | `void **` |

`printf`／`fprintf` 成功返回输出字符数，失败返回负值；`puts` 自动追加换行，`fputs` 不追加，二者成功只承诺非负值。

`%%` 输出百分号；`%n` 写入当前计数，不能让不可信输入控制格式。`printf` 中 `%i` 与 `%d` 都输出十进制；`scanf` 的 `%i` 按前缀选择进制。定宽整数用 `<inttypes.h>` 的 `PRI...`／`SCN...` 宏，不能假定 `uint32_t` 一定匹配 `%u`。

### scanf 的地址与返回值 <!-- entry: scanf -->
关键词：scanf 输入 %d %f %lf %s 地址 返回值 格式匹配

来自 `<stdio.h>`。传入写入目标的地址，并检查成功转换的项目数。`scanf` 中 `%f` 要求 `float *`，`%lf` 要求 `double *`，不能照搬 `printf` 的规则。

```c
int age = 0;
if (scanf("%d", &age) == 1) {
    printf("age=%d\n", age);
}
char name[16];
if (scanf("%15s", name) == 1) { /* 留 1 字节给 '\0' */
    printf("%s\n", name);
}
```

> 注意：`%s` 读到空白就停止，宽度不包含终止符。匹配失败可能把原字符留在输入流，数值超出目标类型范围也不能只靠返回值安全检测；无检查地重试会卡住。对不可信整数文本，优先 `fgets` 加 `strtol`。`%*d` 读取但不赋值、不计入成功赋值数；`%c` 不跳过空白，`" %c"` 才会先跳过；格式尾部的空白可能使交互输入继续等待。

### fgets 按行读取 <!-- entry: fgets -->
关键词：fgets 输入一行 换行 缓冲区 stdin 读取文本

来自 `<stdio.h>`。最多存入指定容量减 1 个字符并补 `\0`；若读到了换行，通常保留换行。

```c
char line[64];
if (fgets(line, sizeof line, stdin) != NULL) {
    printf("%s", line);
}
```

容量不足时可能只读到一行的前半段，要决定拒绝、继续读取还是丢弃余下部分。返回 `NULL` 时区分 EOF 和读取错误，不要使用本次未成功读取的数据。

### getchar、putchar 与 EOF <!-- entry: character-io -->
关键词：getchar putchar EOF fgetc 字符输入 int

读取字符的返回值用 `int` 保存，先检查 `EOF`，再按字符处理；不要先缩成 `char`。

```c
int ch = getchar();
if (ch != EOF) {
    putchar(ch);
}
```

> 注意：先保存为 `char` 可能丢失 EOF 信息。EOF 既可能表示到达文件尾，也可能伴随错误，必要时用 `feof`、`ferror` 区分。

## 运算符与表达式 <!-- category: operators -->

### 算术与整数除法 <!-- entry: arithmetic -->
关键词：加减乘除 + - * / % 求余 整数除法 溢出

两个整数相除得到整数结果，C17 向零截断；`%` 用于整数求余。先考虑范围，再计算。

```c
int quotient = 7 / 2;       /* 3 */
int remainder = 7 % 2;      /* 1 */
double fraction = 7.0 / 2;  /* 3.5 */
```

> 注意：整数除零和有符号整数溢出是未定义行为；`INT_MIN / -1` 也可能超出结果范围。给结果再转换为更大类型，无法挽救已经发生的溢出。

### 比较、逻辑与短路 <!-- entry: logic -->
关键词：== != > < >= <= && || ! 短路 与 或 非 比较 赋值

比较结果为整数 0 或 1；0 为假，非 0 为真。`&&`、`||` 从左到右短路，可以先验证条件再访问数据。

```c
if (p != NULL && *p > 0) {
    /* 只有 p 非空才读取 *p */
}
if (value >= 0 && value <= 10) {
    /* 不要写 0 <= value <= 10 */
}
```

`=` 是赋值，`==` 才是比较。`&` 和 `|` 是位运算，不具备逻辑短路语义。

### 位运算与移位 <!-- entry: bitwise -->
关键词：位运算 & | ^ ~ << >> 掩码 mask 置位 清位 翻转

优先用无符号整数处理位字段，并明确位宽。

```c
unsigned int mask = 1u << 3;
flags |= mask;                /* 置位 */
flags &= ~mask;               /* 清位 */
flags ^= mask;                /* 翻转 */
bool set = (flags & mask) != 0;
```

需要 `<stdbool.h>` 定义 `bool`。移位数不能为负，也不能大于或等于提升后左操作数的位宽；不要依赖有符号负数右移的实现细节。

### sizeof、优先级与副作用 <!-- entry: sizeof-order -->
关键词：sizeof 字节 优先级 ++ -- += 三目 ?: 求值顺序

`sizeof` 返回以 C 字节计的大小；表达式易混淆时用括号明确分组。

```c
size_t bytes = sizeof buffer;
int larger = (a > b) ? a : b;
count += 1;
/* 避免在同一表达式中多次修改 i，例如 i++ + ++i */
```

`sizeof` 对非变长数组操作数通常不求值，但变长数组相关情况不同。不要根据函数参数的书写顺序推断其求值顺序。

### 整型提升与有符号／无符号混算 <!-- entry: integer-conversions -->
关键词：整型提升 usual arithmetic conversions signed unsigned 比较 转换 溢出 模运算

`char`、`short` 等通常先提升为 `int`；若 `int` 不能表示其全部值，则提升为 `unsigned int`。混算再按秩与可表示范围选择共同类型。

```c
int signed_value = -1;
unsigned int unsigned_value = 1u;
bool less = signed_value < unsigned_value; /* false */
unsigned int wrapped = UINT_MAX + 1u;      /* 0 */
```

这里 `-1` 转成 `unsigned int` 后为 `UINT_MAX`。无符号运算按其范围模回绕；有符号溢出是未定义行为。不能靠给最终结果加 cast 修复前面已经发生的溢出。

### 运算前检查范围 <!-- entry: overflow-checks -->
关键词：SIZE_MAX INT_MAX UINT_MAX 溢出检查 乘法溢出 加法溢出 limits

先验证再计算；结果转型、断言或事后比较不能撤销未定义行为。

```c
/* a、b 为 size_t，需 <stdint.h> 提供 SIZE_MAX */
if (a > SIZE_MAX - b) { /* a + b 会回绕 */ }
if (b != 0 && a > SIZE_MAX / b) { /* a * b 会回绕 */ }
/* 无回绕后才计算并用于分配或索引 */
```

有符号运算按目标类型的 `MIN/MAX` 分支检查，不能照搬无符号公式。除法还需排除零和不可表示的最小负数除以 -1；移位前先检查位宽与移位数量。

### 运算符优先级与结合方向 <!-- entry: precedence -->
关键词：优先级 结合性 后缀 前缀 赋值 逗号 条件运算

下表从高到低排列；同一格内同级。结合方向决定表达式分组，不决定所有操作数的求值顺序。

| 运算符 | 结合方向 |
| --- | --- |
| `()` 调用、`[]`、`.`、`->`、后缀 `++ --` | 左到右 |
| 前缀 `++ --`、一元 `+ - ! ~ * &`、`sizeof`、`_Alignof`、cast | 右到左 |
| `* / %` | 左到右 |
| `+ -` | 左到右 |
| `<< >>` | 左到右 |
| `< <= > >=` | 左到右 |
| `== !=` | 左到右 |
| 位 `&` → 位 `^` → 位 `|` | 每一级均左到右 |
| `&&` → `||` | 每一级均左到右 |
| `?:` | 右到左 |
| `= += -= *= /= %= <<= >>= &= ^= |=` | 右到左 |
| 逗号运算符 `,` | 左到右 |

写成 `(flags & mask) == 0`，避免被解析为 `flags & (mask == 0)`。`&&`、`||`、逗号运算符会对相关求值排序；`?:` 只求值被选择的分支。函数实参之间的逗号不是逗号运算符；`f(i++, i++)` 存在未定序修改，不能这样写。

## 分支与循环 <!-- category: flow -->

### if、else 与 switch <!-- entry: branches -->
关键词：if else switch case default break 分支 fallthrough

`if` 判断条件；`switch` 对整数或枚举值选择分支，`case` 必须使用整数常量表达式。

```c
if (temperature > 80) {
    alarm = 1;
} else {
    alarm = 0;
}
switch (state) {
case 0: start(); break;
default: stop(); break;
}
```

C17 的 `case` 后面应接语句；需要局部声明时使用 `{ ... }` 块。漏写 `break` 会继续执行后续分支，除非这是你明确安排的贯穿行为。

### for、while 与 do-while <!-- entry: loops -->
关键词：for while do while 循环 break continue 死循环

`for` 适合计数；`while` 先判断；`do-while` 至少执行一次。

```c
for (size_t i = 0; i < count; ++i) {
    use(values[i]);
}
while (has_data()) { consume(); }
do { retry(); } while (needs_retry());
```

`break` 退出最内层循环或 switch；`continue` 进入下一轮（`for` 会先执行更新表达式）。无符号倒序可写 `for (size_t i = count; i > 0; --i)`，访问 `values[i - 1]`。

### goto 与统一清理 <!-- entry: goto-cleanup -->
关键词：goto 标签 cleanup 错误清理 资源释放

`goto` 只能跳到同一函数的标签，适合把多条失败路径汇入一处释放代码。

```c
int status = -1;
void *buffer = malloc(capacity);
if (buffer == NULL) goto cleanup;
/* 完成工作后：status = 0; */
cleanup:
free(buffer);   /* NULL 也可传入 */
return status;
```

先把清理会访问的变量初始化好，避免跳过初始化后使用未定值。不能跳入可变修改类型变量的作用域；不要把 `goto` 当作跨函数异常。

## 函数与作用域 <!-- category: functions -->

### 声明、定义与值传递 <!-- entry: functions -->
关键词：函数 声明 定义 原型 参数 返回值 void 传值 编译器实现 底层机制 深入讨论

在使用前提供声明；参数按值传递。C17 用 `(void)` 明确表示无参数，空 `()` 在普通声明中不是同一含义。

```c
int add(int a, int b); /* 声明 */
int add(int a, int b) { return a + b; } /* 定义 */
void greet(void) { puts("hello"); }
```

函数体需位于文件作用域，不能在标准 C 中嵌套定义函数。返回局部自动对象的地址会留下悬空指针。

**标准版本：C99：__func__。**

**实现机制（标准要求与常见实现）：** 前端提供类似 static const char 数组的函数名对象，通常放入只读数据。

**深入讨论与应用：** 用于日志定位；它不是预处理宏，不能按宏字符串拼接规则使用。

### 通过指针修改调用者 <!-- entry: output-parameter -->
关键词：指针参数 输出参数 pass by pointer 引用 & 解引用

指针本身也按值传递；通过它访问调用者的对象，才能修改调用者的数据。

```c
void increment(int *value) {
    if (value != NULL) {
        *value += 1;
    }
}
/* 调用：int n = 0; increment(&n); */
```

写下 `NULL` 是否允许的契约。要修改调用者的指针值，通常需传入指针的地址，即二级指针，或通过返回值交还新指针。

### static、extern 与生命周期 <!-- entry: storage -->
关键词：static extern auto register _Thread_local 作用域 链接 生命周期 局部静态 全局

文件作用域的 `static` 限制链接到当前翻译单元；函数内的 `static` 对象在多次调用之间保留值。

```c
static int calls = 0;  /* 当前源文件的内部链接对象 */
static int next_id(void) {
    static int value = 0;
    return ++value;
}
extern int shared_counter; /* 声明，定义放在一个源文件 */
```

`auto` 通常省略，表示块内自动对象；`register` 只是一种建议，C17 不允许对 register 对象取地址；`_Thread_local` 指线程存储期，见线程条目。`typedef` 只建立类型别名。

文件作用域的 `extern int x = 1;` 是定义，不应在多个头文件使用点重复定义。作用域、链接与对象生命周期是三个不同问题。

### 函数指针与回调 <!-- entry: function-pointer -->
关键词：函数指针 回调 callback typedef 函数地址

函数指针的参数与返回类型必须和目标函数匹配。

```c
typedef int (*Compare)(int, int);
int max_of(int a, int b) { return a > b ? a : b; }
Compare choose = max_of;
/* 调用：int result = choose(2, 5); */
```

回调及其上下文对象都必须在调用期间有效。不能把任意函数指针和对象指针按通用方式互转，ISO C 不提供这种可移植保证。

### 递归、返回路径与栈空间 <!-- entry: recursion -->
关键词：递归 recursion 终止条件 返回值 栈 栈溢出

递归必须有终止条件，每次调用推进到该条件；非 `void` 函数应在每条正常到达的返回路径提供结果。

```c
unsigned long factorial(unsigned int n) {
    /* 前提：n <= 10，结果在 C17 的 unsigned long 保证范围内 */
    if (n <= 1u) return 1UL;
    return (unsigned long)n * factorial(n - 1u);
}
```

本例还有结果范围与调用深度限制；不能用于任意 `n`。C17 不保证尾调用优化，深度不可控时考虑循环。`main` 到达结尾隐式返回 0 是特例。

### 可变参数与默认提升 <!-- entry: variadic -->
关键词：stdarg va_list va_start va_arg va_copy va_end 可变参数 ... 默认参数提升

可变参数不携带可直接检查的类型信息；调用双方必须约定类型和数量。

```c
#include <stdarg.h>
int sum_ints(int count, ...) {
    va_list args;
    va_start(args, count);
    int total = 0;
    for (int i = 0; i < count; ++i) total += va_arg(args, int);
    va_end(args);
    return total;
}
```

调用方保证数量、类型与总和范围合法。`float` 提升为 `double`，小整数进行整型提升；不能用 `va_arg(args, float)` 取出传入的 `float`。复制遍历状态用 `va_copy`，每次 `va_start`／`va_copy` 配对 `va_end`。

## 数组与字符串 <!-- category: arrays -->

### 数组初始化与长度 <!-- entry: arrays -->
关键词：数组 array 初始化 长度 sizeof 下标 边界

固定数组保存连续元素，下标从 0 到元素数减 1；C 不自动检查越界。

```c
int values[] = {2, 4, 6};
size_t count = sizeof values / sizeof values[0];
int first = values[0];
```

> 注意：长度公式仅适用于这里仍是数组类型的表达式。函数形参 `int values[]` 会调整为指针，不能在函数内用它计算调用者数组长度。

### 数组参数与多维数组 <!-- entry: array-parameters -->
关键词：数组传参 二维数组 指针 长度 矩阵 编译器实现 底层机制 深入讨论

数组传入函数时通常转换为指向首元素的指针，必须另外传元素数。二维数组的行宽属于所指向类型。

```c
int sum(const int *values, size_t count) {
    int total = 0;
    for (size_t i = 0; i < count; ++i) total += values[i];
    return total; /* 调用方保证总和不溢出 */
}
void clear_rows(int rows[][3], size_t count);
```

`int (*)[3]` 与 `int **` 不是同一类型。变长数组在 C11/C17 中属于可选能力，速查示例不依赖它。

**标准版本：C99：VLA 与数组形参 static。**

**实现机制（标准要求与常见实现）：** 变长数组边界在运行时求值，后端可动态调整栈或使用其他自动存储机制，sizeof VLA 可在运行时计算；数组形参仍调整为指针。

**深入讨论与应用：** 用于受控维度；大 VLA 可能耗尽自动存储，不能检查 NULL。C11/C17 可不支持 VLA；a[static n] 是调用前提，不是自动越界检查。

### 字符串与终止符 <!-- entry: strings -->
关键词：字符串 string char strlen \0 NUL NULL 字符串字面量

C 字符串是以 `\0` 结尾的字符序列。容量包含终止符；`strlen` 返回终止符之前的长度，需包含 `<string.h>`。

```c
char editable[] = "cat";      /* 容量 4，可修改 */
const char *literal = "cat";  /* 不修改字面量 */
size_t length = strlen(editable); /* 3 */
editable[0] = 'b';
```

没有终止符的原始字节数组不是合法 C 字符串，不能交给 `strlen` 或 `%s`。`NULL` 是空指针宏，`'\0'` 是零字符，二者含义不同。

### 复制、拼接与缓冲区容量 <!-- entry: string-copy -->
关键词：strcpy strcat strncpy snprintf 复制 拼接 截断 缓冲区

`strcpy`、`strcat` 不接收目标容量，调用者必须证明空间足够。格式化到固定缓冲区时，可用 `<stdio.h>` 的 `snprintf` 并检查结果。

```c
char out[16];
int needed = snprintf(out, sizeof out, "%s-%d", "dev", 3);
if (needed < 0 || (size_t)needed >= sizeof out) {
    /* 编码错误或截断，不把 out 当作完整结果 */
}
```

`snprintf` 容量大于 0 时会为成功格式化的输出留终止符；返回值不含终止符。`strncpy` 不是自动安全版 `strcpy`：截断时可能不补 `\0`，还可能填充多余零字节。

### 比较、查找与分词 <!-- entry: string-search -->
关键词：strcmp strchr strstr strtok 字符串比较 查找 分词

来自 `<string.h>`。`strcmp(a,b) == 0` 表示内容相同；指针的 `==` 比较的是地址。

```c
if (strcmp(name, "uart") == 0) { /* 内容相同 */ }
char *separator = strchr(line, ',');
char *found = strstr(line, "OK");
```

`strcmp` 结果只保证负、零或正，不保证恰好为 -1、0、1。`strtok` 会修改输入并保存内部状态，不用于字符串字面量，也不适合交错解析多个独立序列。

### 转义字符、编码与二进制文本边界 <!-- entry: escapes-encoding -->
关键词：转义 \n \r \t \0 \\ \x UTF-8 编码 字符 字节 wchar

转义表达字符值；字符串长度函数统计字节，不统计用户看到的字符数量。

| 写法 | 含义 |
| --- | --- |
| `\n`、`\r`、`\t` | 换行、回车、水平制表 |
| `\0` | 零字符；其后再接八进制数字会继续组成转义 |
| `\\`、`\"`、`\'` | 反斜杠、双引号、单引号 |
| `\xHH` | 十六进制字符值；连续十六进制数字都属于该转义 |

```c
const char *message = "first\nsecond";
const char *hex_then_B = "\x41" "B"; /* 分开，避免读成 \x41B */
unsigned char binary[] = {0x41, 0x00, 0x42};
```

普通执行字符集不必是 ASCII；UTF-8 一个字符也不必占一个字节。二进制数组中的零字节不表示数据结束，用指针加长度处理，不使用 `strlen` 推断其长度。

## 指针与内存 <!-- category: memory -->

### 取地址、解引用与 NULL <!-- entry: pointers -->
关键词：指针 pointer & * NULL 取地址 解引用 悬空

指针保存对象地址；`&x` 取得地址，`*p` 访问所指对象。每次访问前都要保证目标存在且生命周期未结束。

```c
int value = 7;
int *p = &value;
*p = 9; /* value 变为 9 */
p = NULL;
/* 此后不能解引用 p */
```

非空不等于有效：指针仍可能已释放、越界或指向已离开作用域的对象。普通局部对象不要调用 `free`。

### const 指针的三种写法 <!-- entry: pointer-const -->
关键词：const int * int * const const int * const 指向常量 常量指针

从指针变量名向外读：限制的是指针自身，还是经指针访问的值。

```c
const int *view = &a;        /* 不能经 view 修改 a */
int *const fixed = &a;       /* fixed 不能再指向别处 */
const int *const both = &a;  /* 两条访问限制同时存在 */
```

`const int *` 与 `int const *` 等价。经 const 视图不可修改，不代表对象不能通过其他合法的非 const 访问路径修改。

### malloc、calloc 与分配失败 <!-- entry: malloc -->
关键词：malloc calloc stdlib 动态分配 堆 分配失败 sizeof SIZE_MAX

来自 `<stdlib.h>`；先检查数量乘积，再检查返回值。C 中 `void *` 可隐式转换到对象指针，通常无需给 `malloc` 加强制转换。

```c
if (n > 0 && n <= SIZE_MAX / sizeof(int)) {
    int *data = malloc(n * sizeof *data);
    if (data != NULL) {
        /* 使用前初始化 data[0] ... data[n-1] */
        free(data);
    }
}
```

`SIZE_MAX` 来自 `<stdint.h>`。`malloc` 不初始化内容；`calloc` 按字节置零，不应泛化为所有指针或浮点类型必然得到语义上的空值。零大小分配的结果不要当成可访问的元素。

### realloc 的失败保护 <!-- entry: realloc -->
关键词：realloc 扩容 缩容 临时指针 内存泄漏 重新分配

使用临时指针接收结果；非零新大小分配失败时，原分配仍需由原指针管理。

```c
/* 前提：new_count > 0，且乘积已检查不溢出 */
int *next = realloc(data, new_count * sizeof *data);
if (next != NULL) {
    data = next;
} else {
    /* data 的原分配仍有效，保留或释放它 */
}
```

> 注意：不要直接写 `data = realloc(data, ...)` 后丢失失败时的原指针。成功后使用返回的新指针，并重新建立内部别名；新增字节未初始化。不要用 `realloc(p, 0)` 统一表达释放，明确调用 `free`。

### free 与拥有责任 <!-- entry: free -->
关键词：free 释放 内存泄漏 double free use after free 悬空指针

每次成功分配要有明确释放责任；`free(NULL)` 允许。释放后不能再访问原对象，也不能重复释放。

```c
free(data);
data = NULL;
```

把一个指针置空不会自动清除其他别名。只能释放来自匹配分配函数的原始分配指针，不能释放栈数组、字符串字面量或分配块中间的地址。

### memcpy、memmove 与 memset <!-- entry: memory-bytes -->
关键词：memcpy memmove memset memcmp 字节复制 重叠 清零 string.h

这些函数操作字节，不会理解字符串终止符、对象所有权或有效元素数量。

```c
#include <string.h>
memcpy(destination, source, byte_count); /* 范围不得重叠 */
memmove(buffer + 1, buffer, count);       /* 允许重叠 */
memset(buffer, 0, sizeof buffer);        /* buffer 必须仍是数组 */
```

调用者保证源与目标范围都有效、容量足够。按字节比较结构体可能受填充字节影响；不能用 `memcmp` 普遍代替逐成员的语义比较。

### 指针运算与尾后位置 <!-- entry: pointer-arithmetic -->
关键词：指针运算 尾后 one past ptrdiff_t 指针相减 p+i

数组遍历中的指针运算应限定在同一数组及其尾后位置。步长由所指向类型决定，不是固定一个字节。

```c
int values[3] = {2, 4, 6};
int *begin = values;
int *end = values + 3;       /* 可形成，不可解引用 */
ptrdiff_t count = end - begin; /* 需 <stddef.h>，结果为 3 */
```

不能形成 `values + 4`，也不能跨独立分配块相减求距离。相减结果还必须能由 `ptrdiff_t` 表示。`void *` 算术是扩展，不属于 ISO C17。

### 对象表示、别名与 restrict <!-- entry: aliasing -->
关键词：严格别名 strict aliasing effective type restrict unsigned char 对象表示 编译器实现 底层机制 深入讨论

不要把“能强转指针”当作“允许通过该类型访问对象”。字符类型可观察对象表示，按字节复制使用 `memcpy`。

```c
double value = 1.0;
unsigned char bytes[sizeof value];
memcpy(bytes, &value, sizeof bytes); /* 查看表示，不假定具体字节布局 */
```

`restrict` 约束被修改对象的访问路径，不是声明指针值永不相等，也不是自动检查。例如 `memcpy` 的源和目标不能重叠。违反契约可能是未定义行为；不要仅为性能给可能重叠的指针加 `restrict`。

**标准版本：C99：restrict。**

**实现机制（标准要求与常见实现）：** 前端将指针访问约定传给别名分析，帮助向量化、重排和消除重复加载，不插入别名检测。

**深入讨论与应用：** 用于满足约定的数值循环；存在写访问时违反相关访问约束可导致未定义行为，仅两个指针地址不同不足以证明合法。

### 对齐与 aligned_alloc <!-- entry: alignment -->
关键词：_Alignas _Alignof stdalign alignas alignof max_align_t aligned_alloc 对齐 编译器实现 底层机制 深入讨论

对象地址必须满足类型对齐要求；不能把任意字节地址直接作为任意类型使用。

```c
#include <stddef.h>
_Alignas(max_align_t) unsigned char storage[64];
size_t required = _Alignof(double);
```

`<stdalign.h>` 提供 C17 的 `alignas`、`alignof` 宏。`aligned_alloc(alignment, size)` 要求实现支持该对齐，且大小是对齐的整数倍；失败检查空指针，成功用 `free` 释放。对齐只解决地址要求，不自动保证大小、有效类型和生命周期正确。

**标准版本：C11：_Alignas / _Alignof / aligned_alloc。**

**实现机制（标准要求与常见实现）：** 前端记录对齐约束，后端安排布局；aligned_alloc 由分配库返回符合对齐的存储。

**深入讨论与应用：** 用于硬件与 SIMD 布局。C17 的 size 必须为 alignment 的整数倍且对齐需实现支持；C23 提供 alignas/alignof 拼写。

## 结构体、枚举与联合体 <!-- category: records -->

### struct、typedef 与成员访问 <!-- entry: struct -->
关键词：struct typedef 结构体 类型别名 . -> 成员 指针

结构体将相关数据放在一起；`.` 访问对象成员，`->` 通过指针访问成员。

```c
typedef struct Point { int x; int y; } Point;
Point origin = {.x = 0, .y = 0};
Point *p = &origin;
p->x = 3; /* 等价于 (*p).x = 3 */
```

C 中 `struct Point` 的标签名不自动等价于普通类型名 `Point`，可用 `typedef` 建立别名。结构体可以按值赋值，但不自动深拷贝它的指针所指资源。

### enum 与有标签的 union <!-- entry: enum-union -->
关键词：enum union 联合体 枚举 tagged union 状态

枚举为整数状态命名；联合体成员共享存储。用独立标签记录当前存放哪种数据。

```c
enum Kind { INTEGER, REAL };
struct Value {
    enum Kind kind;
    union { int integer; double real; } as;
};
struct Value v = {.kind = INTEGER, .as.integer = 42};
```

使用与标签匹配的成员，不把读取不同成员当作可移植类型转换。C17 没有 C++ 的 `enum class`，枚举常量的名称应避免冲突。

### 填充、offsetof 与位域 <!-- entry: record-layout -->
关键词：结构体 填充 padding offsetof 位域 bit field 字节序 序列化

结构体大小可能大于各成员大小之和；成员之间和末尾可能有填充。

```c
#include <stddef.h>
struct Header { unsigned char type; unsigned int length; };
size_t offset = offsetof(struct Header, length);
struct Flags { unsigned int ready : 1; unsigned int mode : 2; };
```

不要假设 `offset == 1`，不要对位域取地址或使用 `offsetof`。位域的分配顺序、填充及字节序不适合作为可移植线协议；序列化应按字段显式编码。

### 柔性数组成员 <!-- entry: flexible-array -->
关键词：柔性数组 flexible array member 变长尾部 struct sizeof 编译器实现 底层机制 深入讨论

结构体最后一个成员可以是不指定长度的数组；它不是可变长度的普通成员对象。

```c
struct Packet { size_t length; unsigned char data[]; };
/* n 已检查，且 n <= SIZE_MAX - sizeof(struct Packet) */
struct Packet *p = malloc(sizeof *p + n);
if (p != NULL) {
    p->length = n;
    /* 仅访问 data[0] 到 data[n-1]，随后 free(p) */
}
```

需要至少一个其他具名成员。`sizeof(struct Packet)` 不含额外数据区；结构体按值赋值不会复制尾部数据。C17 不把 `data[0]` 的零长数组写法视为等价标准语法。

**标准版本：C99：柔性数组成员。**

**实现机制（标准要求与常见实现）：** 编译器记录末尾成员偏移，动态元素不计入 sizeof，结构体可有尾部填充；附加空间由程序分配。

**深入讨论与应用：** 用于报文头与负载一次分配。计算 sizeof(*p)+n*sizeof(p->data[0]) 必须检查溢出，结构体赋值不负责复制整个动态尾部。

## 文件与错误处理 <!-- category: files -->

### fopen、fclose 与打开失败 <!-- entry: files -->
关键词：FILE fopen fclose 文件 打开 关闭 stdio rb wb a

使用 `<stdio.h>` 的 `FILE *`；打开失败返回 `NULL`，成功后负责关闭。`"w"`／`"wb"` 会截断已有文件，读取不应误用写模式。

```c
FILE *file = fopen("input.bin", "rb");
if (file == NULL) {
    fputs("cannot open input.bin\n", stderr);
    /* 由当前函数返回或按项目策略处理失败 */
} else {
    /* 读取 file */
    fclose(file);
}
```

文本与二进制模式在某些平台有差异。关闭输出文件也可能失败，关键输出要检查 `fclose` 的返回值。

### fread、fwrite 与实际数量 <!-- entry: binary-io -->
关键词：fread fwrite 二进制 字节 部分读取 feof ferror

返回的是完整元素数量，不一定等于请求数；以元素大小 1 读取时，返回值就是字节数。

```c
unsigned char bytes[64];
size_t received = fread(bytes, 1, sizeof bytes, file);
if (received < sizeof bytes && ferror(file)) {
    /* I/O 错误，不当作普通 EOF */
}
```

先尝试读取，再根据返回值判断结束；不要用 `while (!feof(file))` 预判下一次读取一定成功。写入也必须检查 `fwrite` 的实际数量。

### errno、strtol 与错误区分 <!-- entry: strtol -->
关键词：errno strtol strtoul atoi ERANGE 数值转换 溢出 解析

不可信文本优先 `strtol`，而非无法可靠区分失败与零的 `atoi`。需 `<stdlib.h>`、`<errno.h>`。

```c
errno = 0;
char *end = NULL;
long value = strtol(text, &end, 10);
if (end == text || *end != '\0' || errno == ERANGE) {
    /* 没读到数字、尾部残留或超出 long 范围 */
}
```

`strtol` 接受前导空白和正负号；若协议不允许，须先明确拒绝。转换为 `int` 或更窄类型前，继续对照 `<limits.h>` 的范围检查。

### assert 与运行时错误 <!-- entry: assert -->
关键词：assert NDEBUG 断言 错误处理 运行时错误

`assert` 来自 `<assert.h>`，用于检查程序内部不变量，不替代外部输入验证。

```c
if (length > capacity) {
    return ERROR_TOO_LARGE;
}
assert(length <= capacity);
```

定义 `NDEBUG` 可以禁用断言，因此断言表达式中不能放必须执行的操作，例如 `assert(read_next())`。示例中的错误码须由你的接口定义。

### fopen 模式与读写切换 <!-- entry: file-modes -->
关键词：r w a r+ w+ a+ rb wb ab 二进制 文本 追加 更新流 fflush

| 模式 | 文件不存在 | 文件已存在 |
| --- | --- | --- |
| `r`／`rb` | 打开失败 | 只读，保留内容 |
| `w`／`wb` | 创建 | 只写，截断内容 |
| `a`／`ab` | 创建 | 只写，每次写入到末尾 |
| `r+` | 失败 | 读写，保留内容 |
| `w+` | 创建 | 读写，截断内容 |
| `a+` | 创建 | 读写，写入到末尾 |

`+` 模式可与 `b` 组合。C11 起的 `wx`／`wbx` 用于独占创建，文件已存在时失败。更新流中，写后读需要先 `fflush` 或定位；读后写需要先定位，除非上次读已遇到 EOF。不要依赖所有平台的 `a+` 初始读取位置相同。

### 文件位置、缓冲与错误标记 <!-- entry: stream-position -->
关键词：fseek ftell rewind fgetpos fsetpos fpos_t setvbuf fflush feof ferror clearerr

定位接口返回状态要检查，文本流位置不是通用字节偏移。

```c
if (fseek(file, 0L, SEEK_SET) != 0) {
    /* 定位失败 */
}
long position = ftell(file);
if (position == -1L) { /* 取位置失败 */ }
```

- `fgetpos`／`fsetpos` 使用不透明的 `fpos_t`；大文件和多字节状态应按平台能力选择接口。
- `clearerr` 清除 EOF 和错误标记；`rewind` 回到开头并清除标记，但无返回值供检查。
- `setvbuf` 在打开后、其他 I/O 前设置；外部缓冲区必须保持有效直到流关闭。
- `fflush(stdin)` 不是标准 C 的输入清理方法。不是所有流都可定位，`ftell` 相减也不普遍等于文件字节数。

### strtod 与浮点解析 <!-- entry: strtod -->
关键词：strtod strtof strtold 浮点解析 ERANGE NaN infinity isfinite

需 `<stdlib.h>`、`<errno.h>`；检查是否读到数字、尾部和范围。

```c
errno = 0;
char *end = NULL;
double value = strtod(text, &end);
if (end == text || *end != '\0' || errno == ERANGE) {
    /* 格式不完整、上溢或下溢 */
}
```

下溢时是否把 `errno` 设为 `ERANGE` 由实现定义，不能只凭这一检查排除全部下溢。它可接受前导空白、十六进制浮点及 `INF`／`NAN` 等形式。若只允许有限十进制值，另外检查词法约束和 `<math.h>` 的 `isfinite(value)`。解析也受当前 locale 影响。

### errno、perror 与返回值 <!-- entry: errno -->
关键词：errno perror strerror strerror_r 错误码 失败 返回值

先根据函数的返回约定判断成功或失败，再读取它承诺提供的错误信息。

```c
/* 某个明确约定设置 errno 的操作失败后： */
perror("operation");                  /* 写到 stderr */
fprintf(stderr, "%s\n", strerror(errno)); /* 需 <string.h> */
```

成功后 `errno` 可能仍保留旧值；非零不等于本次失败。ISO C 不要求每个失败 API 都设置 `errno`；POSIX 也不能代替 C17 的保证。`strerror_r` 不是 C17 接口。

## 预处理与头文件 <!-- category: preprocessor -->

### include、宏与条件编译 <!-- entry: macros -->
关键词：#include #define #if #ifdef #endif 宏 条件编译 头文件

预处理发生在编译前。宏是记号替换，没有函数参数的类型检查；表达式宏应加括号，但仍需警惕重复求值。

```c
#include <stdio.h>
#define BUFFER_CAPACITY 64
#ifdef ENABLE_LOG
#define LOG(message) puts(message)
#else
#define LOG(message) ((void)0)
#endif
```

| 指令／名称 | 用途 |
| --- | --- |
| `#if`、`#elif`、`#else`、`#endif` | 条件编译；可使用 `defined(NAME)` |
| `#ifdef`、`#ifndef` | 检查宏是否已定义 |
| `#undef NAME` | 取消宏定义 |
| `#error message` | 产生编译诊断 |
| `#line` | 调整诊断中的行号／文件名 |
| `__FILE__`、`__LINE__` | 当前源文件名与行号 |
| `__STDC_VERSION__` | C17 模式的值为 `201710L` |
| `__STDC_HOSTED__` | 宿主实现为 1，独立实现为 0 |

`__func__` 是函数内预定义的函数名字符串数组，不是预处理宏。

即使 `#define SQUARE(x) ((x) * (x))` 加了括号，`SQUARE(i++)` 仍会多次修改同一对象；优先考虑普通函数或适当的 `static inline` 函数。

### 头文件防重复与多文件 <!-- entry: headers -->
关键词：头文件 include guard 重复定义 声明 定义 static inline

头文件提供可共享声明；实现通常放 `.c`。包含自身使用的依赖，不依赖调用者碰巧先包含其他头。

```c
#ifndef SENSOR_H
#define SENSOR_H
int sensor_read(void);
#endif
```

防重复包含主要解决同一翻译单元的重复展开，不允许你在多个源文件中重复定义普通外部函数或全局变量。`#pragma once` 很常见，但不是 ISO C17 规定的指令。

### 函数式宏、字符串化与拼接 <!-- entry: macro-functions -->
关键词：函数式宏 # ## 字符串化 拼接 do while 0 宏副作用

多语句宏用 `do { ... } while (0)`，使调用点可以像普通语句一样写分号。

```c
#define RESET(x) do { (x) = 0; } while (0)
#define STRINGIFY_RAW(x) #x
#define STRINGIFY(x) STRINGIFY_RAW(x)
#define JOIN_RAW(a, b) a##b
#define JOIN(a, b) JOIN_RAW(a, b)
```

`#` 把实参记号字符串化，`##` 拼接记号；两层宏可先展开实参。它们不等于字符串拼接运算。宏仍没有类型检查，实参是否多次求值必须看展开结果。

### _Static_assert 与 inline <!-- entry: static-assert -->
关键词：_Static_assert static_assert 编译期断言 inline static inline 内联 编译器实现 底层机制 深入讨论

`_Static_assert` 的条件必须是整数常量表达式；失败时编译器必须诊断。

```c
#include <limits.h>
_Static_assert(INT_MAX >= 32767, "int range too small");
static inline int max_int(int a, int b) {
    return a > b ? a : b;
}
```

C17 `<assert.h>` 提供 `static_assert` 宏。头文件中的小辅助函数常用 `static inline`；它不保证机器码一定内联，也不要把 C 的外部 `inline` 规则直接当成 C++ 的规则。

**标准版本：C99：inline；C11：_Static_assert。**

**实现机制（标准要求与常见实现）：** 静态断言在前端求值并诊断，无运行时分支；inline 影响定义规则，是否消除函数调用由优化器决定。

**深入讨论与应用：** 用于布局约束与头文件函数。C 外部 inline 规则与 C++ 不同，小型头文件辅助函数常用 static inline；C23 支持 static_assert 拼写和省略消息。

### _Generic 按类型选择 <!-- entry: generic -->
关键词：_Generic 泛型选择 type generic 类型分派 编译器实现 底层机制 深入讨论

按表达式类型选择一个关联；匹配类型不能重复，`default` 可处理未匹配类型。

```c
#define TYPE_NAME(x) _Generic((x), \
    int: "int", double: "double", default: "other")
/* TYPE_NAME(3) 得到 "int"，TYPE_NAME(3.0) 得到 "double" */
```

控制表达式不求值，但未选分支仍须满足语法与语义约束；不能靠它隐藏本来非法的代码。它不是 C++ 模板。

**标准版本：C11：_Generic。**

**实现机制（标准要求与常见实现）：** 前端按控制表达式类型选择关联表达式，控制表达式不求值；未选分支不执行，但仍须满足语法及相关语义约束。

**深入讨论与应用：** 用于泛型宏，不是 C++ 模板实例化；可先选函数名再统一调用，避免未选分支出现非法类型运算。

## 常用库与易错点 <!-- category: library -->

### 29 个 C17 标准头文件 <!-- entry: standard-headers -->
关键词：标准头文件 assert complex ctype errno fenv float inttypes iso646 limits locale math setjmp signal stdalign stdarg stdatomic stdbool stddef stdint stdio stdlib stdnoreturn string tgmath threads time uchar wchar wctype

按需要包含声明；此表是 C17 的标准头文件索引，不包含 POSIX 和平台私有头。

| 头文件 | 用途 |
| --- | --- |
| `<assert.h>` | 运行期断言、编译期断言宏 |
| `<complex.h>` | 复数及复数运算；实现可不支持 |
| `<ctype.h>` | 字节字符分类与转换 |
| `<errno.h>` | errno 与错误宏 |
| `<fenv.h>` | 浮点环境、舍入与异常标记 |
| `<float.h>` | 浮点范围与精度 |
| `<inttypes.h>` | 定宽整数格式宏及最大宽度整数操作 |
| `<iso646.h>` | and、or、not 等运算符替代宏 |
| `<limits.h>` | 整数范围与 CHAR_BIT |
| `<locale.h>` | locale 设置与相关约定 |
| `<math.h>` | 数学运算与浮点分类 |
| `<setjmp.h>` | 非局部跳转 |
| `<signal.h>` | 信号处理 |
| `<stdalign.h>` | alignas、alignof 宏 |
| `<stdarg.h>` | 可变参数遍历 |
| `<stdatomic.h>` | 原子类型与操作；可选能力 |
| `<stdbool.h>` | bool、true、false 宏 |
| `<stddef.h>` | size_t、ptrdiff_t、NULL、offsetof、max_align_t |
| `<stdint.h>` | 整数宽度类型与相应极值宏 |
| `<stdio.h>` | 标准流、文件与格式化 I/O |
| `<stdlib.h>` | 分配、转换、排序、随机数、退出 |
| `<stdnoreturn.h>` | noreturn 宏 |
| `<string.h>` | 字符串与字节操作 |
| `<tgmath.h>` | 类型泛化数学宏 |
| `<threads.h>` | 标准线程与同步；可选能力 |
| `<time.h>` | 日历时间与 CPU 计时 |
| `<uchar.h>` | char16_t、char32_t 与多字节转换 |
| `<wchar.h>` | 宽字符、宽字符串与 I/O |
| `<wctype.h>` | 宽字符分类与转换 |

裸机不必提供完整宿主库；存在头文件也不代表所有目标运行能力相同。不要依赖间接包含。另避免自定义保留标识符：以 `__` 或“下划线加大写字母”开头的名称由实现保留，文件作用域的下划线开头名称也应避开。不要用标准库已保留的名称自定义函数、类型或宏。

### ctype 的参数范围 <!-- entry: ctype -->
关键词：ctype isdigit isspace tolower toupper unsigned char 字符分类

来自 `<ctype.h>`。参数只能是 `EOF` 或可表示为 `unsigned char` 的值；直接传入可能为负的普通 `char` 会违反要求。

```c
unsigned char byte = (unsigned char)text[i];
if (isdigit(byte)) {
    /* 是十进制数字字符 */
}
int lower = tolower(byte);
```

从 `fgetc` 得到的 `int` 在验证不是 EOF 后可直接使用。字符分类和转换也可能受当前 locale 影响，不是任意 UTF-8 文本处理库。

### qsort 与比较函数 <!-- entry: qsort -->
关键词：qsort 排序 比较器 callback stdlib compare

比较函数返回负、零或正，表示小于、相等、大于。不要用 `a - b` 比较任意整数，减法可能溢出。

```c
int compare_int(const void *left, const void *right) {
    int a = *(const int *)left;
    int b = *(const int *)right;
    return (a > b) - (a < b);
}
/* qsort(values, count, sizeof values[0], compare_int); */
```

比较规则应一致；传入元素数、元素大小及有效数组范围。不要期待 `qsort` 保持相等元素的原始顺序。

### volatile 不是线程同步 <!-- entry: volatile -->
关键词：volatile 原子 atomic 线程 同步 MMIO 中断 寄存器

`volatile` 要求按实现约定保留对易变对象的访问，常见于硬件映射或特定信号场景；不保证操作原子，也不建立线程间同步。

```c
volatile unsigned int *register_address = NULL;
/* 硬件地址与访问规则须由平台提供；不要解引用未初始化地址 */
```

线程间共享状态应研究 `<stdatomic.h>` 与平台同步原语；MMIO 的正确性还涉及地址、对齐、访问宽度和硬件屏障，不能仅加 `volatile`。

### C 与 C++ 不要混用 <!-- entry: c-vs-cpp -->
关键词：C C++ 区别 malloc new delete free nullptr string 引用 auto bool C23 POSIX 编译器实现 底层机制 深入讨论

本册是 C17：使用 `.c` 和 C 编译器验证，不把 C++ 编译成功当作 C 合法性的证明。

- C17 没有 C++ 的引用、类、`new/delete`、`std::string`、模板与 `nullptr`。
- C 的对象指针与 `void *` 转换规则不同于 C++；字符串字面量也始终不可修改。
- C17 的 `auto` 是存储类说明符，不是 C++ 风格的变量类型推导。
- `getline`、`strdup` 等不要默认为 C17 标准库接口；确认目标标准、POSIX 与工具链扩展。
- `malloc/free` 与 `new/delete` 不交叉配对。

#### C23 增量：与 C17 主体分开阅读

C17 主要修正 C11 缺陷，没有新增同等规模的一组语言机制。下表列出 C23 重点增量，不代表完整变更清单，也不表示主机已验证全部支持。

| C23 特性 | 引入原因／场景 | 实现机制与边界 |
| --- | --- | --- |
| auto 推导、typeof / typeof_unqual | 减少重复类型声明 | 前端确定静态类型，typeof_unqual 去除顶层限定和原子属性；不是动态类型，不能照搬 C++ 的 auto&&；变长类型有特殊求值规则 |
| constexpr 对象 | 命名常量表达式 | 前端检查初始化和常量表达式规则；C23 没有因此获得 C++ constexpr 函数体系 |
| nullptr / nullptr_t | 避免整数式 NULL 的类型歧义 | 前端提供独立空指针类型，后端生成目标表示；字节不保证全零 |
| _BitInt(N) | 特殊位宽整数 | 前端保留位宽，后端选择寄存器、多字运算或库辅助；位宽不等于存储大小或硬件原生支持 |
| [[属性]] | 诊断与控制流意图 | 前端处理 nodiscard、maybe_unused、fallthrough、noreturn 等，各自语义不同，不是统一运行时检查 |
| 空初始化 {} | 简明的空初始化 | 前端按类型落实初始化规则，不等同于任意对象的 memset；C17 不采用此写法 |
| #embed | 编译期嵌入资源 | 预处理读取资源并生成记号，影响构建依赖与产物大小，不是运行时读文件 |
| stdckdint.h：ckd_add/sub/mul | 检查整数溢出 | 库宏可调用编译器内建，降低为状态位检测或范围判断；返回真表示溢出，必须检查 |
| stdbit.h | 可移植位运算查询 | 库调用目标指令或软件回退；某平台单指令不构成跨平台保证 |

先确认 `__STDC_VERSION__`、编译器与库支持表。启用标准模式不代表所有库功能均已提供。公开标准草案见 [WG14 文档目录](https://www.open-std.org/jtc1/sc22/wg14/www/docs/)（C11 N1570、C23 N3096）；草案与发布标准可能有差异。


### 数学函数与浮点限制 <!-- entry: math -->
关键词：math sqrt pow fabs fmod floor ceil round isnan isinf isfinite float FLT_EPSILON DBL_MAX 编译器实现 底层机制 深入讨论

`<math.h>` 提供数学运算与分类，`<float.h>` 提供范围和精度信息。

```c
double root = sqrt(9.0);
double magnitude = fabs(-2.5);  /* abs 处理 int，fabs 处理 double */
int finite = isfinite(root); /* 非零表示有限值 */
```

域错误、范围错误的报告方式见 `math_errhandling`，不能一律只检查 `errno`。不要假定所有实现都是 IEEE 754；`FLT_EPSILON`、`DBL_EPSILON` 也不是适合所有量级的通用比较误差。部分工具链链接时需 `-lm`。

**标准版本：C99：复数与 tgmath.h。**

**实现机制（标准要求与常见实现）：** 复数运算可降低为实部/虚部算术及库调用；泛型数学宏由实现选择对应函数，可借助内建或泛型机制。

**深入讨论与应用：** 用于信号处理；不意味着硬件有复数单指令，NaN、溢出和浮点环境限制可用优化。

### rand、srand 与随机质量 <!-- entry: random -->
关键词：rand srand RAND_MAX 随机数 伪随机 种子 random

需 `<stdlib.h>`。`rand()` 返回 0 到 `RAND_MAX`，`srand` 设置序列种子。

```c
srand(123u);               /* 同一实现内可重现 */
int sample = rand();
unsigned int small = (unsigned int)sample % 10u;
```

`% 10` 可能引入分布偏差，不能宣称严格均匀；`rand` 不适合密码、安全令牌或密钥。种子不应在每次取样前重复设置。

### 时间、日期与计时 <!-- entry: time -->
关键词：time time_t difftime clock clock_t CLOCKS_PER_SEC strftime localtime gmtime mktime

需 `<time.h>`。日历时间、CPU 时间与单调经过时间不是同一概念。

```c
time_t now = time(NULL);
if (now != (time_t)-1) {
    struct tm *parts = localtime(&now);
    if (parts != NULL) { /* 用 strftime 格式化 */ }
}
```

日历时间间隔用 `difftime`；不要假设 `time_t` 一定是某种位宽的 Unix 秒。`clock()` 反映程序 CPU 时间，失败返回 `(clock_t)-1`。`localtime`／`gmtime` 的结果可能被后续调用覆盖；C17 不提供通用单调时钟 API。

### bsearch 二分查找 <!-- entry: bsearch -->
关键词：bsearch 二分查找 排序 数组 stdlib compare

数组必须按同一比较规则排好序；比较函数的两个参数分别指向键和数组元素。

```c
int key = 5;
int *found = bsearch(&key, values, count,
                    sizeof values[0], compare_int);
if (found != NULL) { /* 使用 *found */ }
```

`compare_int` 可使用本册排序条目的比较规则。未找到返回空指针；有多个相等元素时，不保证选中哪一个。不要在未排序数组上使用它。

### 原子对象与内存顺序 <!-- entry: atomics -->
关键词：_Atomic stdatomic atomic_int atomic_fetch_add atomic_load atomic_store memory_order relaxed 原子 编译器实现 底层机制 深入讨论

`<stdatomic.h>` 在 C17 是可选能力，先检查实现。原子操作不等于相关对象整体线程安全。

```c
#include <stdatomic.h>
atomic_uint counter = ATOMIC_VAR_INIT(0u);
/* 在函数内： */
unsigned int old = atomic_fetch_add_explicit(
    &counter, 1u, memory_order_relaxed);
```

`relaxed` 保证该操作的原子性，不为其他非原子数据建立发布／获取关系。原子操作不保证 lock-free；用 `atomic_is_lock_free` 等查询。实现可定义 `__STDC_NO_ATOMICS__` 表示不支持。

**标准版本：C11：_Atomic 与 stdatomic.h。**

**实现机制（标准要求与常见实现）：** 操作降低为带内存序的中间表示；后端选择原子指令、屏障、CAS 循环或运行库锁。

**深入讨论与应用：** 用于共享计数与发布状态。同一内存序在 x86/ARM 的指令可不同；非 lock-free 类型可能需 libatomic。没看到 fence 不表示没有同步语义。

### 线程、互斥与线程局部存储 <!-- entry: threads -->
关键词：threads thrd_create thrd_join thrd_detach mtx_init mtx_lock mtx_unlock mtx_destroy _Thread_local thread_local 编译器实现 底层机制 深入讨论

`<threads.h>` 是 C17 可选库，支持情况以实现为准。

```c
_Thread_local int per_thread_count = 0; /* 文件作用域 */
/* 创建与回收：thrd_create / thrd_join，或明确 thrd_detach */
/* 互斥锁：mtx_init / mtx_lock / mtx_unlock / mtx_destroy */
```

检查有状态返回值的接口是否返回 `thrd_success`；被借用的回调参数须在工作线程访问期间存活。`<threads.h>` 的 `thread_local` 是 `_Thread_local` 的宏别名；可用 `__STDC_NO_THREADS__` 检查不支持的实现。它不是任意 RTOS 任务 API 的替代品。

**标准版本：C11：threads.h 与 _Thread_local。**

**实现机制（标准要求与常见实现）：** 线程库封装平台线程设施；TLS 通过线程指针偏移、TLS 段或动态查询定位对象。

**深入讨论与应用：** 用于每线程状态；动态库 TLS 成本可不同，线程局部不自动提供共享安全。C11/C17 可缺少标准线程库；C23 提供 thread_local 拼写。

### signal 与信号处理约束 <!-- entry: signals -->
关键词：signal raise SIGINT SIGTERM SIG_ERR sig_atomic_t 信号

需 `<signal.h>`。异步信号处理器只能做极少数被允许的操作；常见模式是设置简单标记。

```c
static volatile sig_atomic_t stop_requested = 0;
static void on_signal(int signal_number) {
    (void)signal_number;
    stop_requested = 1;
}
/* 在函数内注册并检查：signal(SIGINT, on_signal) != SIG_ERR */
```

不要在异步处理器中调用 `printf`、`malloc` 或普通锁操作。`sig_atomic_t` 不等于线程同步原语；信号触发条件与处理行为也受平台约束。

### setjmp 与 longjmp <!-- entry: nonlocal-jump -->
关键词：setjmp longjmp jmp_buf 非局部跳转

需 `<setjmp.h>`。只能跳回仍有效的调用环境，不能跳回已经返回的函数。

```c
jmp_buf environment;
if (setjmp(environment) == 0) {
    /* 正常路径；被调用代码可 longjmp(environment, 1) */
} else {
    /* 从 longjmp 返回的路径 */
}
```

`setjmp` 必须出现在标准允许的控制位置，不能随意放入赋值初始化。跳转不自动清理堆资源；包含它的函数中，两次返回间修改过的非 volatile 自动局部变量值会变为不确定。

### 退出程序与退出处理器 <!-- entry: termination -->
关键词：exit return atexit quick_exit at_quick_exit _Exit abort _Noreturn noreturn

初次调用的 `main` 返回等价于调用 `exit`；正常退出执行 `atexit` 处理器并处理标准 I/O 清理。

```c
#include <stdlib.h>
#include <stdnoreturn.h>
noreturn void fail(void) {
    exit(EXIT_FAILURE);
}
```

`quick_exit` 只执行对应的 `at_quick_exit` 处理器，不执行 `atexit` 处理器；`_Exit` 不调用已注册退出处理器。不要依赖这些省略常规清理的路径保存缓冲输出。`abort` 属于异常终止，`noreturn` 声明的函数不得正常返回。

### locale、宽字符与 Unicode 边界 <!-- entry: locale -->
关键词：locale setlocale LC_ALL LC_NUMERIC wchar wchar_t wctype uchar char16_t char32_t UTF-8

需 `<locale.h>`；locale 会影响数值解析、字符分类和多字节转换。

```c
const char *active = setlocale(LC_NUMERIC, "C");
if (active == NULL) { /* 请求的 locale 不可用 */ }
```

`wchar_t` 不保证是 Unicode 码点，也不固定为 16 或 32 位；`char16_t`／`char32_t` 类型来自 `<uchar.h>`。不要混用同一流的窄字符与宽字符 I/O；确认编码、流方向和转换状态，不把标准字符串库当作完整 Unicode 文本算法库。
