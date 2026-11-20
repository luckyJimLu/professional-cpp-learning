import type { XianTuChapter } from '../types';
import heroXiantuScroll from '../../../assets/images/hero_xiantu_scroll_1795134919588.jpg';
import artifactModuleJade from '../../../assets/images/artifact_module_jade_1795134921772.jpg';
import artifactBraceSeal from '../../../assets/images/artifact_brace_seal_1795134919772.jpg';
import artifactReferenceBond from '../../../assets/images/artifact_reference_bond_1795134919833.jpg';
import artifactAutoMirror from '../../../assets/images/artifact_auto_mirror_1795134922449.jpg';

export const CHAPTER_01: XianTuChapter = {
  id: 'chapter-01',
  chapterNumber: 1,
  shortName: '弃旧纳新 · 现代道基',
  title: '第一章 · 弃旧纳新，初定现代 C++ 道基',
  stageLabel: '主线 · 炼气期（第 1/3 章）',
  realmStage: '炼气初期 → 炼气小成',
  prologue:
    '韩小码背着装满泛黄 C 语言竹简的破旧行囊，踏入现代 C++23 仙门山门。看着漫山遍野灵气充沛的新式法阵，他深知昔日那套靠裸指针和宏定义拼凑的野路子已然过时，唯有重塑吐纳之法，方能在此立足。',
  heroImageUrl: heroXiantuScroll,
  heroImageAlt: '古典水墨仙山与悬浮青玉模块竹简的修仙画卷',
  heroCaption: '图 1 · 炼气初期 · 现代 C++23 山门与青玉模块竹简',
  heroVerse: '「百卷竹简一朝弃，花括锁灵窄化消。」',
  heroTagline: '第 1/3 章 · 立规矩：模块、统一初始化、引用、const 与按值返回',
  artifacts: [
    {
      id: 'module-jade',
      name: '模块玉简',
      syntax: 'import std;',
      identity: 'C++23 统御标准库万法的本命玉简',
      superpower: '一念导入整个标准库，免去百卷头文件拼接，编译迅疾且无宏污染',
      weakness: '旧时代老炉鼎（编译器）若未开启 C++23 支持便强行催动，必遭编译报错反噬',
      imageUrl: artifactModuleJade,
      imageAlt: '刻有精细几何纹路的温润青玉模块玉简',
      legacyCode: `#include <iostream>\n#include <vector>\n#include <string>\n#include <cstdio>\n\nprintf("火候: %d\\n", 99); // 无编译期类型安全校验`,
      modernCode: `import std;\n\n// 一念引入整个标准库，无宏污染、编译迅疾\nstd::println("火候: {}", 99);`,
      comparisonNote:
        'import std; 直接加载预编译标准库模块接口，消除头文件重复解析与宏污染，搭配 std::println() 实现编译期类型校验。',
    },
    {
      id: 'brace-seal',
      name: '大括号结界',
      syntax: '统一初始化 {}',
      identity: '守护灵力纯度的上古封印阵法',
      superpower: '一视同仁初始化变量、结构体与对象，空括号 {} 可涤荡内存残余杂气',
      weakness: '绝不容忍任何灵力流失（窄化转换，如 double 转 int），触之即刻炸炉报错',
      imageUrl: artifactBraceSeal,
      imageAlt: '青铜与青玉雕琢的八角大括号结界法印',
      legacyCode: `int firePower = 3.14; // 静默截断为 3，不报错\nint spirit;           // 未初始化，残留内存随机垃圾`,
      modernCode: `int firePower { 3.14 }; // 编译报错：拦截窄化转换\nint spirit {};          // 空括号零初始化，恒定归零\nint exact { static_cast<int>(3.14) }; // 显式立军令状`,
      comparisonNote:
        '统一初始化 {} 兼顾语法统一、零初始化清毒与防窄化转换铁壁；确需截断精度时须显式书写 static_cast<int>()。',
    },
    {
      id: 'reference-bond',
      name: '同命契约',
      syntax: '引用 T& / const T&',
      identity: '替代无鞘飞剑（裸指针）的安全传功纽带',
      superpower: '绑定本尊后如影随形，配合 const 护体可免除大件法宝拷贝之苦',
      weakness: '契约一旦缔结便从一而终，无法改绑他人；若绑定栈上短命临时变量，必遭反噬',
      imageUrl: artifactReferenceBond,
      imageAlt: '朱红丝结牢牢紧系的两枚青玉环，象征不可改绑的同命契约',
      legacyCode: `void inspect(const Employee* emp) {\n    if (emp == nullptr) return; // 每次判空且归属不明\n    std::println("{}", emp->name);\n}`,
      modernCode: `void inspect(const Employee& emp) {\n    // 不可为空、永不改绑、零拷贝且只读护体\n    std::println("{}", emp.name);\n}`,
      comparisonNote:
        '无所有权传递大对象首选 const T&；动态数组与集合交由 std::vector 或智能指针托管。',
    },
    {
      id: 'auto-mirror',
      name: '推演灵镜',
      syntax: 'auto 关键字',
      identity: '自动窥探表达式真身的法镜',
      superpower: '编译期自动推演复杂返回类型，大幅减少冗长咒文书写',
      weakness: '天生自带“剥离滤镜”，会悄悄抹去 const 与引用属性，暗中触发深拷贝',
      imageUrl: artifactAutoMirror,
      imageAlt: '古朴温润的青铜圆形推演灵镜',
      legacyCode: `const std::string& foo();\nauto f1 { foo() };    // 剥离 const 与 &，暗中深拷贝！\nconst auto p1 { &i }; // 实为 int* const，而非 const int*`,
      modernCode: `const std::string& foo();\nconst auto& f2 { foo() }; // 保住常量引用，真正零拷贝\nconst auto* p3 { &i };    // 清晰推导为 const int*`,
      comparisonNote:
        'auto 默认剥离顶层 const 与引用属性；欲保引用必写 const auto&，推导指针务必补写星号 const auto*。',
    },
  ],
  rounds: [
    {
      id: 'ch1-r1',
      index: 1,
      total: 3,
      title: '第 1 回 · 弃旧头文件，括号锁灵气',
      shortTitle: '弃旧头文件，括号锁灵气',
      realm: '炼气初期',
      peril:
        '韩小码刚在洞府落座，习惯性地刻下几十行 #include 咒文，结果不仅编译慢如老牛，还在声明 int firePower = 3.14; 时被老式等号暗中削去小数，导致丹炉控温差之毫厘、险些炸炉。',
      question:
        '师兄：你满篇 #include 让预处理器反复复制文本，老式等号 = 又对数据截断网开一面；C++23 时代，为何入门第一课便是 import std; 与 {} 统一初始化？',
      guidance: [
        '此事需从根子上说起：import std; 直接引动标准库灵脉，编译器无需重复解析文本，且不会暴露内部杂乱定义；输出亦当弃用无类型安全的 printf，改用编译期校验类型的 std::println()。',
        '至于 {} 统一初始化，既是语法大一统，更是防止“窄化转换”的铁壁防线。空括号 {} 可触发零初始化，彻底清除未初始化变量里的内存随机毒气；一旦试图把 3.14 塞进 int x { 3.14 };，小绿瓶（编译器）便会当场亮红灯报错。若确需舍弃精度，必须显式祭出 static_cast<int>(3.14) 立下军令状。',
      ],
      enlightenment: {
        mainline: '以 import std;、std::println 与 {} 统一初始化建立现代 C++ 第一道防线。',
        breakthrough: '踏入【炼气初期】，告别头文件泥潭与隐式窄化隐患。',
        verse: '百卷竹简一朝弃，花括锁灵窄化消。',
      },
      simulatorType: 'ch1-r1-module-brace',
      simulatorTitle: '模块灵脉 & 大括号窄化双法阵',
      simulatorSubtitle: '切换演练 import std; 预处理对比与 {} 统一初始化窄化拦截',
    },
    {
      id: 'ch1-r2',
      index: 2,
      total: 3,
      title: '第 2 回 · 弃剑修契约，左右辨真常',
      shortTitle: '弃剑修契约，左右辨真常',
      realm: '炼气初期 → 炼气小成',
      peril:
        '韩小码在函数间传递动态分配的裸指针时漏写了 delete[]，灵力池瞬间泄漏；紧接着他想保护指针指向的数据不被修改，却误写成了 int* const ip { new int[10] };，结果数据依旧被随意篡改，指针反倒被焊死在原地。',
      question:
        '师兄：在无需转移内存所有权时，为何引用（Reference）远胜裸指针？面对 const int* 与 int* const 的迷踪步，又该如何一眼辨清真常？',
      guidance: [
        '引用即本尊的别名，天生不可为空且从一而终，是比裸指针安全百倍的“同命契约”。凡函数无需修改传入的大对象，一律奉上 const T& 常量引用，既免去拷贝损耗，又保本尊金身不坏；涉及动态数组与集合，直接交由 std::vector 托管。',
        '辨析 const 修饰位置只需八字口诀——“紧贴左侧，从右向左”：const 默认修饰它左边紧挨着的成分，唯独位于最左边时才修饰右侧类型。因此 int const* 与 const int* 皆为“指向常量整数的指针”（数据不可改），而 int* const 则是“指向整数的常量指针”（指针不可改）。类中的只读查询方法亦须加冕 const（如 getSalary() const）。',
      ],
      enlightenment: {
        mainline: '用引用与 const 正确性规范资源访问权限，摒弃无所有权的裸指针。',
        breakthrough: '晋升【炼气小成】，初步掌握 const 契约与引用传功。',
        verse: '同命契约胜无鞘，紧贴左侧辨真常。',
      },
      simulatorType: 'ch1-r2-ref-const',
      simulatorTitle: '同命契约 & const 辨真常双法阵',
      simulatorSubtitle: '对比裸指针泄漏/悬垂与 const T&，并实测 const 左右修饰拦截',
    },
    {
      id: 'ch1-r3',
      index: 3,
      total: 3,
      title: '第 3 回 · 灵镜防剥离，传值返真元（章末大劫）',
      shortTitle: '灵镜防剥离，传值返真元',
      realm: '炼气小成',
      isBossTrial: true,
      peril:
        '韩小码调用返回庞大名册常量引用的函数 const string& foo()，随手写下 auto f1 { foo() };，竟在暗中触发了全量深拷贝；随后他在炼制员工档案系统时，又险些从函数里直接返回局部栈变量的引用 Employee&，眼看栈帧销毁在即，悬垂幽灵已扑面而来！',
      question:
        '师兄：auto 为何会悄悄把零拷贝的常量引用变成深拷贝？而在现代 C++17/23 中，究竟该如何安全且零损耗地从函数返回大对象？',
      guidance: [
        'auto 的推演法则天生会剥离表达式顶层的 const 与引用属性！auto f1 { foo() } 会把 const string& 还原为纯粹的 string 值类型从而引发拷贝，想要零拷贝必须显式写明 const auto& f2 { foo() }；推导指针时亦应加上星号写成 const auto*。',
        '至于函数返回大对象，严禁返回局部栈变量的引用或指针（函数返回即栈帧销毁，必成悬垂指针），亦应摒弃丑陋的输出参数。现代 C++ 自 C++17 起已确立“强制复制/移动消除（Mandatory Elision）”铁律，配合命名返回值优化（NRVO），直接按值返回（Return by Value）即可在调用者目标内存上原地构造对象，全程零拷贝、零移动！',
      ],
      enlightenment: {
        mainline: '驾驭 const auto& 推演与按值返回优化，构建出清晰的《员工记录系统》。',
        breakthrough: '稳固【炼气小成】境界，圆满通过第一章考验。',
        verse: '灵镜欲保加引用，帐篷既拆莫留影。',
      },
      simulatorType: 'ch1-r3-auto-nrvo',
      simulatorTitle: '推演灵镜 & NRVO 返真双法阵',
      simulatorSubtitle: '透视 auto 剥离滤镜的真实推导类型，单步推演栈帧销毁与拷贝消除',
    },
  ],
};
