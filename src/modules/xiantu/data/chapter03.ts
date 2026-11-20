import type { XianTuChapter } from '../types';

export const CHAPTER_03: XianTuChapter = {
  id: 'chapter-03',
  chapterNumber: 3,
  shortName: '神清骨自秀 · 立规矩',
  title: '第三章 · 神清骨自秀，立规成方圆',
  stageLabel: '主线 · 炼气期（第 3/3 章）',
  realmStage: '炼气后期 → 炼气大圆满',
  prologue:
    '韩小码已臻炼气后期，手头法诀威力不俗，可写出的代码却如一团乱麻：满篇废话注释、三百行巨无霸函数、触犯禁区的怪异命名，甚至在一条语句里连续自增炫技。宗门长老告诫他：“法力再强，若心性浮躁、章法混乱，终究难入筑基大道！”',
  heroPlateId: 'ch3-hero-codecraft',
  heroImageAlt: '古典墨玉规矩方圆与模块化代码版式图版',
  heroCaption: '图 3 · 炼气大圆满 · 规矩方圆与单一职责代码风骨图版',
  heroVerse: '「命名胜过万言书，单句亦须花括号。」',
  heroTagline: '第 3/3 章 · 修风骨：自文档化、函数分解、命名禁区、局部 const_cast 与确定性求值',
  artifacts: [
    {
      id: 'self-doc-scroll',
      name: '留白心经',
      syntax: '自文档化代码 Self-Documenting Code',
      identity: '以清晰命名与类型表达意图的无上心法',
      superpower: '让代码本身如白话般通透，仅用注释补充前置/后置契约与算法原理',
      weakness: '若用逐行翻译式注释掩盖烂代码，反而制造噪音与过时误导',
      plateId: 'ch3-art-selfdoc',
      imageAlt: '留白心经古籍版面图版，象征清晰克制的自文档化代码',
      legacyCode: `// Author: HanXiaoma 2026-11-20 (应交由 Git 记录)\n// 如果 result 模 2 等于 0\nif (result % 2 == 0) { /* ... */ }`,
      modernCode: `/// @pre value 为有效待检整数\nconstexpr bool isEven(int value) noexcept {\n    return (value % 2) == 0;\n}\n\nif (isEven(result)) { /* 代码本身即白话 */ }`,
      comparisonNote:
        '好代码靠命名与函数自解释；作者与修改日期交由 Git 记录，注释只留给“为何如此”以及前置/后置契约与异常说明。',
    },
    {
      id: 'decomposition-sword',
      name: '分光化影诀',
      syntax: '函数分解 Decomposition',
      identity: '将庞然大物拆解为单一职责微粒的剑诀',
      superpower: '眯眼远观代码轮廓亦觉疏密有致，每函只办一事，易于测试与重构',
      weakness: '贪快堆砌“补丁积垢（Cruft）”，最终炼出数百行嵌套深渊，无人敢改',
      plateId: 'ch3-art-decompose',
      imageAlt: '分光化影诀结构拆解图版，展示巨型函数化整为零的单一职责结构',
      legacyCode: `void handleOrder(Order& o) {\n    // 300 行：校验 + 算税 + 扣库存 + 写库 + 发邮件全挤在一处\n    // 反复打补丁后积垢重重，深层嵌套密不透风\n}`,
      modernCode: `void handleOrder(Order& order) {\n    validateOrder(order);\n    const auto total { calculateTotalWithTax(order) };\n    reserveInventory(order);\n    persistAndNotify(order, total);\n}`,
      comparisonNote:
        '以“眯眼辨形法”审视代码密度，在单元测试护法下持续重构（提取函数、提取类、封装成员），及时斩除积垢（Cruft）。',
    },
    {
      id: 'naming-mirror',
      name: '正名宝鉴',
      syntax: '命名规范 Naming Conventions',
      identity: '辨析万千变量真身的宗门法鉴',
      superpower: '见名知意（如 m_ 标识成员、is 标识布尔），精准传达用途与作用域',
      weakness: '误触标准库保留字禁区（双下划线 __ 或下划线接大写 _Name），即刻遭天道反噬',
      plateId: 'ch3-art-naming',
      imageAlt: '正名宝鉴铜镜图版，对比合法语义命名与 C++ 保留字禁区',
      legacyCode: `int __myVar { 0 };     // 含双下划线：UB 禁区！\nclass _Controller {};  // 下划线接大写：UB 禁区！\nint _globalId { 1 };   // 全局下划线开头：UB 禁区！`,
      modernCode: `class TaskController {\npublic:\n    bool isActive() const noexcept { return m_isActive; }\n    int getRetryCount() const noexcept { return m_retryCount; }\nprivate:\n    bool m_isActive { true };\n    int m_retryCount { 0 };\n};`,
      comparisonNote:
        '严守 C++ 保留标识符铁律，舍弃冗余匈牙利类型前缀，统一用 m_、is、get/set 表达语义与作用域。',
    },
    {
      id: 'iron-ruler',
      name: '铁律戒尺',
      syntax: '常量、局部解封与确定性求值',
      identity: '驱逐“魔数”、守护 const 与求值顺序的戒律法器',
      superpower: '以具名常量替代神秘数字，局部 const_cast 对接旧库，杜绝同类副作用混写',
      weakness: '在单一表达式内多次读写同一变量，引发未定义行为反噬',
      plateId: 'ch3-art-ruler',
      imageAlt: '铁律戒尺矩尺图版，象征具名常量、必加大括号与确定性求值',
      legacyCode: `if (score > 90)\n    val = val++ + 86400; // 缺大括号 + 魔数 + 未定义求值 UB！`,
      modernCode: `constexpr int kSecondsPerDay { 86'400 };\nif (score > 90) {\n    val += kSecondsPerDay + 1;\n} // 确定性求值 + 单句亦加花括号`,
      comparisonNote:
        '魔数一律替换为具名常量或 <numbers> 常量；对接旧非 const 接口仅在调用点局部 const_cast；单条语句绝不重复修改同一变量。',
    },
  ],
  rounds: [
    {
      id: 'ch3-r1',
      index: 1,
      total: 3,
      title: '第 1 回 · 留白胜万言，眯眼斩积垢',
      shortTitle: '留白胜万言，眯眼斩积垢',
      realm: '炼气后期',
      peril:
        '韩小码给每行代码都加上翻译式注释（如 // 如果 result 模 2 等于 0），却在日后改逻辑时忘了改注释，坑惨了同门师弟；同时他那座三百行的巨无霸函数在反复打补丁后堆积成无人敢碰的“积垢（Cruft）”。',
      question:
        '师兄：究竟何时该写注释？当代码在日积月累的修补中变得臃肿不堪时，又该如何施展分解与重构之术？',
      guidance: [
        '好代码天然可读，注释只应解释“为何这么做”以及代码无法表达的契约（前置/后置条件、抛出异常），绝不可逐行翻译语法——把 result % 2 == 0 封装成 bool isEven(int) 远胜十行注释！至于作者名、修改日期等元信息，全交由版本控制系统（Git）铭刻，严禁写入源码。',
        '拆解函数当遵循“单一职责”与“眯眼辨形法”：眯眼不看具体字句，只看代码黑白轮廓，凡黑压压密不透风处，便是分解不足之兆。面对堆积的“积垢（Cruft）”，须在单元测试护法下定期重构（Refactoring）（提取函数、提取类、封装数据成员），将庞然大物化整为零。',
      ],
      enlightenment: {
        mainline: '树立自文档化代码理念，以单一职责分解与重构消除代码积垢。',
        breakthrough: '巩固【炼气后期】，代码风骨初现清朗之气。',
        verse: '命名胜过万言书，眯眼观形斩积垢。',
      },
      simulatorType: 'ch3-r1-selfdoc-squint',
      simulatorTitle: '留白心经 & 眯眼辨形演练台',
      simulatorSubtitle: '对比翻译式注释与自文档化封装，并开启真实“眯眼模糊视角”审视代码积垢',
    },
    {
      id: 'ch3-r2',
      index: 2,
      total: 3,
      title: '第 2 回 · 正名避雷区，驱魔护真常',
      shortTitle: '正名避雷区，驱魔护真常',
      realm: '炼气后期',
      peril:
        '韩小码起名写出了 int __myVar; 和 class _Controller;，直接与标准库内部宏定义相撞报错；紧接着他在代码里硬编码 86400 等魔数，又为了调用一个老旧第三方非 const 函数，一气之下删光了外层所有函数的 const 修饰符。',
      question:
        '师兄：C++ 命名有哪些绝对不可触碰的保留字禁区？面对不兼容 const 的遗留第三方库，又该如何避免 const 防线向上全线溃败？',
      guidance: [
        'C++ 标准铁律：任何包含双下划线（__）、以下划线接大写字母（_Name）开头，以及全局命名空间中以下划线（_name）开头的标识符，全部保留给编译器与标准库专用，触之即属未定义行为！命名应舍弃冗余的匈牙利类型前缀，采用语义清晰的 m_、is、get/set 前缀。',
        '魔数必须替换为具名常量（或 <numbers> 标准数学常量）。而面对遗留第三方非 const 接口，只要确信其不会修改数据，应在调用点局部使用 const_cast() 临时解除 const 封印，绝不可向上删除外层接口的 const 契约！',
      ],
      enlightenment: {
        mainline: '严守保留标识符禁区，用具名常量与局部 const_cast 捍卫类型与常量防线。',
        breakthrough: '触及【炼气大圆满】门槛，工程规范意识融会贯通。',
        verse: '莫触下划保留地，局部解封护真常。',
      },
      simulatorType: 'ch3-r2-naming-constcast',
      simulatorTitle: '正名宝鉴 & 局部解封检测台',
      simulatorSubtitle: '实时输入标识符检验 C++ 保留字禁区，对比魔数替换与局部 const_cast 守常',
    },
    {
      id: 'ch3-r3',
      index: 3,
      total: 3,
      title: '第 3 回 · 排版定方圆，求值忌未定（炼气期大圆满大劫）',
      shortTitle: '排版定方圆，求值忌未定',
      realm: '炼气后期 → 炼气大圆满',
      isBossTrial: true,
      peril:
        '韩小码与师兄因 Tab/空格缩进及大括号换行风格不同导致版本合并冲突；更致命的是，他在一条表达式里炫技写下 val = val++ + 86400;，结果在两个编译器上算出了截然不同的数字，险些在炼气大圆满关头走火入魔！',
      question:
        '师兄：为何单行 if 也要坚持加上大括号，团队排版又该如何一统？而 val = val++ 这类写法究竟触犯了哪条天道大忌？',
      guidance: [
        '排版之争须靠自动化工具（IDE 保存格式化与 Git 钩子）在团队内强制统一，统一用空格替代 Tab，且单条语句的 if/else 也必须加上大括号 {}，以防日后追加语句时逻辑逃逸或遭 C 宏暗算。',
        '至于 val = val++，则直接触犯了未定义行为（UB）天条——同一条语句中，严禁对同一个变量进行多次带有副作用的读写操作！编译器对多数子表达式的求值顺序与副作用生效时机拥有自由裁量权，写此代码无异于自毁道基。铭记宗门最高戒律：永远把代码写得直白清晰，仿佛下一位维护者是知道你住处的暴躁精神病患者！',
      ],
      enlightenment: {
        mainline: '以自动化工具统一格式契约，戒除未定义求值顺序炫技，完成第一部分全部修炼。',
        breakthrough: '渡过炼气期大圆满天劫，正式晋升【炼气大圆满】，随时可冲击第二时期 · 筑基期（软件设计与抽象）！',
        verse: '单句亦须花括号，写码如防暴躁客。',
      },
      simulatorType: 'ch3-r3-style-ub',
      simulatorTitle: '排版方圆 & 求值未定推演台',
      simulatorSubtitle: '演示无括号单行 if 逻辑逃逸事故，对比 val = val++ 在不同编译器上的 UB 分歧',
    },
  ],
};
