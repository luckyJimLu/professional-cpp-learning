import type { XianTuEra } from '../types';
import { CHAPTER_01 } from './chapter01';
import { CHAPTER_02 } from './chapter02';
import { CHAPTER_03 } from './chapter03';

export const ERA_01_LIANQI: XianTuEra = {
  id: 'era-01-lianqi',
  eraLabel: '第一时期 · 炼气期（第 1~3 章）',
  title: '炼气期修仙录：夯实道基',
  subtitle: '炼气初期 → 炼气小成 → 炼气中期 → 炼气后期 → 炼气大圆满',
  overview:
    '本时期涵盖全书第一部分（第 1~3 章），主人公韩小码初入现代 C++23 仙门，从一名依赖老旧 C 风格野路子的外门散修，历经炼气初期（现代语法与类型安全）、炼气中期（字符串与零拷贝视图），最终抵达炼气后期至大圆满（自文档化与专业代码规范），彻底洗去低级隐患，为迈向“筑基期（架构设计）”立下无垢道基。',
  nextEraPreview: '第二时期 · 筑基期（软件设计与抽象）',
  chapters: [CHAPTER_01, CHAPTER_02, CHAPTER_03],
  evolution: [
    {
      chapterId: 'chapter-01',
      chapterNumber: 1,
      keyword: '立规矩',
      summary:
        '以 import std;、std::println、统一初始化 {}、enum class 与 const T& 确立安全高效的语言基本功。',
    },
    {
      chapterId: 'chapter-02',
      chapterNumber: 2,
      keyword: '御字符',
      summary:
        '以 std::string 替代易溢出的 C 字符数组，以 std::string_view 实现零拷贝只读传参（同时严防绑定临时字符串），借 <charconv> 与 C++23 范围格式化打通高性能文本处理。',
    },
    {
      chapterId: 'chapter-03',
      chapterNumber: 3,
      keyword: '修风骨',
      summary:
        '践行自文档化代码、单一职责分解、保留字避坑、局部 const_cast 与确定性求值顺序，让代码既健壮又易于他人维护。',
    },
  ],
  commandments: [
    {
      id: 'era1-rule-1',
      title: '模块与安全输出',
      detail:
        '优先使用 import std; 与 std::println()，摒弃无类型安全的 printf 与易引发宏污染的旧头文件；动态格式串改用 std::vprint_unicode。',
      relatedChapterId: 'chapter-01',
      relatedChapterNumber: 1,
      relatedRoundIndex: 0,
    },
    {
      id: 'era1-rule-2',
      title: '统一初始化 {}',
      detail: '一律优先使用 {} 初始化变量与对象，杜绝未初始化杂气与静默窄化转换。',
      relatedChapterId: 'chapter-01',
      relatedChapterNumber: 1,
      relatedRoundIndex: 0,
    },
    {
      id: 'era1-rule-3',
      title: '强类型枚举',
      detail: '禁止使用旧式无作用域 enum，一律使用 enum class。',
      relatedChapterId: 'chapter-01',
      relatedChapterNumber: 1,
      relatedRoundIndex: 0,
    },
    {
      id: 'era1-rule-4',
      title: '引用替代裸指针',
      detail:
        '无所有权传递优先使用 const T& 或 T&；动态数组与集合交由 std::vector 或智能指针管理，严禁返回局部栈变量的引用或指针。',
      relatedChapterId: 'chapter-01',
      relatedChapterNumber: 1,
      relatedRoundIndex: 1,
    },
    {
      id: 'era1-rule-5',
      title: '警惕 auto 剥离',
      detail: '接收常量引用时必须显式写明 const auto& 防止隐式深拷贝；推导指针时优先使用 auto*。',
      relatedChapterId: 'chapter-01',
      relatedChapterNumber: 1,
      relatedRoundIndex: 2,
    },
    {
      id: 'era1-rule-6',
      title: '视图与所有权分离',
      detail:
        '只读字符串形参按值传递 std::string_view；严禁用 string_view 绑定临时字符串表达式，严禁将其存为类成员变量或作为函数返回值。',
      relatedChapterId: 'chapter-02',
      relatedChapterNumber: 2,
      relatedRoundIndex: 2,
    },
    {
      id: 'era1-rule-7',
      title: '自文档化与单一职责',
      detail:
        '用清晰命名与拆解小函数替代逐行翻译式注释，定期重构消除代码积垢（Cruft），不在源码中手写作者/日期等版本控制元信息。',
      relatedChapterId: 'chapter-03',
      relatedChapterNumber: 3,
      relatedRoundIndex: 0,
    },
    {
      id: 'era1-rule-8',
      title: '严守命名禁区',
      detail: '禁止在标识符中使用双下划线（__）、下划线接大写字母（_Name）或全局下划线开头（_name）。',
      relatedChapterId: 'chapter-03',
      relatedChapterNumber: 3,
      relatedRoundIndex: 1,
    },
    {
      id: 'era1-rule-9',
      title: '守护 const 与常量',
      detail:
        '用具名常量替代魔数；调用遗留非 const 接口且确认安全时，在调用点局部使用 const_cast，禁止破坏外层 const 接口。',
      relatedChapterId: 'chapter-03',
      relatedChapterNumber: 3,
      relatedRoundIndex: 1,
    },
    {
      id: 'era1-rule-10',
      title: '格式统一与求值确定',
      detail:
        '用自动化工具统一空格缩进，单行 if/else 必加 {}，严禁在同一表达式中对同一变量进行多次副作用修改（如 i++ + ++i）。',
      relatedChapterId: 'chapter-03',
      relatedChapterNumber: 3,
      relatedRoundIndex: 2,
    },
  ],
  trial: {
    filename: 'lianqi_mastery_trial.cpp',
    title: '炼气期大圆满综合试炼',
    intro:
      '下面这段代码浓缩了第一时期（第 1~3 章）中最常犯的 5 处致命心魔，请逐行点击代码排查，并给出符合现代 C++23 规范的精准诊断：',
    hint: '提示：请分别从命名规范与元信息注释（第 1、5 行）、窄化转换（第 7 行）、单行 if 括号与魔数/未定义求值顺序（第 9~10 行）、返回局部 string 的悬垂视图（第 11 行），以及 string_view 绑定临时拼接表达式（第 15 行）五个维度进行剖析。',
    codeLines: [
      { lineNumber: 1, content: '// Modified by HanXiaoma on 2026-11-20', bugId: 'era1-bug-meta-naming' },
      { lineNumber: 2, content: 'import std;' },
      { lineNumber: 3, content: 'using namespace std;' },
      { lineNumber: 4, content: '' },
      { lineNumber: 5, content: 'string_view _FormatUser(const string& prefix, int id) {', bugId: 'era1-bug-meta-naming' },
      { lineNumber: 6, content: '    double rawScore = 98.7;' },
      { lineNumber: 7, content: '    int score { rawScore }; // 窄化转换', bugId: 'era1-bug-narrowing' },
      { lineNumber: 8, content: '    string result = prefix + to_string(id);' },
      { lineNumber: 9, content: '    if (score > 90)', bugId: 'era1-bug-if-ub' },
      { lineNumber: 10, content: '        id = id++ + 3600; // 魔数与未定义求值', bugId: 'era1-bug-if-ub' },
      { lineNumber: 11, content: '    return result;', bugId: 'era1-bug-return-sv' },
      { lineNumber: 12, content: '}' },
      { lineNumber: 13, content: '' },
      { lineNumber: 14, content: 'int main() {' },
      { lineNumber: 15, content: '    string_view title { "VIP_"s + "User" };', bugId: 'era1-bug-temp-sv' },
      { lineNumber: 16, content: '    auto msg = _FormatUser(title, 1);' },
      { lineNumber: 17, content: '    println("{}", msg);' },
      { lineNumber: 18, content: '}' },
    ],
    bugs: [
      {
        id: 'era1-bug-meta-naming',
        lineNumber: 5,
        secondaryLineNumber: 1,
        codeExcerpt: '// Modified by HanXiaoma... & string_view _FormatUser(const string& prefix, int id)',
        dimension: '维度一 · 命名禁区与元信息注释',
        category: '规范违禁',
        title: '心魔一 · 手写元信息注释、触犯 _FormatUser 保留字禁区与旧式形参',
        prompt: '第 1 行与第 5 行集中违反了哪几项炼气期核心戒律？',
        options: [
          {
            id: 'e1-1a',
            label:
              '作者/日期元信息应交由 Git 记录；_FormatUser 以下划线接大写开头触犯标准保留字禁区（UB）；只读前缀形参应按值传 string_view',
            isCorrect: true,
            feedback:
              '精准破妄！删除源码元信息注释，改用合法清晰的 formatUser(string_view prefix, int id)，一举消除保留字风险与隐式拷贝。',
          },
          {
            id: 'e1-1b',
            label: '仅第 1 行注释过长需要精简，_FormatUser 在函数名中完全合法',
            isCorrect: false,
            feedback:
              '不对。C++ 标准明确规定：任何作用域内以下划线接大写字母（_Name）开头的标识符均为实现保留，用户代码使用即属 UB。',
          },
          {
            id: 'e1-1c',
            label: '必须给 prefix 加上 const char* 才能避免与第 16 行 string_view 冲突',
            isCorrect: false,
            feedback:
              '不对。现代 C++ 只读字符串形参首选按值传递 std::string_view，既能零拷贝接收 string_view，也能接收 string 与字面量。',
          },
        ],
        explanation:
          '删除应由 Git 管理的作者/日期注释；将 _FormatUser 重命名为合规清晰的 formatUser；将只读形参 const string& prefix 改为按值传递 string_view prefix（顺带修复第 16 行 string_view 无法隐式转 const string& 的编译错误）。',
        fixedLine: 'string formatUser(string_view prefix, int id) {',
      },
      {
        id: 'era1-bug-narrowing',
        lineNumber: 7,
        codeExcerpt: 'int score { rawScore }; // 窄化转换',
        dimension: '维度二 · 统一初始化防窄化',
        category: '编译错误',
        title: '心魔二 · 大括号结界拦截 double → int 窄化转换',
        prompt: '第 7 行将 double 变量 rawScore 用 {} 初始化给 int score，小绿瓶会如何反应？',
        options: [
          {
            id: 'e1-2a',
            label: '编译报错：{} 严禁窄化转换，确需截断须显式使用 static_cast<int>(rawScore)',
            isCorrect: true,
            feedback: '洞若观火！大括号结界绝不姑息灵力截断，显式立军令状 static_cast<int>(rawScore) 或直接使用 double 比较才是正道。',
          },
          {
            id: 'e1-2b',
            label: '因为 rawScore 是变量而非字面量，{} 会放行并四舍五入为 99',
            isCorrect: false,
            feedback: '不对。无论字面量还是变量，double 转 int 都属于窄化转换，{} 一律在编译期报错。',
          },
          {
            id: 'e1-2c',
            label: '退回老式 int score = rawScore; 是现代 C++ 推荐的绕过方式',
            isCorrect: false,
            feedback: '不对。用 = 掩盖窄化会重新引入隐蔽截断隐患；正确做法是保持 {} 并显式使用 static_cast<int>()。',
          },
        ],
        explanation:
          '统一初始化 {} 将浮点转整型视为非法窄化转换并直接报错。应改为 int score { static_cast<int>(rawScore) }; 或直接以具名 double 常量比较。',
        fixedLine: 'constexpr double kRawScore { 98.7 };\nconst int score { static_cast<int>(kRawScore) };',
      },
      {
        id: 'era1-bug-if-ub',
        lineNumber: 10,
        secondaryLineNumber: 9,
        codeExcerpt: 'if (score > 90)\n    id = id++ + 3600;',
        dimension: '维度三 · 单行 if 括号、魔数与未定义求值',
        category: '运行期未定义行为',
        title: '心魔三 · 单行 if 缺花括号、硬编码魔数 3600 与 id = id++ 未定义求值',
        prompt: '第 9~10 行同时潜伏了哪三重代码风骨与语义大忌？',
        options: [
          {
            id: 'e1-3a',
            label:
              '单行 if 缺少 {} 易致后续追加语句逃逸；3600 为无含义魔数；id = id++ 在单条语句内重复修改同一变量触发未定义行为（UB）',
            isCorrect: true,
            feedback:
              '三害尽除！单句 if 必加 {}，提取 constexpr int kBonusOffset { 3\'600 }，并将副作用拆成清晰确定的 id += kBonusOffset + 1;。',
          },
          {
            id: 'e1-3b',
            label: 'id = id++ + 3600 必然严格等价于 id = id + 3601，只是不够美观',
            isCorrect: false,
            feedback:
              '大错特错！同一表达式中对 id 既有赋值又有后置自增且无先后序保障，属于典型未定义行为，不同编译器会产生完全不同的结果。',
          },
          {
            id: 'e1-3c',
            label: '只要把 3600 放进宏 #define OFFSET 3600 就能彻底解决全部问题',
            isCorrect: false,
            feedback:
              '不对。现代 C++ 应使用 constexpr 具名常量而非宏，同时还必须补齐 {} 并消除 id = id++ 的未定义求值顺序。',
          },
        ],
        explanation:
          '单行 if 必须加上 {} 防止逻辑逃逸；3600 应提炼为具名 constexpr 常量（如 kHighScoreIdOffset）；严禁写 id = id++，应改为确定性写法 id += kHighScoreIdOffset + 1;（且应在拼接 result 前或按明确业务语义计算）。',
        fixedLine: 'constexpr int kHighScoreOffset { 3\'600 };\nif (score > 90) {\n    id += kHighScoreOffset + 1;\n}',
      },
      {
        id: 'era1-bug-return-sv',
        lineNumber: 11,
        codeExcerpt: 'return result; // 函数返回类型却是 string_view',
        dimension: '维度四 · 返回局部对象视图的生命周期反噬',
        category: '运行期未定义行为',
        title: '心魔四 · 从函数返回局部 std::string 的 string_view（悬垂视图）',
        prompt: '第 11 行返回局部对象 result 给返回类型为 string_view 的函数，退出函数瞬间会发生什么？',
        options: [
          {
            id: 'e1-4a',
            label: '局部 result 随栈帧销毁，返回的 string_view 立即悬垂，第 17 行打印即触发未定义行为',
            isCorrect: true,
            feedback:
              '剑指要害！函数返回字符串一律按值返回拥有所有权的 std::string，依托 C++17/23 NRVO 与强制拷贝消除实现零拷贝安全返回。',
          },
          {
            id: 'e1-4b',
            label: 'C++17 强制拷贝消除会自动延长 result 的生命周期给 string_view 使用',
            isCorrect: false,
            feedback: '不对。拷贝消除只适用于按值返回同类对象（std::string），绝无法拯救指向已销毁局部对象的 string_view。',
          },
          {
            id: 'e1-4c',
            label: '把第 16 行改为 const auto& msg 就能避免悬垂',
            isCorrect: false,
            feedback: '不对。只要函数返回的是指向局部变量的 string_view，调用方无论怎么接都拿到的是废墟指针。',
          },
        ],
        explanation:
          'result 是栈上局部 std::string，函数返回瞬间即析构。返回 string_view 必然导致悬垂视图；应将函数返回类型改为 std::string，直接按值返回享受 NRVO 零拷贝。',
        fixedLine: 'string formatUser(string_view prefix, int id) { ... return result; }',
      },
      {
        id: 'era1-bug-temp-sv',
        lineNumber: 15,
        codeExcerpt: 'string_view title { "VIP_"s + "User" };',
        dimension: '维度五 · string_view 绑定临时拼接表达式',
        category: '运行期未定义行为',
        title: '心魔五 · 朝露悬垂：string_view 绑定临时字符串表达式 "VIP_"s + "User"',
        prompt: '第 15 行用 string_view 接收 "VIP_"s + "User" 拼接结果，存在什么致命问题？',
        options: [
          {
            id: 'e1-5a',
            label:
              '"VIP_"s + "User" 产生的临时 std::string 在本行分号处即销毁，title 随即悬垂（且原第 16 行无法隐式转 const string&）',
            isCorrect: true,
            feedback:
              '圆满破妄！朝露临时莫驻眼：需要持久化拼接字符串时必须使用拥有所有权的 std::string（或直接用编译期拼接字面量 string_view title { "VIP_User"sv }）。',
          },
          {
            id: 'e1-5b',
            label: '因为带了 s 后缀，"VIP_"s + "User" 会被存放在只读字面量池永久有效',
            isCorrect: false,
            feedback: '不对。"VIP_"s 构造了一个运行期临时 std::string，相加产生的新临时对象在分号处立刻析构，导致 title 悬垂。',
          },
          {
            id: 'e1-5c',
            label: '改为 const string_view title 即可将临时对象寿命延长到 main 结束',
            isCorrect: false,
            feedback: '不对。string_view 是普通类对象而非引用，加 const 不会触发任何临时对象生命周期延长！',
          },
        ],
        explanation:
          '表达式 "VIP_"s + "User" 创建运行期临时 std::string，在分号结束时销毁，令 title 成为悬垂视图。应改为 string title { "VIP_"s + "User" }; 或直接使用无拼接字面量 constexpr string_view title { "VIP_User"sv };。',
        fixedLine: 'const string title { "VIP_"s + "User" }; // 或 constexpr string_view title { "VIP_User"sv };',
      },
    ],
    fixedFullCode: `import std;
using namespace std;
using namespace std::string_literals;

string formatUser(string_view prefix, int id) {
    constexpr double kRawScore { 98.7 };
    constexpr int kHighScoreThreshold { 90 };
    constexpr int kHighScoreIdOffset { 3'600 };

    const int score { static_cast<int>(kRawScore) };
    if (score > kHighScoreThreshold) {
        id += kHighScoreIdOffset + 1;
    }

    return format("{}_{}", prefix, id);
}

int main() {
    const string title { "VIP_"s + "User" };
    const auto msg { formatUser(title, 1) };
    println("{}", msg);
}`,
  },
};
