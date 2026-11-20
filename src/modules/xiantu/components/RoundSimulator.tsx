import { type ReactNode, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Eye,
  RotateCcw,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import type { RoundSimulatorType } from '../types';

interface RoundSimulatorProps {
  type: RoundSimulatorType;
  title: string;
  subtitle: string;
}

export function RoundSimulator({ type, title, subtitle }: RoundSimulatorProps) {
  return (
    <div className="rounded-xl bg-white dark:bg-[#151D1B] border border-[#141918]/10 dark:border-[#E8ECEA]/10 p-6 flex flex-col animate-panel-reveal">
      <div className="pb-4 mb-5 border-b border-[#141918]/10 dark:border-[#E8ECEA]/10">
        <p className="text-xs font-medium tracking-[0.12em] text-[#1E6B52] dark:text-[#5AB897] mb-1">
          本回演练法阵
        </p>
        <h4 className="font-editorial text-lg font-semibold text-[#141918] dark:text-[#F0F4F2]">
          {title}
        </h4>
        <p className="text-xs text-[#596662] dark:text-[#98A6A1] mt-1 leading-relaxed">
          {subtitle}
        </p>
      </div>

      <div className="flex-1">
        {/* Chapter 1 Dual-Tab Simulators */}
        {type === 'ch1-r1-module-brace' && (
          <DualLabSwitch
            leftLabel="模块印 import std;"
            rightLabel="大括号 {} 窄化拦截"
            left={<ModuleImportSim />}
            right={<UniformInitSim />}
          />
        )}
        {type === 'ch1-r2-ref-const' && (
          <DualLabSwitch
            leftLabel="同命契约与内存态"
            rightLabel="const 指针从右向左"
            left={<ReferenceMemorySim />}
            right={<ConstPointerSim />}
          />
        )}
        {type === 'ch1-r3-auto-nrvo' && (
          <DualLabSwitch
            leftLabel="auto 滤镜推演"
            rightLabel="栈帧销毁与 NRVO"
            left={<AutoDeductionSim />}
            right={<ReturnValueNrvoSim />}
          />
        )}

        {/* Chapter 2 Dual-Tab Simulators */}
        {type === 'ch2-r1-cstring-ctad' && (
          <DualLabSwitch
            leftLabel="C 串 \\0 差一越界"
            rightLabel="CTAD 字面量后缀"
            left={<CStringNullTrapSim />}
            right={<CtadStringLiteralSim />}
          />
        )}
        {type === 'ch2-r2-sv-charconv' && (
          <DualLabSwitch
            leftLabel="string_view 零拷贝"
            rightLabel="<charconv> 缓冲转换"
            left={<StringViewZeroCopySim />}
            right={<CharconvBufferSim />}
          />
        )}
        {type === 'ch2-r3-println-dangling' && (
          <DualLabSwitch
            leftLabel="println 范围格式化"
            rightLabel="悬垂视图生命周期"
            left={<PrintlnRangesSim />}
            right={<DanglingStringViewSim />}
          />
        )}

        {/* Chapter 3 Dual-Tab Simulators */}
        {type === 'ch3-r1-selfdoc-squint' && (
          <DualLabSwitch
            leftLabel="自文档化 vs 废话注释"
            rightLabel="眯眼辨形法（结构扫描）"
            left={<SelfDocCommentSim />}
            right={<SquintTestSim />}
          />
        )}
        {type === 'ch3-r2-naming-constcast' && (
          <DualLabSwitch
            leftLabel="保留字禁区体检"
            rightLabel="魔数与局部 const_cast"
            left={<ReservedNameCheckerSim />}
            right={<MagicNumberConstCastSim />}
          />
        )}
        {type === 'ch3-r3-style-ub' && (
          <DualLabSwitch
            leftLabel="单行 if 逻辑逃逸"
            rightLabel="i++ + ++i 求值分化"
            left={<BracelessIfEscapeSim />}
            right={<EvalOrderUbSim />}
          />
        )}
      </div>
    </div>
  );
}

function DualLabSwitch({
  leftLabel,
  rightLabel,
  left,
  right,
}: {
  leftLabel: string;
  rightLabel: string;
  left: ReactNode;
  right: ReactNode;
}) {
  const [pane, setPane] = useState<'left' | 'right'>('left');

  return (
    <div className="space-y-4">
      <div
        className="grid grid-cols-2 gap-1.5 pb-3 border-b border-[#141918]/8 dark:border-[#E8ECEA]/8"
        role="tablist"
        aria-label="演练模块切换"
      >
        <button
          type="button"
          role="tab"
          aria-selected={pane === 'left'}
          onClick={() => setPane('left')}
          className={`min-h-[36px] px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap truncate ${
            pane === 'left'
              ? 'border-[#1E6B52] dark:border-[#5AB897] bg-[#EEF6F2] dark:bg-[#13251F] text-[#174D3B] dark:text-[#BCE4D5]'
              : 'border-[#141918]/12 dark:border-[#E8ECEA]/12 text-[#525E5B] dark:text-[#98A6A1] hover:text-[#141918] dark:hover:text-white'
          }`}
        >
          01 · {leftLabel}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={pane === 'right'}
          onClick={() => setPane('right')}
          className={`min-h-[36px] px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap truncate ${
            pane === 'right'
              ? 'border-[#1E6B52] dark:border-[#5AB897] bg-[#EEF6F2] dark:bg-[#13251F] text-[#174D3B] dark:text-[#BCE4D5]'
              : 'border-[#141918]/12 dark:border-[#E8ECEA]/12 text-[#525E5B] dark:text-[#98A6A1] hover:text-[#141918] dark:hover:text-white'
          }`}
        >
          02 · {rightLabel}
        </button>
      </div>
      <div key={pane} className="animate-panel-reveal">
        {pane === 'left' ? left : right}
      </div>
    </div>
  );
}

/* ============================================================================
 * CHAPTER 1 SIMULATORS
 * ========================================================================== */

function ModuleImportSim() {
  const [mode, setMode] = useState<'legacy' | 'transition' | 'modern'>('modern');

  const configs = {
    legacy: {
      code: `#include <cstdio>\n#include <string>\n#include <vector>\n\nint main() {\n    // 格式符 %d 与字符串实参失配 → 未定义行为\n    printf("境界: %d\\n", "炼气期");\n}`,
      expandedLines: '54,280 行文本拷贝',
      macroPollution: '高风险（内部宏泄露至全局）',
      typeSafety: '不安全（无编译期格式检查）',
      status: 'error' as const,
      verdict: '预处理器重复粘贴海量文本，编译缓慢，且 printf 缺乏编译期类型检查。',
    },
    transition: {
      code: `#include <print>\n\nint main() {\n    // 旧炉鼎尚未支持 import std; 时的过渡方案\n    std::println("境界: {}", "炼气期");\n}`,
      expandedLines: '18,900 行文本拷贝',
      macroPollution: '中等（仍依赖预处理器）',
      typeSafety: '安全（std::println 编译期校验）',
      status: 'warn' as const,
      verdict: '已获得 std::println 类型安全与自动换行，待编译器完整支持 C++23 模块后可一键切换。',
    },
    modern: {
      code: `import std;\n\nint main() {\n    // 一次导入整个标准库命名模块，编译如飞\n    std::println("境界: {}", "炼气期");\n}`,
      expandedLines: '1 次预编译模块二进制加载',
      macroPollution: '零污染（模块天然隔离宏）',
      typeSafety: '严丝合缝（编译期格式与类型校验）',
      status: 'ok' as const,
      verdict: '现代 C++23 推荐起点：无需记忆零散头文件，无宏污染，自动换行且完全类型安全。',
    },
  };

  const current = configs[mode];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-[#EFF2F0] dark:bg-[#1C2623]">
        {(['legacy', 'transition', 'modern'] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setMode(key)}
            className={`min-h-[36px] px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap truncate ${
              mode === key
                ? 'bg-white dark:bg-[#111816] text-[#141918] dark:text-[#F0F4F2] shadow-xs'
                : 'text-[#525E5B] dark:text-[#98A6A1] hover:text-[#141918] dark:hover:text-white'
            }`}
          >
            {key === 'legacy' ? '旧式头文件' : key === 'transition' ? '过渡兼容' : 'import std;'}
          </button>
        ))}
      </div>

      <CodePlate code={current.code} />

      <MetricRows
        rows={[
          { label: '编译预处理开销', value: current.expandedLines, mono: true },
          { label: '宏污染评估', value: current.macroPollution },
          { label: '输出类型安全', value: current.typeSafety },
        ]}
      />

      <StatusBanner status={current.status} text={current.verdict} />
    </div>
  );
}

function UniformInitSim() {
  const cases = [
    {
      id: 'legacy-eq',
      label: '老式等号截断',
      code: 'int firePower = 3.14;',
      memoryValue: '3（小数 .14 被静默削去）',
      compilerStatus: '通过但暗藏灵力流失',
      status: 'warn' as const,
      detail: '老式等号 = 对 double → int 窄化转换网开一面，极易造成隐蔽数值精度事故。',
    },
    {
      id: 'brace-narrow',
      label: '{} 拦截窄化',
      code: 'int firePower { 3.14 };',
      memoryValue: '未生成（编译期已拦截）',
      compilerStatus: '编译错误：窄化转换被拒',
      status: 'error' as const,
      detail: '大括号结界立即亮红灯报错：narrowing conversion of 3.14 from double to int。',
    },
    {
      id: 'brace-zero',
      label: '{} 零初始化',
      code: 'int spirit {};\nint* ptr {};',
      memoryValue: 'spirit = 0，ptr = nullptr',
      compilerStatus: '编译通过 · 零杂气安全态',
      status: 'ok' as const,
      detail: '空大括号 {} 触发零初始化，彻底涤荡栈上未初始化变量残留的随机内存垃圾。',
    },
    {
      id: 'explicit-cast',
      label: '显式立军令状',
      code: 'int firePower { static_cast<int>(3.14) };',
      memoryValue: '3（显式确认舍弃小数）',
      compilerStatus: '编译通过 · 意图清晰',
      status: 'ok' as const,
      detail: '当业务确需取整时，用 static_cast<int> 显式声明意图，代码自文档化且无警告。',
    },
    {
      id: 'designated',
      label: 'C++20 指派初始化',
      code: 'Employee emp {\n    .name = "韩小码",\n    .salary = 80\'000\n};',
      memoryValue: 'name="韩小码", salary=80000',
      compilerStatus: '编译通过 · 字段指名道姓',
      status: 'ok' as const,
      detail: '聚合体配合 C++20 指派初始化器与数字分隔符 80\'000，避免参数顺序错位。',
    },
  ];

  const [selected, setSelected] = useState(cases[1].id);
  const current = cases.find((c) => c.id === selected) ?? cases[0];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {cases.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSelected(item.id)}
            className={`min-h-[34px] px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              selected === item.id
                ? 'bg-[#1E6B52] text-white dark:bg-[#4FA687] dark:text-[#0E1614]'
                : 'bg-[#EFF2F0] dark:bg-[#1C2623] text-[#3F4B48] dark:text-[#B4C0BC] hover:bg-[#E3E8E5] dark:hover:bg-[#24312D]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <CodePlate code={current.code} />

      <MetricRows
        rows={[
          { label: '小绿瓶（编译器）判定', value: current.compilerStatus },
          { label: '内存实值', value: current.memoryValue, mono: true },
        ]}
      />

      <StatusBanner status={current.status} text={current.detail} />
    </div>
  );
}

function ReferenceMemorySim() {
  const [scenario, setScenario] = useState<'leak' | 'dangling' | 'const-ref'>('const-ref');

  const scenarios = {
    leak: {
      code: `void brew() {\n    int* p { new int[100] };\n    if (failed) return; // 漏写 delete[] p！\n    delete[] p;\n}`,
      stackLabel: 'p 已出栈销毁',
      heapLabel: '0x7f10 [400B] 孤立泄漏',
      arrowBroken: true,
      status: 'error' as const,
      summary: '内存泄漏：函数提前返回，自由存储区上的 400 字节永久失联，灵力池持续枯竭。',
    },
    dangling: {
      code: `int* p { new int { 42 } };\ndelete p;     // 对象已化为废墟\nuse(p);       // 悬垂指针传入函数 → 触发 UB`,
      stackLabel: 'p 残留旧址 0x7f20',
      heapLabel: '0x7f20 已释放废墟',
      arrowBroken: true,
      status: 'error' as const,
      summary: '心魔反噬（未定义行为）：裸指针指向已释放内存，解引用轻则数据错乱，重则立即崩溃。',
    },
    'const-ref': {
      code: `void inspect(const std::vector<int>& data) {\n    // 零拷贝、不可为空、永不改绑、只读护体\n    std::println("数量: {}", data.size());\n}`,
      stackLabel: 'const T& 同命别名 (0 拷贝)',
      heapLabel: 'std::vector RAII 托管内存',
      arrowBroken: false,
      status: 'ok' as const,
      summary: '同命契约正道：函数无需判空，无需关心释放责任，大对象零拷贝且编译器锁死只读权限。',
    },
  };

  const current = scenarios[scenario];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-[#EFF2F0] dark:bg-[#1C2623]">
        {(
          [
            ['leak', '裸指针泄漏'],
            ['dangling', '悬垂指针'],
            ['const-ref', 'const T& 正道'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setScenario(key)}
            className={`min-h-[36px] px-2 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              scenario === key
                ? key === 'const-ref'
                  ? 'bg-white dark:bg-[#111816] text-[#1E6B52] dark:text-[#5AB897] shadow-xs'
                  : 'bg-white dark:bg-[#111816] text-[#B83B2A] dark:text-[#E57363] shadow-xs'
                : 'text-[#525E5B] dark:text-[#98A6A1]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <CodePlate code={current.code} />

      <MemoryLinkDiagram
        leftTitle="栈帧区域 (Stack)"
        leftBody={current.stackLabel}
        rightTitle="自由存储区 (Free Store)"
        rightBody={current.heapLabel}
        isBroken={current.arrowBroken}
      />

      <StatusBanner status={current.status} text={current.summary} />
    </div>
  );
}

function ConstPointerSim() {
  const decls = [
    {
      id: 'const-int-ptr',
      syntax: 'const int* ip',
      readRightToLeft: 'ip 是指针（*）→ 指向整型（int）→ 破例修饰右侧常量（const）',
      canMutateData: false,
      canRebindPtr: true,
      summary: '指向常量整数的指针：数据锁死不可改（ip[4] = 5 报错），指针自身可改道指向他处。',
    },
    {
      id: 'int-const-ptr',
      syntax: 'int const* ip',
      readRightToLeft: 'ip 是指针（*）→ 指向常量（const）→ 整型（int）',
      canMutateData: false,
      canRebindPtr: true,
      summary: '与 const int* 完全等价，遵循“紧贴左侧”规则最直观：数据不可改，指针可改道。',
    },
    {
      id: 'int-ptr-const',
      syntax: 'int* const ip',
      readRightToLeft: 'ip 是常量（const）→ 指针（*）→ 指向可变整型（int）',
      canMutateData: true,
      canRebindPtr: false,
      summary: '韩小码曾踩的坑！const 紧贴 * 右侧焊死了指针指向，但所指数据 ip[4] = 5 仍可被篡改。',
    },
    {
      id: 'const-both',
      syntax: 'const int* const ip',
      readRightToLeft: 'ip 是常量指针（* const）→ 指向常量整型（const int）',
      canMutateData: false,
      canRebindPtr: false,
      summary: '双重封印：既不可改写所指数据，也不可令指针改道。',
    },
  ];

  const [selectedId, setSelectedId] = useState(decls[2].id);
  const [actionResult, setActionResult] = useState<'none' | 'data' | 'rebind'>('none');
  const current = decls.find((d) => d.id === selectedId) ?? decls[0];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-1.5">
        {decls.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setSelectedId(item.id);
              setActionResult('none');
            }}
            className={`min-h-[38px] px-3 py-2 text-xs font-code font-medium rounded-md text-left transition-colors truncate ${
              selectedId === item.id
                ? 'bg-[#1E6B52] text-white dark:bg-[#4FA687] dark:text-[#0E1614]'
                : 'bg-[#EFF2F0] dark:bg-[#1C2623] text-[#1D2724] dark:text-[#C5D1CD] hover:bg-[#E2E8E5] dark:hover:bg-[#25322E]'
            }`}
          >
            {item.syntax}
          </button>
        ))}
      </div>

      <div className="p-4 rounded-lg bg-[#F4F6F4] dark:bg-[#101614] border border-[#141918]/8 dark:border-[#E8ECEA]/8 space-y-1.5">
        <div className="text-[11px] font-medium text-[#596662] dark:text-[#98A6A1]">从右向左心法拆解</div>
        <p className="text-xs text-[#141918] dark:text-[#E8ECEA] leading-relaxed font-medium">
          {current.readRightToLeft}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => setActionResult('data')}
          className="px-3 py-2.5 text-xs font-code rounded-lg border border-[#141918]/15 dark:border-[#E8ECEA]/15 hover:border-[#1E6B52] dark:hover:border-[#5AB897] bg-white dark:bg-[#18211E] text-[#141918] dark:text-[#E8ECEA] transition-colors text-left"
        >
          <span className="block text-[11px] font-sans text-[#596662] dark:text-[#98A6A1] mb-0.5">
            实测修改数据
          </span>
          ip[4] = 5;
        </button>

        <button
          type="button"
          onClick={() => setActionResult('rebind')}
          className="px-3 py-2.5 text-xs font-code rounded-lg border border-[#141918]/15 dark:border-[#E8ECEA]/15 hover:border-[#1E6B52] dark:hover:border-[#5AB897] bg-white dark:bg-[#18211E] text-[#141918] dark:text-[#E8ECEA] transition-colors text-left"
        >
          <span className="block text-[11px] font-sans text-[#596662] dark:text-[#98A6A1] mb-0.5">
            实测指针改道
          </span>
          ip = otherPtr;
        </button>
      </div>

      {actionResult === 'data' && (
        <StatusBanner
          status={current.canMutateData ? 'warn' : 'ok'}
          text={
            current.canMutateData
              ? '允许修改数据：ip[4] = 5 通过编译！（若本意是保护数据，则此声明写反了）'
              : '编译期成功拦截：assignment of read-only location（数据受 const 保护）'
          }
        />
      )}

      {actionResult === 'rebind' && (
        <StatusBanner
          status={current.canRebindPtr ? 'ok' : 'error'}
          text={
            current.canRebindPtr
              ? '允许指针改道：ip = otherPtr 通过编译，指针可指向新目标。'
              : '编译期拦截：assignment of read-only variable ip（指针本身被 const 焊死）'
          }
        />
      )}

      {actionResult === 'none' && <StatusBanner status="info" text={current.summary} />}
    </div>
  );
}

function AutoDeductionSim() {
  const cases = [
    {
      id: 'auto-copy',
      expr: 'auto f1 { foo() };',
      source: 'const std::string& foo()',
      stripped: '剥离 const 与 &',
      deduced: 'std::string',
      copyCost: '触发完整深拷贝（耗元）',
      status: 'error' as const,
      note: '灵镜照影剥外衣：原本零拷贝的常量引用变成了全新值副本，每次调用都在复制整份名册。',
    },
    {
      id: 'const-auto-ref',
      expr: 'const auto& f2 { foo() };',
      source: 'const std::string& foo()',
      stripped: '显式补回 const 与 &',
      deduced: 'const std::string&',
      copyCost: '零拷贝（直接绑定本尊）',
      status: 'ok' as const,
      note: '正道破局：显式书写 const auto&，既省去冗长类型名，又牢牢保住零拷贝常量引用。',
    },
    {
      id: 'const-auto-ptr-trap',
      expr: 'const auto p1 { &i };',
      source: 'int* (&i)',
      stripped: 'const 锁住整个指针本体',
      deduced: 'int* const',
      copyCost: '易误解为 const int*',
      status: 'warn' as const,
      note: '常见陷阱：const 修饰的是整个 auto 推演出的指针类型，得到的是“指针不可改、数据可改”。',
    },
    {
      id: 'const-auto-star',
      expr: 'const auto* p3 { &i };',
      source: 'int* (&i)',
      stripped: '显式星号精准推导指向类型',
      deduced: 'const int*',
      copyCost: '所见即所得（数据只读）',
      status: 'ok' as const,
      note: '宗门推荐：推导指针务必补写 *，const auto* p3 清晰表达“指向常量整数的指针”。',
    },
  ];

  const [selected, setSelected] = useState(cases[0].id);
  const current = cases.find((c) => c.id === selected) ?? cases[0];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-1.5">
        {cases.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSelected(item.id)}
            className={`min-h-[38px] px-3.5 py-2 text-xs font-code text-left rounded-md transition-colors flex items-center justify-between gap-2 ${
              selected === item.id
                ? 'bg-[#1E6B52] text-white dark:bg-[#4FA687] dark:text-[#0E1614]'
                : 'bg-[#EFF2F0] dark:bg-[#1C2623] text-[#1D2724] dark:text-[#C5D1CD] hover:bg-[#E2E8E5] dark:hover:bg-[#25322E]'
            }`}
          >
            <span className="truncate">{item.expr}</span>
            <ArrowRight className="w-3.5 h-3.5 shrink-0 opacity-75" strokeWidth={1.6} />
          </button>
        ))}
      </div>

      <MetricRows
        rows={[
          { label: '源表达式类型', value: current.source, mono: true },
          { label: '灵镜滤镜作用', value: current.stripped },
          { label: '最终推演真身', value: current.deduced, mono: true, accent: true },
          { label: '灵力开销评估', value: current.copyCost },
        ]}
      />

      <StatusBanner status={current.status} text={current.note} />
    </div>
  );
}

function ReturnValueNrvoSim() {
  const [strategy, setStrategy] = useState<'dangling' | 'value'>('value');
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const steps = {
    dangling: [
      {
        title: '步骤 1 / 3 · 进入函数，搭起行军帐篷（栈帧）',
        stack: 'makeEmployee() 栈帧就绪，准备创建局部 emp',
        caller: '调用者等待接收 Employee& 引用',
        broken: false,
        status: 'info' as const,
      },
      {
        title: '步骤 2 / 3 · 在栈帧内构造局部 Employee emp',
        stack: '局部对象 emp 存活于临时栈地址 0x7ff0',
        caller: '函数准备交出指向 0x7ff0 的引用',
        broken: false,
        status: 'warn' as const,
      },
      {
        title: '步骤 3 / 3 · 函数返回，帐篷拆毁化为虚空！',
        stack: '0x7ff0 栈帧已销毁，emp 析构',
        caller: 'UB 崩溃：调用者手握悬垂引用',
        broken: true,
        status: 'error' as const,
      },
    ],
    value: [
      {
        title: '步骤 1 / 3 · 进入函数，开启 C++17/23 拷贝消除',
        stack: '编译器为调用者预留目标槽位 (Return Slot)',
        caller: '调用者直接将目标槽位地址传入函数',
        broken: false,
        status: 'info' as const,
      },
      {
        title: '步骤 2 / 3 · 就地构造 Employee (NRVO / Mandatory Elision)',
        stack: 'emp 直接构造在调用者目标内存上',
        caller: '拷贝：0 次 · 移动：0 次',
        broken: false,
        status: 'ok' as const,
      },
      {
        title: '步骤 3 / 3 · 函数安全返回，真元完好无损',
        stack: '临时栈帧平静拆除，未留悬垂幽灵',
        caller: '调用者直接拥有完整 Employee 对象',
        broken: false,
        status: 'ok' as const,
      },
    ],
  };

  const currentStep = steps[strategy][step - 1];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-[#EFF2F0] dark:bg-[#1C2623]">
        <button
          type="button"
          onClick={() => {
            setStrategy('dangling');
            setStep(1);
          }}
          className={`min-h-[36px] px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
            strategy === 'dangling'
              ? 'bg-white dark:bg-[#111816] text-[#B83B2A] dark:text-[#E57363] shadow-xs'
              : 'text-[#525E5B] dark:text-[#98A6A1]'
          }`}
        >
          反例：返回 Employee&
        </button>
        <button
          type="button"
          onClick={() => {
            setStrategy('value');
            setStep(1);
          }}
          className={`min-h-[36px] px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
            strategy === 'value'
              ? 'bg-white dark:bg-[#111816] text-[#1E6B52] dark:text-[#5AB897] shadow-xs'
              : 'text-[#525E5B] dark:text-[#98A6A1]'
          }`}
        >
          正道：按值返回 Employee
        </button>
      </div>

      <CodePlate
        code={
          strategy === 'dangling'
            ? `Employee& makeEmployee() {\n    Employee emp { .name = "韩小码" };\n    return emp; // 返回局部引用 → 悬垂崩溃\n}`
            : `Employee makeEmployee() {\n    Employee emp { .name = "韩小码" };\n    return emp; // NRVO / 强制拷贝消除：0 拷贝\n}`
        }
      />

      <div className="text-xs font-semibold text-[#141918] dark:text-[#F0F4F2]">{currentStep.title}</div>

      <MemoryLinkDiagram
        leftTitle="被调函数栈帧"
        leftBody={currentStep.stack}
        rightTitle="调用者目标槽位"
        rightBody={currentStep.caller}
        isBroken={currentStep.broken}
      />

      <StepControls step={step} onStepChange={setStep} />

      <StatusBanner
        status={currentStep.status}
        text={
          step === 3
            ? strategy === 'dangling'
              ? '推演结论：栈帧拆毁后引用失效，严禁返回局部栈变量的引用或指针！'
              : '推演结论：现代 C++ 直接按值返回对象，既安全无悬垂，又享编译器零拷贝优化。'
            : '点击“下一步推演”完整观察函数返回瞬间栈帧与目标对象的生命周期变化。'
        }
      />
    </div>
  );
}

/* ============================================================================
 * CHAPTER 2 SIMULATORS
 * ========================================================================== */

function CStringNullTrapSim() {
  const [mode, setMode] = useState<'overflow' | 'plus-one' | 'sizeof-trap' | 'std-string'>('overflow');

  const bytes = [
    { ch: 'h', idx: 0, kind: 'char' },
    { ch: 'e', idx: 1, kind: 'char' },
    { ch: 'l', idx: 2, kind: 'char' },
    { ch: 'l', idx: 3, kind: 'char' },
    { ch: 'o', idx: 4, kind: 'char' },
    { ch: '\\0', idx: 5, kind: mode === 'overflow' ? 'overflow' : 'nul' },
  ];

  const details = {
    overflow: {
      code: `const char* str { "hello" }; // strlen = 5\nchar* res { new char[strlen(str)] }; // 仅开辟 5 字节！\nstrcpy(res, str); // 第 6 字节 '\\0' 撞穿相邻内存！`,
      status: 'error' as const,
      summary: '差一字节越界：strlen("hello") 返回 5 不含 \\0，strcpy 强行在下标 [5] 写入空字符导致缓冲区溢出！',
    },
    'plus-one': {
      code: `char* res { new char[strlen(str) + 1] }; // 长度加一 = 6\nstrcpy(res, str); // 安全写入 'h','e','l','l','o','\\0'\ndelete[] res;`,
      status: 'warn' as const,
      summary: '遗留 C 接口最低保命线：分配 strlen(str) + 1 字节并手动 delete[]，但依然繁琐易错。',
    },
    'sizeof-trap': {
      code: `char text[] { "abcdef" };     // sizeof(text)  == 7 (含 \\0)\nconst char* text2 { text };   // sizeof(text2) == 8 (仅指针大小！)`,
      status: 'warn' as const,
      summary: 'sizeof 退化陷阱：数组一旦退化为 const char* 指针，sizeof 永远只测指针自身字节数（4 或 8）。',
    },
    'std-string': {
      code: `std::string msg { R"(多行与 "引号" 无需转义)" };\nstd::println("安全长度: {}", msg.size());`,
      status: 'ok' as const,
      summary: '宗门正道：std::string 自动管理内存与长度，配合原始字符串字面量 R"(...)" 免去转义之苦。',
    },
  };

  const current = details[mode];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-1.5">
        {(
          [
            ['overflow', '差一字节越界'],
            ['plus-one', 'strlen + 1 保命'],
            ['sizeof-trap', 'sizeof 指针退化'],
            ['std-string', 'std::string 正道'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setMode(key)}
            className={`min-h-[36px] px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              mode === key
                ? 'bg-[#1E6B52] text-white dark:bg-[#4FA687] dark:text-[#0E1614]'
                : 'bg-[#EFF2F0] dark:bg-[#1C2623] text-[#3F4B48] dark:text-[#B4C0BC]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Visual byte-by-byte memory tape */}
      <div>
        <div className="flex items-center justify-between text-[11px] text-[#596662] dark:text-[#98A6A1] mb-2">
          <span>"hello" 内存字节排布</span>
          <span className="font-code">strlen = 5 · 实占 6 Bytes</span>
        </div>
        <div className="grid grid-cols-6 gap-1.5">
          {bytes.map((b) => (
            <div
              key={b.idx}
              className={`rounded-md py-2 text-center border font-code text-xs ${
                b.kind === 'overflow'
                  ? 'bg-[#FAF0EE] dark:bg-[#2B1715] border-[#B83B2A] dark:border-[#E57363] text-[#B83B2A] dark:text-[#F09A8E] font-semibold'
                  : b.kind === 'nul'
                    ? 'bg-[#EEF6F2] dark:bg-[#142821] border-[#1E6B52]/40 dark:border-[#5AB897]/40 text-[#1E6B52] dark:text-[#68D3AD] font-semibold'
                    : 'bg-[#F4F6F4] dark:bg-[#101614] border-[#141918]/10 dark:border-[#E8ECEA]/10 text-[#141918] dark:text-[#E8ECEA]'
              }`}
            >
              <div>{b.ch}</div>
              <div className="text-[10px] opacity-65 mt-0.5">[{b.idx}]</div>
            </div>
          ))}
        </div>
      </div>

      <CodePlate code={current.code} />
      <StatusBanner status={current.status} text={current.summary} />
    </div>
  );
}

function CtadStringLiteralSim() {
  const cases = [
    {
      id: 'ctad-raw',
      label: '裸双引号 CTAD',
      code: 'vector names { "John", "Sam", "Joe" };',
      deduced: 'std::vector<const char*>',
      memory: '只读字面量池 (Literal Pooling)',
      status: 'error' as const,
      note: '元素并非 std::string！调用 names[0].size() 或 .starts_with() 将直接编译报错。',
    },
    {
      id: 'ctad-s',
      label: 's 后缀铸真身',
      code: 'using namespace std::string_literals;\nvector names { "John"s, "Sam"s, "Joe"s };',
      deduced: 'std::vector<std::string>',
      memory: '独立 std::string 对象（支持 contains / starts_with）',
      status: 'ok' as const,
      note: '加上 s 后缀后，CTAD 准确推导为 std::vector<std::string>，畅享全部现代字符串方法。',
    },
    {
      id: 'ctad-sv',
      label: 'sv 后缀零拷贝',
      code: 'using namespace std::string_view_literals;\nvector names { "John"sv, "Sam"sv, "Joe"sv };',
      deduced: 'std::vector<std::string_view>',
      memory: '只读字面量视图（零堆分配）',
      status: 'ok' as const,
      note: '若名单内容只读不变，使用 sv 后缀构造 std::string_view 视图，全程零堆分配！',
    },
    {
      id: 'nullptr-cpp23',
      label: 'C++23 禁用 nullptr',
      code: 'std::string broken { nullptr };',
      deduced: '编译期删除构造函数 (= delete)',
      memory: '编译阶段即斩断空指针崩溃隐患',
      status: 'error' as const,
      note: 'C++23 起显式删除了 string(nullptr_t)，彻底杜绝昔日运行期空指针解引用崩溃。',
    },
  ];

  const [selected, setSelected] = useState(cases[0].id);
  const current = cases.find((c) => c.id === selected) ?? cases[0];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-1.5">
        {cases.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSelected(item.id)}
            className={`min-h-[36px] px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              selected === item.id
                ? 'bg-[#1E6B52] text-white dark:bg-[#4FA687] dark:text-[#0E1614]'
                : 'bg-[#EFF2F0] dark:bg-[#1C2623] text-[#3F4B48] dark:text-[#B4C0BC]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <CodePlate code={current.code} />

      <MetricRows
        rows={[
          { label: '编译器推演类型', value: current.deduced, mono: true, accent: true },
          { label: '底层存储属性', value: current.memory },
        ]}
      />

      <StatusBanner status={current.status} text={current.note} />
    </div>
  );
}

function StringViewZeroCopySim() {
  const [paramType, setParamType] = useState<'const-ref' | 'string-view'>('string-view');
  const [argSource, setArgSource] = useState<'literal' | 'std-string' | 'subrange'>('literal');

  const isCopyTriggered = paramType === 'const-ref' && argSource !== 'std-string';

  const codeMap = {
    'const-ref': `void parse(const std::string& sv);\n\n// 传入 ${
      argSource === 'literal'
        ? '"C++23 Xiantu" (const char*)'
        : argSource === 'std-string'
          ? 'existingStr (std::string)'
          : 'buf, len (原始缓冲切片)'
    }\nparse(${
      argSource === 'literal'
        ? '"C++23 Xiantu"'
        : argSource === 'std-string'
          ? 'existingStr'
          : 'std::string{buf, 6}'
    });`,
    'string-view': `void parse(std::string_view sv); // 按值传参仅 16B\n\n// 传入 ${
      argSource === 'literal'
        ? '"C++23 Xiantu" (const char*)'
        : argSource === 'std-string'
          ? 'existingStr (std::string)'
          : '{ buf, 6 } (原始缓冲切片)'
    }\nparse(${
      argSource === 'literal'
        ? '"C++23 Xiantu"'
        : argSource === 'std-string'
          ? 'existingStr'
          : 'std::string_view{buf, 6}'
    });`,
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-[#EFF2F0] dark:bg-[#1C2623]">
        <button
          type="button"
          onClick={() => setParamType('const-ref')}
          className={`min-h-[36px] px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
            paramType === 'const-ref'
              ? 'bg-white dark:bg-[#111816] text-[#B83B2A] dark:text-[#E57363] shadow-xs'
              : 'text-[#525E5B] dark:text-[#98A6A1]'
          }`}
        >
          const string&
        </button>
        <button
          type="button"
          onClick={() => setParamType('string-view')}
          className={`min-h-[36px] px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
            paramType === 'string-view'
              ? 'bg-white dark:bg-[#111816] text-[#1E6B52] dark:text-[#5AB897] shadow-xs'
              : 'text-[#525E5B] dark:text-[#98A6A1]'
          }`}
        >
          string_view（按值）
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(
          [
            ['literal', '传入字面量'],
            ['std-string', '传入 std::string'],
            ['subrange', '传入缓冲切片'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setArgSource(key)}
            className={`min-h-[32px] px-3 py-1 text-xs rounded-md border transition-colors whitespace-nowrap ${
              argSource === key
                ? 'border-[#1E6B52] dark:border-[#5AB897] bg-[#EEF6F2] dark:bg-[#13251F] text-[#174D3B] dark:text-[#BCE4D5] font-medium'
                : 'border-[#141918]/12 dark:border-[#E8ECEA]/12 text-[#525E5B] dark:text-[#98A6A1]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <CodePlate code={codeMap[paramType]} />

      <MetricRows
        rows={[
          {
            label: '视图内部载荷',
            value: paramType === 'string-view' ? '{ ptr: 0x4010, len: 12 } (16 Bytes)' : '间接引用 std::string 对象',
            mono: true,
          },
          {
            label: '堆内存分配与字符拷贝',
            value: isCopyTriggered ? '触发 1 次临时对象堆分配 + 全量拷贝' : '0 次堆分配 · 0 字符拷贝',
            accent: !isCopyTriggered,
          },
        ]}
      />

      <StatusBanner
        status={isCopyTriggered ? 'warn' : 'ok'}
        text={
          isCopyTriggered
            ? '暗中耗元：const string& 接收字面量或切片时，被迫隐式构造临时 std::string！'
            : '零拷贝御清风：无论字面量、std::string 还是缓冲切片，string_view 均直接透视，不立新田。'
        }
      />
    </div>
  );
}

function CharconvBufferSim() {
  const cases = [
    {
      id: 'roundtrip',
      label: '浮点完美往返',
      code: `std::array<char, 24> buf {};\nauto [ptr, ec] = std::to_chars(buf.data(), buf.data() + buf.size(), 0.1234567890123456);\n// from_chars 还原后二进制位 100% 一致`,
      ec: 'std::errc{} (成功)',
      alloc: '0 Bytes 堆分配 · 无 locale 锁',
      status: 'ok' as const,
      note: '完美往返（Perfect Round-tripping）：序列化为最短精准十进制文本，反序列化还原出完全相同的 double。',
    },
    {
      id: 'leading-space',
      label: '前导空格陷阱',
      code: `std::string_view input { "  42" };\nint value {};\nauto [ptr, ec] = std::from_chars(input.data(), input.data() + input.size(), value);`,
      ec: 'std::errc::invalid_argument',
      alloc: '解析停在下标 0（未跳过空格！）',
      status: 'error' as const,
      note: '牢记铁律：from_chars 绝不自动跳过前导空格！调用前需先修剪空白，且务必检查 ec == errc{}。',
    },
    {
      id: 'small-buf',
      label: '玉盘空间不足',
      code: `std::array<char, 3> tiny {};\nauto [ptr, ec] = std::to_chars(tiny.data(), tiny.data() + tiny.size(), 99999);`,
      ec: 'std::errc::value_too_large',
      alloc: '安全拦截写入，绝不越界覆盖',
      status: 'warn' as const,
      note: '缓冲区不足时返回 value_too_large，不会像 sprintf 那样静默写爆堆栈。',
    },
  ];

  const [selected, setSelected] = useState(cases[0].id);
  const current = cases.find((c) => c.id === selected) ?? cases[0];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-[#EFF2F0] dark:bg-[#1C2623]">
        {cases.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSelected(item.id)}
            className={`min-h-[36px] px-2 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap truncate ${
              selected === item.id
                ? 'bg-white dark:bg-[#111816] text-[#141918] dark:text-[#F0F4F2] shadow-xs'
                : 'text-[#525E5B] dark:text-[#98A6A1]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <CodePlate code={current.code} />

      <MetricRows
        rows={[
          { label: '返回错误码 ec', value: current.ec, mono: true, accent: current.status === 'ok' },
          { label: '缓冲区与开销', value: current.alloc },
        ]}
      />

      <StatusBanner status={current.status} text={current.note} />
    </div>
  );
}

function PrintlnRangesSim() {
  const presets = [
    {
      id: 'reorder',
      label: '多语言语序重排',
      code: `std::println("从 {1} 中读取 {0} 个字节", 128, "青玉灵脉");`,
      output: '从 青玉灵脉 中读取 128 个字节',
      status: 'ok' as const,
      note: '通过 {0}、{1} 参数索引自由重排语序，国际化翻译无需修改 C++ 传参列表。',
    },
    {
      id: 'range-default',
      label: '容器默认打印',
      code: `std::vector nums { 11, 22, 33 };\nstd::println("{}", nums);`,
      output: '[11, 22, 33]',
      status: 'ok' as const,
      note: 'C++23 Ranges 格式化原生支持 vector、pair 与嵌套容器，告别手写 for 循环。',
    },
    {
      id: 'range-no-brackets',
      label: '{:n} 剥离括号',
      code: `std::vector nums { 11, 22, 33 };\nstd::println("{:n}", nums);`,
      output: '11, 22, 33',
      status: 'ok' as const,
      note: '范围格式说明符 :n 干净剥去外层方括号，直接用于日志或 CSV 片段。',
    },
    {
      id: 'range-elem',
      label: '{::*^6} 定制元素',
      code: `std::vector nums { 11, 22, 33 };\nstd::println("{::*^6}", nums);`,
      output: '[**11**, **22**, **33**]',
      status: 'ok' as const,
      note: '双冒号后接元素格式说明符（以 * 填充、居中对齐、宽度 6），统一雕琢每个容器元素。',
    },
    {
      id: 'dynamic-fmt',
      label: '运行期动态模板',
      code: `std::string fmt { loadLocaleTemplate() };\n// std::println(fmt, 42); // 编译报错！\nstd::vprint_unicode(fmt, std::make_format_args(42));`,
      output: '运行时安全校验（非法模板抛出 std::format_error）',
      status: 'warn' as const,
      note: 'std::println 强制编译期常量格式串；加载外部动态多语言模板必须改用 std::vprint_unicode。',
    },
  ];

  const [selected, setSelected] = useState(presets[3].id);
  const current = presets.find((p) => p.id === selected) ?? presets[0];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {presets.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSelected(item.id)}
            className={`min-h-[34px] px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              selected === item.id
                ? 'bg-[#1E6B52] text-white dark:bg-[#4FA687] dark:text-[#0E1614]'
                : 'bg-[#EFF2F0] dark:bg-[#1C2623] text-[#3F4B48] dark:text-[#B4C0BC]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <CodePlate code={current.code} />

      <div className="p-3.5 rounded-lg bg-[#141B19] text-[#B7E4D4] border border-[#26332F]">
        <div className="text-[10px] font-code text-[#7F988F] mb-1">终端 Unicode 输出预览</div>
        <div className="font-code text-xs sm:text-[13px]">{current.output}</div>
      </div>

      <StatusBanner status={current.status} text={current.note} />
    </div>
  );
}

function DanglingStringViewSim() {
  const [strategy, setStrategy] = useState<'dangling' | 'owned'>('dangling');
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const steps = {
    dangling: [
      {
        title: '步骤 1 / 3 · 求值 s + " World!" 生成临时对象',
        host: '临时 string 分配堆内存 0x90a0 ("Hello World!")',
        view: 'sv 准备记录指针 0x90a0 与长度 12',
        broken: false,
        status: 'info' as const,
      },
      {
        title: '步骤 2 / 3 · sv 借光窥物，尚未察觉危机',
        host: '临时 string 仅存活至当前语句分号 ;',
        view: 'sv = { ptr: 0x90a0, len: 12 }（不拥有内存）',
        broken: false,
        status: 'warn' as const,
      },
      {
        title: '步骤 3 / 3 · 分号一到，临时对象灰飞烟灭！',
        host: '0x90a0 堆内存已析构释放！',
        view: '悬垂魔眼：println("{}", sv) 读取已释放废墟 → UB！',
        broken: true,
        status: 'error' as const,
      },
    ],
    owned: [
      {
        title: '步骤 1 / 3 · 求值 s + " World!" 生成结果',
        host: '按值构造持久对象 std::string full',
        view: 'full 接管 "Hello World!" 缓冲区所有权',
        broken: false,
        status: 'info' as const,
      },
      {
        title: '步骤 2 / 3 · 脱离临时表达式，真金身稳固存续',
        host: 'full 在当前作用域内完整拥有 0x90a0 内存',
        view: '后续若传给只读函数，再以 string_view 借阅',
        broken: false,
        status: 'ok' as const,
      },
      {
        title: '步骤 3 / 3 · 安全打印输出，离开作用域自动收回灵力',
        host: 'println("{}", full) 100% 安全可靠',
        view: '零悬垂隐患 · 作用域结束自动析构释放',
        broken: false,
        status: 'ok' as const,
      },
    ],
  };

  const currentStep = steps[strategy][step - 1];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-[#EFF2F0] dark:bg-[#1C2623]">
        <button
          type="button"
          onClick={() => {
            setStrategy('dangling');
            setStep(1);
          }}
          className={`min-h-[36px] px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
            strategy === 'dangling'
              ? 'bg-white dark:bg-[#111816] text-[#B83B2A] dark:text-[#E57363] shadow-xs'
              : 'text-[#525E5B] dark:text-[#98A6A1]'
          }`}
        >
          反例：绑定临时拼接
        </button>
        <button
          type="button"
          onClick={() => {
            setStrategy('owned');
            setStep(1);
          }}
          className={`min-h-[36px] px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
            strategy === 'owned'
              ? 'bg-white dark:bg-[#111816] text-[#1E6B52] dark:text-[#5AB897] shadow-xs'
              : 'text-[#525E5B] dark:text-[#98A6A1]'
          }`}
        >
          正道：std::string 持有
        </button>
      </div>

      <CodePlate
        code={
          strategy === 'dangling'
            ? `std::string s { "Hello" };\nstd::string_view sv { s + " World!" }; // 致命悬垂！\nstd::println("{}", sv);`
            : `std::string s { "Hello" };\nstd::string full { s + " World!" }; // 拥有所有权\nstd::println("{}", full);`
        }
      />

      <div className="text-xs font-semibold text-[#141918] dark:text-[#F0F4F2]">{currentStep.title}</div>

      <MemoryLinkDiagram
        leftTitle={strategy === 'dangling' ? '临时字符串宿主' : '持久 std::string'}
        leftBody={currentStep.host}
        rightTitle={strategy === 'dangling' ? 'string_view 观察镜' : '安全访问状态'}
        rightBody={currentStep.view}
        isBroken={currentStep.broken}
      />

      <StepControls step={step} onStepChange={setStep} />

      <StatusBanner
        status={currentStep.status}
        text={
          step === 3
            ? strategy === 'dangling'
              ? '护道铁律：string_view 仅作函数形参（短期借阅），类成员与函数返回值一律使用 std::string！'
              : '正道圆满：用 std::string 持有所有权，仅在传参给只读函数时架起 string_view 透视。'
            : '点击“下一步推演”追踪语句分号处的对象析构瞬间。'
        }
      />
    </div>
  );
}

/* ============================================================================
 * CHAPTER 3 SIMULATORS
 * ========================================================================== */

function SelfDocCommentSim() {
  const [mode, setMode] = useState<'noisy' | 'meta' | 'selfdoc'>('selfdoc');

  const modes = {
    noisy: {
      code: `// 检查数值是否为偶数\nbool f(int x) {\n    // 如果 x 除以 2 的余数等于 0\n    if (x % 2 == 0) {\n        return true; // 返回真\n    }\n    return false; // 否则返回假\n}`,
      signal: '低（70% 为重复翻译代码的噪音）',
      risk: '代码修改后注释极易过期撒谎',
      status: 'error' as const,
      summary: '逐行翻译型注释既遮蔽逻辑又制造维护双倍负担；变量 x 与函数 f 语义全无。',
    },
    meta: {
      code: `// Author: HanXiaoma\n// Created: 2024-03-10\n// Updated: 2024-06-18 Fixed edge case\nbool check(int val) { return val % 2 == 0; }`,
      signal: '中低（源码充斥版本控制历史）',
      risk: '重复造轮子，与 Git Blame 逐渐脱节',
      status: 'warn' as const,
      summary: '作者、日期、修改记录等元信息应全部交由 Git 等版本控制系统留痕，不可污染代码正文。',
    },
    selfdoc: {
      code: `// 依宗门协议：仅偶数编号节点具备校验奇偶位资格\nbool isEven(int nodeId) noexcept {\n    return (nodeId % 2) == 0;\n}`,
      signal: '高（代码直述“做什么”，注释只释“为何如此”）',
      risk: '近乎为零（命名与实现天然同步）',
      status: 'ok' as const,
      summary: '自文档化正道：函数名与形参名自带文档属性，仅在复杂边界或业务意图处留下一行精炼注释。',
    },
  };

  const current = modes[mode];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-[#EFF2F0] dark:bg-[#1C2623]">
        {(
          [
            ['noisy', '逐行翻译注释'],
            ['meta', '僵尸元信息'],
            ['selfdoc', '自文档化正道'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setMode(key)}
            className={`min-h-[36px] px-2 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap truncate ${
              mode === key
                ? 'bg-white dark:bg-[#111816] text-[#141918] dark:text-[#F0F4F2] shadow-xs'
                : 'text-[#525E5B] dark:text-[#98A6A1]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <CodePlate code={current.code} />

      <MetricRows
        rows={[
          { label: '信噪比评估', value: current.signal },
          { label: '维护退化风险', value: current.risk },
        ]}
      />

      <StatusBanner status={current.status} text={current.summary} />
    </div>
  );
}

function SquintTestSim() {
  const [style, setStyle] = useState<'cruft' | 'clean'>('cruft');
  const [squintOn, setSquintOn] = useState(true);

  const cruftLines = [
    'void handleEverything(auto& req) {',
    '  if (req.active) {',
    '    for (auto& item : req.items) {',
    '      if (item.valid) {',
    '        if (item.score > 90) {',
    '          if (item.tier == 2) {',
    '            applyLegacyPatch(item);',
    '            // TODO: remove after v1',
    '          }',
    '        }',
    '      }',
    '    }',
    '  }',
    '}',
  ];

  const cleanLines = [
    'void processRequest(const Request& req) {',
    '  if (!req.isActive()) { return; }',
    '  for (const auto& item : req.items) {',
    '    dispatchEligibleItem(item);',
    '  }',
    '}',
    '',
    'void dispatchEligibleItem(const Item& item) {',
    '  if (!isHighTierValid(item)) { return; }',
    '  grantSpiritReward(item);',
    '}',
  ];

  const lines = style === 'cruft' ? cruftLines : cleanLines;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-[#EFF2F0] dark:bg-[#1C2623] flex-1">
          <button
            type="button"
            onClick={() => setStyle('cruft')}
            className={`min-h-[34px] px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              style === 'cruft'
                ? 'bg-white dark:bg-[#111816] text-[#B83B2A] dark:text-[#E57363] shadow-xs'
                : 'text-[#525E5B] dark:text-[#98A6A1]'
            }`}
          >
            积垢嵌套（Cruft）
          </button>
          <button
            type="button"
            onClick={() => setStyle('clean')}
            className={`min-h-[34px] px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              style === 'clean'
                ? 'bg-white dark:bg-[#111816] text-[#1E6B52] dark:text-[#5AB897] shadow-xs'
                : 'text-[#525E5B] dark:text-[#98A6A1]'
            }`}
          >
            单一职责拆解
          </button>
        </div>

        <button
          type="button"
          onClick={() => setSquintOn((v) => !v)}
          className={`inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
            squintOn
              ? 'border-[#1E6B52] dark:border-[#5AB897] bg-[#EEF6F2] dark:bg-[#13251F] text-[#174D3B] dark:text-[#BCE4D5]'
              : 'border-[#141918]/15 dark:border-[#E8ECEA]/15 text-[#4B5653] dark:text-[#A3B0AC]'
          }`}
        >
          <Eye className="w-3.5 h-3.5" strokeWidth={1.6} />
          {squintOn ? '眯眼模式：开启' : '眯眼模式：关闭'}
        </button>
      </div>

      <div className="p-4 rounded-lg bg-[#141B19] text-[#DCE6E2] border border-[#25332F] overflow-hidden">
        <div className="flex items-center justify-between text-[11px] text-[#8DA49C] mb-2">
          <span>轮廓缩进观测窗</span>
          <span className="font-code">{style === 'cruft' ? '嵌套深度: 5 层' : '嵌套深度: ≤ 2 层'}</span>
        </div>
        <pre
          className={`font-code text-[11.5px] leading-[1.6] transition-all duration-300 select-none ${
            squintOn ? 'blur-[2.8px]' : 'blur-0'
          }`}
        >
          <code>{lines.join('\n')}</code>
        </pre>
      </div>

      <StatusBanner
        status={style === 'cruft' ? 'error' : 'ok'}
        text={
          style === 'cruft'
            ? '眯眼可见明显“右倾箭头形深坑”！这是代码积垢（Cruft）与职责过载的视觉警报，亟需卫语句与拆分小函数重构。'
            : '眯眼观之轮廓平直匀称、段落分明：每个短函数只做好一件事，一眼即可把握主干脉络。'
        }
      />
    </div>
  );
}

function ReservedNameCheckerSim() {
  const presets = ['__myVar', '_Controller', '_globalId', 'm_userCount', 'isValid'];
  const [identifier, setIdentifier] = useState('__myVar');

  const trimmed = identifier.trim();
  const hasDoubleUnderscore = trimmed.includes('__');
  const startsUnderscoreUpper = /^_[A-Z]/.test(trimmed);
  const startsUnderscoreLower = /^_[a-z0-9]/.test(trimmed);
  const invalidChars = trimmed.length === 0 || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(trimmed);

  let status: 'ok' | 'warn' | 'error' = 'ok';
  let verdict = '合法且清晰！未触碰 C++ 标准库与编译器保留字禁区。';
  let ruleHit = '合规用户标识符';

  if (invalidChars) {
    status = 'error';
    ruleHit = '非法 C++ 标识符语法';
    verdict = '标识符必须以字母或下划线开头，且仅包含字母、数字与下划线。';
  } else if (hasDoubleUnderscore) {
    status = 'error';
    ruleHit = '触犯禁区 1：包含双下划线 __';
    verdict = '任何作用域内包含双下划线（__）的标识符均归编译器/标准库保留，用户擅用即属未定义行为（UB）！';
  } else if (startsUnderscoreUpper) {
    status = 'error';
    ruleHit = '触犯禁区 2：下划线接大写字母 _Name';
    verdict = '任何作用域内以“下划线 + 大写字母”开头的名称均为标准保留字，极易与系统宏冲突炸炉！';
  } else if (startsUnderscoreLower) {
    status = 'warn';
    ruleHit = '触犯禁区 3：全局命名空间下划线开头 _name';
    verdict = '全局命名空间中以单个下划线开头的标识符为标准库保留，建议类成员改用 m_ 前缀或后置下划线（如 id_）。';
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {presets.map((sample) => (
          <button
            key={sample}
            type="button"
            onClick={() => setIdentifier(sample)}
            className={`min-h-[32px] px-2.5 py-1 text-xs font-code rounded-md transition-colors whitespace-nowrap ${
              identifier === sample
                ? 'bg-[#1E6B52] text-white dark:bg-[#4FA687] dark:text-[#0E1614]'
                : 'bg-[#EFF2F0] dark:bg-[#1C2623] text-[#3F4B48] dark:text-[#B4C0BC]'
            }`}
          >
            {sample}
          </button>
        ))}
      </div>

      <div>
        <label
          htmlFor="xiantu-ident-input"
          className="block text-[11px] font-medium text-[#596662] dark:text-[#98A6A1] mb-1.5"
        >
          输入任意 C++ 标识符实时检测保留字红线
        </label>
        <input
          id="xiantu-ident-input"
          type="text"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="例如：_FormatUser 或 m_spirit"
          className="w-full min-h-[40px] px-3.5 py-2 rounded-lg font-code text-xs bg-[#F4F6F4] dark:bg-[#101614] border border-[#141918]/15 dark:border-[#E8ECEA]/15 text-[#141918] dark:text-[#F0F4F2] focus:outline-none focus:border-[#1E6B52] dark:focus:border-[#5AB897]"
        />
      </div>

      <MetricRows
        rows={[
          { label: '待检标识符', value: trimmed || '(空)', mono: true },
          { label: '标准条款判定', value: ruleHit, accent: status === 'ok' },
        ]}
      />

      <StatusBanner status={status} text={verdict} />
    </div>
  );
}

function MagicNumberConstCastSim() {
  const [mode, setMode] = useState<'magic' | 'strip-const' | 'local-cast'>('local-cast');

  const cases = {
    magic: {
      code: `void schedule(int seconds) {\n    // 86400 是什么？满篇魔数难以维护\n    if (seconds > 86400) { triggerTimeout(); }\n}`,
      status: 'warn' as const,
      summary: '神秘魔数 86400 缺乏语义，一旦业务规则变动极易遗漏修改；应提炼为 constexpr int SECONDS_PER_DAY { 86\'400 };。',
    },
    'strip-const': {
      code: `// 反例：为迎合遗留接口，把外层 const 强行剥掉！\nvoid printLegacy(std::string& name) {\n    legacyLog(name.data()); // 破坏了整个调用链的只读契约\n}`,
      status: 'error' as const,
      summary: '切忌因小失大！一旦剥除现代接口的 const，所有只读调用者与常量对象都将无法传入该函数。',
    },
    'local-cast': {
      code: `constexpr int SECONDS_PER_DAY { 86'400 };\n\nvoid printLegacy(const std::string& name) {\n    // 确认 legacyLog 绝不改写内存时，仅在调用点局部破戒\n    legacyLog(const_cast<char*>(name.c_str()));\n}`,
      status: 'ok' as const,
      summary: '现代接口严守 const 护体，用具名 constexpr 常量替代魔数，仅在与遗留 C 接口接壤的最小局部使用 const_cast。',
    },
  };

  const current = cases[mode];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-[#EFF2F0] dark:bg-[#1C2623]">
        {(
          [
            ['magic', '魔数隐患'],
            ['strip-const', '外层破 const'],
            ['local-cast', '局部 const_cast'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setMode(key)}
            className={`min-h-[36px] px-2 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap truncate ${
              mode === key
                ? 'bg-white dark:bg-[#111816] text-[#141918] dark:text-[#F0F4F2] shadow-xs'
                : 'text-[#525E5B] dark:text-[#98A6A1]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <CodePlate code={current.code} />
      <StatusBanner status={current.status} text={current.summary} />
    </div>
  );
}

function BracelessIfEscapeSim() {
  const [braced, setBraced] = useState(false);
  const [score, setScore] = useState<60 | 95>(60);

  const bonusTriggered = braced ? score > 90 : true;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-[#EFF2F0] dark:bg-[#1C2623]">
        <button
          type="button"
          onClick={() => setBraced(false)}
          className={`min-h-[36px] px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
            !braced
              ? 'bg-white dark:bg-[#111816] text-[#B83B2A] dark:text-[#E57363] shadow-xs'
              : 'text-[#525E5B] dark:text-[#98A6A1]'
          }`}
        >
          反例：无大括号 if
        </button>
        <button
          type="button"
          onClick={() => setBraced(true)}
          className={`min-h-[36px] px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
            braced
              ? 'bg-white dark:bg-[#111816] text-[#1E6B52] dark:text-[#5AB897] shadow-xs'
              : 'text-[#525E5B] dark:text-[#98A6A1]'
          }`}
        >
          正道：始终加 {'{}'}
        </button>
      </div>

      <div className="flex items-center gap-2 text-xs">
        <span className="text-[#596662] dark:text-[#98A6A1]">测试分值：</span>
        {([60, 95] as const).map((val) => (
          <button
            key={val}
            type="button"
            onClick={() => setScore(val)}
            className={`min-h-[32px] px-3 py-1 rounded-md font-code border transition-colors ${
              score === val
                ? 'border-[#1E6B52] dark:border-[#5AB897] bg-[#EEF6F2] dark:bg-[#13251F] text-[#174D3B] dark:text-[#BCE4D5] font-semibold'
                : 'border-[#141918]/12 dark:border-[#E8ECEA]/12 text-[#525E5B] dark:text-[#98A6A1]'
            }`}
          >
            score = {val}
          </button>
        ))}
      </div>

      <CodePlate
        code={
          braced
            ? `if (score > 90) {\n    promoteRank();\n    grantSpiritBonus(); // 严守边界，仅高分触发\n}`
            : `if (score > 90)\n    promoteRank();\n    grantSpiritBonus(); // 缩进骗局：永远无条件执行！`
        }
      />

      <MetricRows
        rows={[
          { label: 'promoteRank() 是否执行', value: score > 90 ? '执行' : '跳过' },
          {
            label: 'grantSpiritBonus() 是否执行',
            value: bonusTriggered
              ? score <= 90
                ? '异常逃逸执行！（逻辑事故）'
                : '执行'
              : '安全跳过',
            accent: braced,
          },
        ]}
      />

      <StatusBanner
        status={!braced && score <= 90 ? 'error' : 'ok'}
        text={
          !braced && score <= 90
            ? '逻辑逃逸！虽然 grantSpiritBonus() 看起来缩进在 if 内，但因缺少 {}，低分 60 依然白嫖了宗门奖励！'
            : '单行 if/else 始终加上大括号 {}，后续维护追加语句绝不会发生逻辑逃逸。'
        }
      />
    </div>
  );
}

function EvalOrderUbSim() {
  const [strategy, setStrategy] = useState<'ub' | 'split'>('ub');

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-[#EFF2F0] dark:bg-[#1C2623]">
        <button
          type="button"
          onClick={() => setStrategy('ub')}
          className={`min-h-[36px] px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
            strategy === 'ub'
              ? 'bg-white dark:bg-[#111816] text-[#B83B2A] dark:text-[#E57363] shadow-xs'
              : 'text-[#525E5B] dark:text-[#98A6A1]'
          }`}
        >
          反例：val = val++ + 10
        </button>
        <button
          type="button"
          onClick={() => setStrategy('split')}
          className={`min-h-[36px] px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
            strategy === 'split'
              ? 'bg-white dark:bg-[#111816] text-[#1E6B52] dark:text-[#5AB897] shadow-xs'
              : 'text-[#525E5B] dark:text-[#98A6A1]'
          }`}
        >
          正道：拆行确立顺序
        </button>
      </div>

      <CodePlate
        code={
          strategy === 'ub'
            ? `int id { 1 };\n// 同一表达式内既自增又覆写 id → 未定义行为（UB）\nid = id++ + 3600;`
            : `constexpr int BONUS_OFFSET { 3'600 };\nint id { 1 };\nid += BONUS_OFFSET;\n++id; // 两条独立语句，所有平台 100% 确定`
        }
      />

      <MetricRows
        rows={
          strategy === 'ub'
            ? [
                { label: 'GCC -O2 可能产出', value: '3602（自增先于赋值）', mono: true },
                { label: 'Clang -O2 可能产出', value: '3601（赋值覆盖自增）', mono: true },
                { label: 'MSVC / 换优化级别', value: '结果不可预测（UB）', mono: true },
              ]
            : [
                { label: 'GCC / Clang / MSVC', value: '一致产出 3602', mono: true, accent: true },
                { label: '编译器警告与可读性', value: '零警告 · 意图一目了然' },
              ]
        }
      />

      <StatusBanner
        status={strategy === 'ub' ? 'error' : 'ok'}
        text={
          strategy === 'ub'
            ? '灵脉错乱：C++ 标准未规定同一表达式内无序副作用的先后次序，严禁写出 i = i++ 或 i++ + ++i 这类炫技雷区！'
            : '正道求稳：将有副作用的运算拆分为清晰独立的语句，消除跨编译器分化隐患。'
        }
      />
    </div>
  );
}

/* ============================================================================
 * SHARED SIMULATOR PRIMITIVES
 * ========================================================================== */

function CodePlate({ code }: { code: string }) {
  return (
    <pre className="font-code text-xs leading-[1.68] p-4 rounded-lg bg-[#F4F6F4] dark:bg-[#101614] text-[#18221F] dark:text-[#D5DFDC] overflow-x-auto border border-[#141918]/8 dark:border-[#E8ECEA]/8">
      <code>{code}</code>
    </pre>
  );
}

function MetricRows({
  rows,
}: {
  rows: { label: string; value: string; mono?: boolean; accent?: boolean }[];
}) {
  return (
    <dl className="grid grid-cols-1 text-xs">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-center justify-between gap-3 py-2.5 border-b border-[#141918]/8 dark:border-[#E8ECEA]/8 last:border-b-0"
        >
          <dt className="text-[#596662] dark:text-[#98A6A1] shrink-0">{row.label}</dt>
          <dd
            className={`text-right ${row.mono ? 'font-code' : ''} ${
              row.accent
                ? 'font-semibold text-[#1E6B52] dark:text-[#5AB897]'
                : 'font-medium text-[#141918] dark:text-[#E8ECEA]'
            }`}
          >
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function MemoryLinkDiagram({
  leftTitle,
  leftBody,
  rightTitle,
  rightBody,
  isBroken,
}: {
  leftTitle: string;
  leftBody: string;
  rightTitle: string;
  rightBody: string;
  isBroken: boolean;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-2 text-xs">
      <div className="p-3 rounded-lg bg-[#F5F7F5] dark:bg-[#111917] border border-[#141918]/10 dark:border-[#E8ECEA]/10">
        <span className="text-[11px] font-medium text-[#596662] dark:text-[#98A6A1] block mb-1">
          {leftTitle}
        </span>
        <span className="text-[#141918] dark:text-[#E8ECEA] leading-relaxed block">{leftBody}</span>
      </div>

      <div className="flex items-center justify-center py-0.5" aria-hidden="true">
        <svg width="34" height="20" viewBox="0 0 34 20" fill="none" className="rotate-90 sm:rotate-0">
          {isBroken ? (
            <>
              <line x1="2" y1="10" x2="12" y2="10" stroke="#B83B2A" strokeWidth="1.6" strokeDasharray="3 2" />
              <path d="M14 6L20 14M20 6L14 14" stroke="#B83B2A" strokeWidth="1.6" strokeLinecap="round" />
              <line x1="22" y1="10" x2="32" y2="10" stroke="#B83B2A" strokeWidth="1.6" strokeDasharray="3 2" />
            </>
          ) : (
            <>
              <line x1="2" y1="10" x2="28" y2="10" stroke="#1E6B52" strokeWidth="1.6" />
              <path d="M24 5.5L29.5 10L24 14.5" stroke="#1E6B52" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </>
          )}
        </svg>
      </div>

      <div
        className={`p-3 rounded-lg border ${
          isBroken
            ? 'bg-[#FAF0EE] dark:bg-[#271614] border-[#B83B2A]/30 dark:border-[#E57363]/30'
            : 'bg-[#F5F7F5] dark:bg-[#111917] border-[#141918]/10 dark:border-[#E8ECEA]/10'
        }`}
      >
        <span className="text-[11px] font-medium text-[#596662] dark:text-[#98A6A1] block mb-1">
          {rightTitle}
        </span>
        <span
          className={`leading-relaxed block ${
            isBroken ? 'text-[#8C281B] dark:text-[#F0BDB5] font-medium' : 'text-[#141918] dark:text-[#E8ECEA]'
          }`}
        >
          {rightBody}
        </span>
      </div>
    </div>
  );
}

function StepControls({
  step,
  onStepChange,
}: {
  step: 1 | 2 | 3;
  onStepChange: (next: 1 | 2 | 3) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 pt-1">
      <button
        type="button"
        onClick={() => onStepChange(1)}
        className="inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 text-xs font-medium rounded-lg border border-[#141918]/15 dark:border-[#E8ECEA]/15 text-[#4B5653] dark:text-[#A3B0AC] hover:text-[#141918] dark:hover:text-white transition-colors whitespace-nowrap"
      >
        <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.6} />
        重置步骤
      </button>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={step === 1}
          onClick={() => onStepChange(Math.max(1, step - 1) as 1 | 2 | 3)}
          className="min-h-[38px] px-3 py-1.5 text-xs font-medium rounded-lg border border-[#141918]/15 dark:border-[#E8ECEA]/15 text-[#141918] dark:text-[#E8ECEA] disabled:opacity-40 transition-colors whitespace-nowrap"
        >
          上一步
        </button>
        <button
          type="button"
          disabled={step === 3}
          onClick={() => onStepChange(Math.min(3, step + 1) as 1 | 2 | 3)}
          className="min-h-[38px] px-4 py-1.5 text-xs font-medium rounded-lg bg-[#1E6B52] dark:bg-[#4FA687] text-white dark:text-[#0E1614] hover:opacity-90 disabled:opacity-40 transition-opacity whitespace-nowrap"
        >
          下一步推演
        </button>
      </div>
    </div>
  );
}

function StatusBanner({
  status,
  text,
}: {
  status: 'ok' | 'warn' | 'error' | 'info';
  text: string;
}) {
  const styles = {
    ok: {
      box: 'bg-[#EEF6F2] dark:bg-[#13251F] border-[#1E6B52]/20 dark:border-[#5AB897]/25 text-[#174D3B] dark:text-[#BCE4D5]',
      label: '安全通过',
      icon: CheckCircle2,
    },
    warn: {
      box: 'bg-[#FBF6EA] dark:bg-[#241E12] border-[#9A7B3E]/25 dark:border-[#D4B36E]/25 text-[#664F1F] dark:text-[#E5CFA0]',
      label: '隐患警示',
      icon: AlertTriangle,
    },
    error: {
      box: 'bg-[#FAF0EE] dark:bg-[#271614] border-[#B83B2A]/25 dark:border-[#E57363]/25 text-[#7D2418] dark:text-[#F2C3BC]',
      label: '拦截 / 心魔',
      icon: XCircle,
    },
    info: {
      box: 'bg-[#F2F5F4] dark:bg-[#18211F] border-[#141918]/10 dark:border-[#E8ECEA]/10 text-[#33403C] dark:text-[#C5D1CD]',
      label: '法阵提示',
      icon: ShieldCheck,
    },
  }[status];

  const Icon = styles.icon;

  return (
    <div className={`p-3.5 rounded-lg border text-xs leading-relaxed flex items-start gap-2.5 ${styles.box}`}>
      <Icon className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={1.6} />
      <div>
        <span className="font-semibold mr-1.5">{styles.label} ·</span>
        <span>{text}</span>
      </div>
    </div>
  );
}
