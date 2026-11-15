import type { StepKey } from "../lib/course";

/**
 * 课程标题回退中文映射（当 Markdown 一级标题仍保留英文前缀或需统一命名时使用）
 */
export const CHINESE_TITLES: Record<number, string> = {
  33: "多态与虚函数接口",
  45: "泛型数据结构与算法：模板应用",
  46: "防御式设计：提供完备的校验与防护机制",
  47: "为扩展性而设计：开闭原则与演进架构",
  48: "设计易用接口：一致性与人体工学",
  49: "面向受众与目标场景的接口设计",
  50: "防呆接口设计：让正确使用变得自然，让错误使用无法编译",
};

/**
 * 每日一小时学习闭环（8 阶段 / 10 阶段）元数据与时间预算
 */
export const STAGE_DESCRIPTIONS: Record<StepKey, { budget: number; desc: string }> = {
  read: {
    budget: 5,
    desc: "定位本章工程背景与核心问题，明确要解决的系统边界。",
  },
  recall: {
    budget: 4,
    desc: "检索前置知识与上一课的关键契约，建立知识连接。",
  },
  concept: {
    budget: 10,
    desc: "拆解 C++ 语言机制、对象模型与零成本抽象底层原理。",
  },
  refactor: {
    budget: 5,
    desc: "对比脆弱的 C 写法与现代 C++ 重构方案，消除资源与类型隐患。",
  },
  design: {
    budget: 6,
    desc: "识别真实变化轴与稳定边界，判断是否需要 Pattern，并明确 owner、borrow 与 lifetime。",
  },
  embedded: {
    budget: 6,
    desc: "映射到 RTOS、Driver、Modem 或 Embedded Linux，检查线程、IRQ、WCET、内存与 teardown。",
  },
  rules: {
    budget: 5,
    desc: "提炼可落地的 Embedded C++ 编码规范与代码评审检查项。",
  },
  lab: {
    budget: 9,
    desc: "在浏览器工作区编译运行真实源码，结合输出与内存轨迹验证。",
  },
  review: {
    budget: 4,
    desc: "盘点常见误用与边界陷阱，防患未然。",
  },
  pass: {
    budget: 6,
    desc: "完成自测检验，能够独立解释并写出等价实现后再标记通过。",
  },
};

export interface LearningPathwayMeta {
  id: "topics" | "lab" | "slides" | "rtos";
  href: string;
  isExternalBase?: boolean;
  title: string;
  arrow: "→" | "↗";
  description: string;
}

/**
 * 首页学习指南 4 个核心学习入口
 */
export const TODAY_PATHWAYS: readonly LearningPathwayMeta[] = [
  {
    id: "topics",
    href: "?view=topics",
    title: "按专题深入",
    arrow: "→",
    description: "接口、所有权、嵌入式与系统工程",
  },
  {
    id: "lab",
    href: "?view=lab",
    title: "动手做实验",
    arrow: "→",
    description: "运行源码，观察输出与内存变化",
  },
  {
    id: "slides",
    href: "?view=slides",
    title: "浏览配套课件",
    arrow: "→",
    description: "Slidev 蓝图幻灯片、大纲对照与演讲要点",
  },
  {
    id: "rtos",
    href: "rtos.html",
    isExternalBase: true,
    title: "理解并发调度",
    arrow: "↗",
    description: "回放任务、同步与中断的执行过程",
  },
];

/**
 * 每周课程中文主题概览
 */
export const WEEK_ZH_THEMES: Record<number, string> = {
  1: "从 C 到现代 C++ 基础与状态建模",
  2: "字符串视图、生命周期与编码风格",
  3: "工程边界、错误处理与可测试架构",
  4: "抽象契约、耦合内聚与类不变式",
  5: "对象组合、所有权与多态虚拟接口",
  6: "继承边界、切片防御与 Mixin 组合",
  7: "代码复用、泛型模板与防御性检查",
  8: "易用接口设计、受众边界与 SOLID",
  9: "智能指针、动态内存与资源分配边界",
  10: "对象生命周期、固定容量与资源边界",
  11: "拷贝构造、委托构造与对象析构契约",
  12: "赋值运算符、移动语义与对象资源所有权",
};

/**
 * 提供配套 Slidev 工程蓝图课件的课程 Day 集合
 */
export const SLIDE_ENABLED_DAYS = new Set<number>([1, 2, 3]);

export interface FaqHighlightCard {
  id: string;
  eyebrow: string;
  badge: string;
  title: string;
  summary: string;
}

/**
 * FAQ 页面顶部高亮专题卡片配置
 */
export const FAQ_HIGHLIGHT_CARDS: readonly FaqHighlightCard[] = [
  {
    id: "q1-modifiers",
    eyebrow: "高频专题 Q1 · 语言机制全景",
    badge: "6 大分类 · 4 大作用维度 · C++11–C++23",
    title:
      "C++ 修饰符（说明符 Specifiers、限定符 Qualifiers 与属性 Attributes）深度辨析",
    summary:
      "从访问权限、常量与编译期求值、存储期与链接性、成员函数约束、C++20 模块化到标准属性，系统梳理核心区别与工程选型。",
  },
];

export interface FaqDimensionItem {
  label: string;
  keywords: string;
}

/**
 * FAQ 侧边栏维度速览配置
 */
export const FAQ_DIMENSIONS: readonly FaqDimensionItem[] = [
  { label: "权限与边界维度", keywords: "public / protected / private / export" },
  { label: "求值与只读维度", keywords: "const / mutable / constexpr / consteval" },
  { label: "实例与调用约束", keywords: "& / && / explicit / noexcept / virtual" },
  { label: "链接与编译器指导", keywords: "static / extern / inline / [[...]]" },
];
