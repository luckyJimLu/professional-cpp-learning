/**
 * C++ 子集 AST 节点定义
 *
 * 由 @lezer/cpp 语法树降级而来，只保留模拟器支持的语言子集。
 */

export interface SourcePos {
  line: number; // 1-based
}

// ==========================================
// 语句
// ==========================================

export type Stmt =
  | BlockStmt
  | VarDeclStmt
  | ExprStmt
  | IfStmt
  | WhileStmt
  | DoWhileStmt
  | ForStmt
  | BreakStmt
  | ContinueStmt
  | ReturnStmt;

export interface BlockStmt extends SourcePos {
  kind: "block";
  body: Stmt[];
}

export interface VarDeclStmt extends SourcePos {
  kind: "vardecl";
  /** 类型原文（可能是 "int"、"std::mutex"、"std::counting_semaphore<2>"、"auto" 等） */
  typeText: string;
  name: string;
  /** 是否数组声明（`int arr[4]`），size 为常量表达式 */
  arraySize?: number;
  init?: Expr;
  /** 括号形式构造实参（`std::thread t(fn, 1)` / `std::lock_guard<std::mutex> g(m)`） */
  ctorArgs?: Expr[];
  /** 花括号形式构造实参（`rtos::mutex m{rtos::no_priority_inheritance}`） */
  braceArgs?: Expr[];
  isConst: boolean;
}

export interface ExprStmt extends SourcePos {
  kind: "expr";
  expr: Expr;
}

export interface IfStmt extends SourcePos {
  kind: "if";
  cond: Expr;
  then: Stmt;
  else?: Stmt;
}

export interface WhileStmt extends SourcePos {
  kind: "while";
  cond: Expr;
  body: Stmt;
}

export interface DoWhileStmt extends SourcePos {
  kind: "dowhile";
  cond: Expr;
  body: Stmt;
}

export interface ForStmt extends SourcePos {
  kind: "for";
  init: Stmt | null; // vardecl 或表达式语句
  cond: Expr | null;
  inc: Expr | null;
  body: Stmt;
}

export interface BreakStmt extends SourcePos {
  kind: "break";
}

export interface ContinueStmt extends SourcePos {
  kind: "continue";
}

export interface ReturnStmt extends SourcePos {
  kind: "return";
  value?: Expr;
}

// ==========================================
// 表达式
// ==========================================

export type Expr =
  | IntLitExpr
  | BoolLitExpr
  | StringLitExpr
  | CharLitExpr
  | DurationLitExpr
  | IdentExpr
  | MemberExpr
  | IndexExpr
  | UnaryExpr
  | UpdateExpr
  | BinaryExpr
  | AssignExpr
  | CondExpr
  | CallExpr
  | LambdaExpr
  | CommaExpr
  | ArrayInitExpr
  | DesignatedInitExpr;

export interface IntLitExpr extends SourcePos {
  kind: "int";
  value: number;
  /** 原始文本（诊断/展示用） */
  text: string;
}

export interface BoolLitExpr extends SourcePos {
  kind: "bool";
  value: boolean;
}

export interface StringLitExpr extends SourcePos {
  kind: "string";
  value: string;
}

export interface CharLitExpr extends SourcePos {
  kind: "char";
  code: number;
}

/** 100ms / 500ms 等时间字面量 */
export interface DurationLitExpr extends SourcePos {
  kind: "duration";
  ms: number;
}

export interface IdentExpr extends SourcePos {
  kind: "ident";
  name: string;
}

/** obj.member（q.send、blink.start、t.join 等通过它 + CallExpr 表达） */
export interface MemberExpr extends SourcePos {
  kind: "member";
  obj: Expr;
  name: string;
}

export interface IndexExpr extends SourcePos {
  kind: "index";
  obj: Expr;
  index: Expr;
}

export interface UnaryExpr extends SourcePos {
  kind: "unary";
  op: "!" | "-" | "+" | "~";
  operand: Expr;
}

export interface UpdateExpr extends SourcePos {
  kind: "update";
  op: "++" | "--";
  prefix: boolean;
  target: Expr;
}

export type BinOp =
  | "+" | "-" | "*" | "/" | "%"
  | "<" | ">" | "<=" | ">=" | "==" | "!="
  | "&&" | "||"
  | "&" | "|" | "^" | "<<" | ">>";

export interface BinaryExpr extends SourcePos {
  kind: "binary";
  op: BinOp;
  lhs: Expr;
  rhs: Expr;
}

export type AssignOp =
  | "=" | "+=" | "-=" | "*=" | "/=" | "%="
  | "&=" | "|=" | "^=" | "<<=" | ">>=";

export interface AssignExpr extends SourcePos {
  kind: "assign";
  op: AssignOp;
  target: Expr; // ident / index / member(变量字段)
  value: Expr;
}

export interface CondExpr extends SourcePos {
  kind: "cond";
  cond: Expr;
  then: Expr;
  else: Expr;
}

export interface CallExpr extends SourcePos {
  kind: "call";
  /** 被调形式：`std::this_thread::sleep_for`、`q.send`、`f`（用户函数）、`std::thread`（类型构造） */
  calleePath: string;
  /** 若是成员调用，obj 表达式（先求值再分派） */
  calleeObj?: Expr;
  /** 类型构造调用（`std::counting_semaphore<2>` 等，用于 auto x = T(...); 恢复） */
  isTypeCtor?: boolean;
  args: Expr[];
}

/** 指定初始化列表 `{.name = "x", .priority = 3}`（仅用于内核 API 参数） */
export interface DesignatedInitExpr extends SourcePos {
  kind: "designated";
  fields: Record<string, Expr>;
}

export interface LambdaExpr extends SourcePos {
  kind: "lambda";
  params: string[];
  /** 捕获方式：ref（[&]）/ copy（[=]）/ none（[]） */
  capture: "ref" | "copy" | "none";
  /** 拷贝捕获的变量名（[=] 时编译期未知，按创建时作用域快照） */
  body: Stmt[]; // 块体语句列表
  label: string; // 形如 "<λ@L12>"
}

export interface CommaExpr extends SourcePos {
  kind: "comma";
  exprs: Expr[];
}

export interface ArrayInitExpr extends SourcePos {
  kind: "array_init";
  items: Expr[];
}

// ==========================================
// 函数与程序
// ==========================================

export interface FuncParam {
  name: string;
  typeText: string;
}

export interface FuncDecl extends SourcePos {
  name: string;
  returnType: "void" | "int" | "bool" | "auto";
  params: FuncParam[];
  body: BlockStmt;
}

export interface Program {
  globals: VarDeclStmt[];
  functions: Map<string, FuncDecl>;
  main: FuncDecl;
  lines: number; // 源码总行数
}
