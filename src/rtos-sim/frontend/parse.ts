/**
 * C++ 子集解析器
 *
 * 用 @lezer/cpp 解析 → 语法树子集校验（行级诊断）→ 降级为精简 AST。
 *
 * 两处已知的 GLR 误解析需要恢复：
 *  a) `std::counting_semaphore<2> s(1);` —— 模板实参是数字时被当成
 *     比较表达式（`(a < 2) > s(1)`）。恢复手法：语句文本正则匹配 +
 *     lookupObjectType 校验 + 重解析实参。
 *  b) `std::lock_guard<std::mutex> g(m);` / `std::scoped_lock lk(m, m2);`
 *     —— 实参看起来像类型名时被当成函数声明（most vexing parse）。
 *     恢复手法：把 FunctionDeclarator 的 ParameterList 当作构造实参。
 */

import { parser } from "@lezer/cpp";
import type { SyntaxNode } from "@lezer/common";
import type {
  Program,
  FuncDecl,
  FuncParam,
  Stmt,
  Expr,
  VarDeclStmt,
  BinOp,
  AssignOp,
  DesignatedInitExpr,
} from "./ast.ts";
import {
  NAMESPACE_CALLS,
  NAMESPACE_CONSTANTS,
  METHOD_CALLS,
  lookupObjectType,
} from "./apiCatalog.ts";
import type { RtosDiagnostic } from "../types.ts";

export interface ParseResult {
  program: Program | null;
  diagnostics: RtosDiagnostic[];
}

// ==========================================
// 词表
// ==========================================

/** 类型节点名（Declaration/FunctionDefinition 的第一个有效子节点） */
const TYPE_NODE_NAMES = new Set([
  "PrimitiveType",
  "SizedTypeSpecifier",
  "ScopedTypeIdentifier",
  "TemplateType",
  "TypeIdentifier",
  "StructSpec",
  "ClassSpec",
  "UnionSpec",
  "EnumSpec",
]);

const STREAM_IDENTS = new Set(["std::cout", "std::endl"]);
const GLOBAL_OK_TOKENS = new Set(["static", "extern", "inline", "constexpr", "volatile", "mutable"]);

/** 方法名 → 参数个数范围（跨对象类别合并，parse 期只能做宽松校验） */
const METHOD_ARITY = new Map<string, { min: number; max: number }>();
for (const table of Object.values(METHOD_CALLS)) {
  for (const [method, spec] of Object.entries(table)) {
    const prev = METHOD_ARITY.get(method);
    if (prev) {
      prev.min = Math.min(prev.min, spec.minArgs);
      prev.max = Math.max(prev.max, spec.maxArgs);
    } else {
      METHOD_ARITY.set(method, { min: spec.minArgs, max: spec.maxArgs });
    }
  }
}

const BIN_OPS = new Set<string>([
  "+", "-", "*", "/", "%",
  "<", ">", "<=", ">=", "==", "!=",
  "&&", "||",
  "&", "|", "^", "<<", ">>",
]);

const ASSIGN_OPS = new Set<string>(["=", "+=", "-=", "*=", "/=", "%=", "&=", "|=", "^=", "<<=", ">>="]);

// ==========================================
// 工具
// ==========================================

function childrenOf(n: SyntaxNode): SyntaxNode[] {
  const out: SyntaxNode[] = [];
  for (let c = n.firstChild; c; c = c.nextSibling) {
    if (c.name !== "Comment") out.push(c);
  }
  return out;
}

function nameOf(n: SyntaxNode): string {
  return n.name ?? "";
}

function textOf(code: string, n: SyntaxNode): string {
  return code.slice(n.from, n.to);
}

function unescapeChar(raw: string): number {
  switch (raw) {
    case "n": return 10;
    case "t": return 9;
    case "r": return 13;
    case "0": return 0;
    case "a": return 7;
    case "b": return 8;
    case "f": return 12;
    case "v": return 11;
    case "\\": return 92;
    case "'": return 39;
    case '"': return 34;
    default: return raw.codePointAt(0) ?? 0;
  }
}

function unescapeString(inner: string): string {
  let out = "";
  for (let i = 0; i < inner.length; i++) {
    if (inner[i] === "\\" && i + 1 < inner.length) {
      out += String.fromCharCode(unescapeChar(inner[i + 1]));
      i++;
    } else {
      out += inner[i];
    }
  }
  return out;
}

/** 数字字面量（十进制/十六进制/二进制，拒绝浮点） */
function parseNumberText(text: string): number | null {
  const m = /^(0[xX][0-9a-fA-F]+|0[bB][01]+|\d+)([uUlL]*)$/.exec(text);
  if (!m) return null;
  const body = m[1];
  if (body.startsWith("0x") || body.startsWith("0X")) return parseInt(body.slice(2), 16);
  if (body.startsWith("0b") || body.startsWith("0B")) return parseInt(body.slice(2), 2);
  return parseInt(body, 10);
}

// ==========================================
// 解析上下文
// ==========================================

interface FuncSignature {
  returnType: "void" | "int" | "bool" | "auto";
  params: FuncParam[];
  defined: boolean;
  line: number;
}

class ParseCtx {
  readonly code: string;
  readonly lineStarts: number[] = [0];
  readonly diagnostics: RtosDiagnostic[] = [];
  readonly signatures = new Map<string, FuncSignature>();

  constructor(code: string, parent?: ParseCtx) {
    this.code = code;
    for (let i = 0; i < code.length; i++) {
      if (code[i] === "\n") this.lineStarts.push(i + 1);
    }
    if (parent) this.signatures = parent.signatures; // 重解析时共享函数签名表
  }

  lineOf(pos: number): number {
    let lo = 0;
    let hi = this.lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (this.lineStarts[mid] <= pos) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  }

  error(message: string, line?: number): void {
    this.push({ level: "error", message, line });
  }

  push(d: RtosDiagnostic): void {
    this.diagnostics.push(d);
  }

  text(n: SyntaxNode): string {
    return textOf(this.code, n);
  }

  hasErrors(): boolean {
    return this.diagnostics.some((d) => d.level === "error");
  }

  /** 扫描 ⚠ 错误节点（跳过其子树），返回是否发现错误 */
  scanErrorNodes(root: SyntaxNode): boolean {
    let found = false;
    const visit = (n: SyntaxNode): void => {
      if (n.type.isError) {
        found = true;
        const snippet = this.code.slice(n.from, n.to).replace(/\s+/g, " ").slice(0, 24);
        this.error(`无法解析此处的语法（"${snippet}"），可能是模拟器不支持的写法`, this.lineOf(n.from));
        return;
      }
      for (const c of childrenOf(n)) visit(c);
    };
    visit(root);
    return found;
  }

  /** 重解析实参文本：`__args(<text>);` → CallExpression → ArgumentList（诊断行号映射回原语句） */
  reparseArgs(argsText: string, origLine: number): Expr[] | null {
    const synthetic = `__args(${argsText});`;
    const tree = parser.parse(synthetic);
    const sub = new ParseCtx(synthetic, this);
    sub.error = (message: string) => {
      this.error(message, origLine);
    };
    if (tree.topNode.type.isError) return null;
    const stmtNode = childrenOf(tree.topNode).find((c) => c.name === "ExpressionStatement");
    const callNode = stmtNode ? childrenOf(stmtNode).find((c) => c.name === "CallExpression") : null;
    const argList = callNode ? childrenOf(callNode).find((c) => c.name === "ArgumentList") : null;
    if (!argList) return null;
    const args: Expr[] = [];
    for (const c of childrenOf(argList)) {
      if (c.name === "(" || c.name === ")" || c.name === ",") continue;
      const e = expr(sub, c);
      if (!e) return null;
      fixLine(e, origLine);
      args.push(e);
    }
    return args;
  }
}

/** 把重解析得到的表达式的行号统一改回原语句行 */
function fixLine(e: Expr, line: number): void {
  e.line = line;
  switch (e.kind) {
    case "member":
      fixLine(e.obj, line);
      break;
    case "index":
      fixLine(e.obj, line);
      fixLine(e.index, line);
      break;
    case "unary":
      fixLine(e.operand, line);
      break;
    case "update":
      fixLine(e.target, line);
      break;
    case "binary":
      fixLine(e.lhs, line);
      fixLine(e.rhs, line);
      break;
    case "assign":
      fixLine(e.target, line);
      fixLine(e.value, line);
      break;
    case "cond":
      fixLine(e.cond, line);
      fixLine(e.then, line);
      fixLine(e.else, line);
      break;
    case "call":
      if (e.calleeObj) fixLine(e.calleeObj, line);
      for (const a of e.args) fixLine(a, line);
      break;
    case "comma":
      for (const x of e.exprs) fixLine(x, line);
      break;
    case "array_init":
      for (const x of e.items) fixLine(x, line);
      break;
    case "designated":
      for (const x of Object.values(e.fields)) fixLine(x, line);
      break;
    default:
      break;
  }
}

// ==========================================
// 表达式
// ==========================================

function expr(ctx: ParseCtx, node: SyntaxNode): Expr | null {
  const name = nameOf(node);
  switch (name) {
    case "Number": {
      const text = ctx.text(node);
      const value = parseNumberText(text);
      if (value === null) {
        if (/[.eEfF]/.test(text)) {
          ctx.error("不支持浮点数字面量（模拟器只支持整数运算）", ctx.lineOf(node.from));
        } else {
          ctx.error(`无法识别的数字字面量 "${text}"`, ctx.lineOf(node.from));
        }
        return null;
      }
      return { kind: "int", value, text, line: ctx.lineOf(node.from) };
    }
    case "True":
    case "False":
      return { kind: "bool", value: name === "True", line: ctx.lineOf(node.from) };
    case "String": {
      const raw = ctx.text(node);
      return { kind: "string", value: unescapeString(raw.slice(1, -1)), line: ctx.lineOf(node.from) };
    }
    case "CharLiteral": {
      const raw = ctx.text(node);
      const inner = raw.slice(1, -1);
      let code: number;
      if (inner.startsWith("\\")) code = unescapeChar(inner.slice(1));
      else code = inner.codePointAt(0) ?? 0;
      return { kind: "char", code, line: ctx.lineOf(node.from) };
    }
    case "UserDefinedLiteral": {
      // 100ms：Number + Identifier("ms")
      const parts = childrenOf(node);
      const numNode = parts.find((c) => c.name === "Number");
      const suffixNode = parts.find((c) => c.name === "Identifier");
      const line = ctx.lineOf(node.from);
      if (!numNode || !suffixNode) {
        ctx.error("无法识别的字面量后缀", line);
        return null;
      }
      const suffix = ctx.text(suffixNode);
      const value = parseNumberText(ctx.text(numNode));
      if (suffix !== "ms" || value === null) {
        ctx.error(`不支持的时间字面量 "${ctx.text(node)}"（只支持 ms 后缀，如 100ms）`, line);
        return null;
      }
      return { kind: "duration", ms: value, line };
    }
    case "Identifier":
      return { kind: "ident", name: ctx.text(node), line: ctx.lineOf(node.from) };
    case "ScopedIdentifier": {
      const full = ctx.text(node).replace(/\s+/g, "");
      const line = ctx.lineOf(node.from);
      if (!NAMESPACE_CONSTANTS[full] && !STREAM_IDENTS.has(full)) {
        ctx.error(`不支持的标准库标识符 "${full}"`, line);
        return null;
      }
      return { kind: "ident", name: full, line };
    }
    case "FieldExpression": {
      const parts = childrenOf(node);
      const fieldNode = parts.find((c) => c.name === "FieldIdentifier");
      const objNode = parts[0];
      if (!fieldNode || !objNode) {
        ctx.error("无法解析的成员访问表达式", ctx.lineOf(node.from));
        return null;
      }
      const obj = expr(ctx, objNode);
      if (!obj) return null;
      return { kind: "member", obj, name: ctx.text(fieldNode), line: ctx.lineOf(node.from) };
    }
    case "SubscriptExpression": {
      const parts = childrenOf(node).filter((c) => c.name !== "[" && c.name !== "]");
      if (parts.length < 2) {
        ctx.error("无法解析的下标表达式", ctx.lineOf(node.from));
        return null;
      }
      const obj = expr(ctx, parts[0]);
      const index = expr(ctx, parts[parts.length - 1]);
      if (!obj || !index) return null;
      return { kind: "index", obj, index, line: ctx.lineOf(node.from) };
    }
    case "CallExpression":
      return callExpr(ctx, node);
    case "BinaryExpression": {
      const parts = childrenOf(node);
      const opNode = parts.find((c) => c.name === "CompareOp" || c.name === "LogicOp" || c.name === "BitOp" || c.name === "ArithOp");
      const lhsNode = parts[0];
      const rhsNode = parts[parts.length - 1];
      if (!opNode || parts.length < 3 || !lhsNode || !rhsNode) {
        ctx.error("无法解析的二元表达式", ctx.lineOf(node.from));
        return null;
      }
      const op = ctx.text(opNode);
      if (!BIN_OPS.has(op)) {
        ctx.error(`不支持的表达式运算符 "${op}"`, ctx.lineOf(opNode.from));
        return null;
      }
      const lhs = expr(ctx, lhsNode);
      const rhs = expr(ctx, rhsNode);
      if (!lhs || !rhs) return null;
      return { kind: "binary", op: op as BinOp, lhs, rhs, line: ctx.lineOf(node.from) };
    }
    case "AssignmentExpression": {
      const parts = childrenOf(node);
      const opNode = parts.find((c) => c.name === "UpdateOp" || c.name === "AssignOp");
      const op = opNode ? ctx.text(opNode) : "=";
      if (!ASSIGN_OPS.has(op)) {
        ctx.error(`不支持的表达式运算符 "${op}"`, ctx.lineOf(node.from));
        return null;
      }
      const target = parts[0];
      const value = parts[parts.length - 1];
      if (!target || !value) {
        ctx.error("无法解析的赋值表达式", ctx.lineOf(node.from));
        return null;
      }
      const targetExpr = expr(ctx, target);
      const valueExpr = expr(ctx, value);
      if (!targetExpr || !valueExpr) return null;
      return { kind: "assign", op: op as AssignOp, target: targetExpr, value: valueExpr, line: ctx.lineOf(node.from) };
    }
    case "ConditionalExpression": {
      const parts = childrenOf(node).filter((c) => c.name !== "?" && c.name !== ":");
      if (parts.length !== 3) {
        ctx.error("无法解析的条件表达式", ctx.lineOf(node.from));
        return null;
      }
      const cond = expr(ctx, parts[0]);
      const then = expr(ctx, parts[1]);
      const other = expr(ctx, parts[2]);
      if (!cond || !then || !other) return null;
      return { kind: "cond", cond, then, else: other, line: ctx.lineOf(node.from) };
    }
    case "UpdateExpression": {
      const parts = childrenOf(node);
      const opNode = parts.find((c) => c.name === "UpdateOp");
      const targetNode = parts.find((c) => c !== opNode);
      if (!opNode || !targetNode) {
        ctx.error("无法解析的自增/自减表达式", ctx.lineOf(node.from));
        return null;
      }
      const target = expr(ctx, targetNode);
      if (!target) return null;
      const op = ctx.text(opNode) === "++" ? "++" : "--";
      return { kind: "update", op, prefix: parts[0] === opNode, target, line: ctx.lineOf(node.from) };
    }
    case "UnaryExpression": {
      const parts = childrenOf(node);
      const opNode = parts[0];
      const operandNode = parts[parts.length - 1];
      const op = ctx.text(opNode);
      if (!["!", "-", "+", "~"].includes(op)) {
        ctx.error(
          op === "*" ? "不支持指针解引用（模拟器不支持指针）" : `不支持的一元运算符 "${op}"`,
          ctx.lineOf(node.from),
        );
        return null;
      }
      const operand = expr(ctx, operandNode);
      if (!operand) return null;
      return { kind: "unary", op: op as "!" | "-" | "+" | "~", operand, line: ctx.lineOf(node.from) };
    }
    case "ParenthesizedExpression": {
      const parts = childrenOf(node).filter((c) => c.name !== "(" && c.name !== ")");
      if (parts.length !== 1) {
        ctx.error("无法解析的括号表达式", ctx.lineOf(node.from));
        return null;
      }
      return expr(ctx, parts[0]);
    }
    case "CommaExpression": {
      const parts = childrenOf(node).filter((c) => c.name !== ",");
      const exprs: Expr[] = [];
      for (const p of parts) {
        const e = expr(ctx, p);
        if (!e) return null;
        exprs.push(e);
      }
      return { kind: "comma", exprs, line: ctx.lineOf(node.from) };
    }
    case "LambdaExpression":
      return lambdaExpr(ctx, node);
    case "InitializerList":
      return initListExpr(ctx, node);
    case "PointerExpression":
      ctx.error("不支持取地址/指针操作（模拟器不支持指针）", ctx.lineOf(node.from));
      return null;
    case "NewExpression":
      ctx.error("不支持 new 表达式", ctx.lineOf(node.from));
      return null;
    case "DeleteExpression":
      ctx.error("不支持 delete 表达式", ctx.lineOf(node.from));
      return null;
    case "SizeofExpression":
      ctx.error("不支持 sizeof 表达式", ctx.lineOf(node.from));
      return null;
    case "CastExpression":
      ctx.error("不支持类型转换表达式", ctx.lineOf(node.from));
      return null;
    case "⚠":
      return null; // 已在 scanErrorNodes 中诊断
    default:
      ctx.error(`不支持的表达式语法（${name}）`, ctx.lineOf(node.from));
      return null;
  }
}

function lambdaExpr(ctx: ParseCtx, node: SyntaxNode): Expr | null {
  const line = ctx.lineOf(node.from);
  const parts = childrenOf(node);
  const captureNode = parts.find((c) => c.name === "LambdaCaptureSpecifier");
  const declarator = parts.find((c) => c.name === "AbstractFunctionDeclarator");
  const bodyNode = parts.find((c) => c.name === "CompoundStatement");
  if (!captureNode || !bodyNode) {
    ctx.error("无法解析的 lambda 表达式", line);
    return null;
  }
  const captureText = ctx.text(captureNode);
  let capture: "ref" | "copy" | "none";
  if (captureText === "[]") capture = "none";
  else if (captureText === "[&]") capture = "ref";
  else if (captureText === "[=]") capture = "copy";
  else {
    ctx.error(`不支持的 lambda 捕获 ${captureText}（只支持 []、[&]、[=]）`, line);
    return null;
  }
  const params: string[] = [];
  if (declarator) {
    const paramList = childrenOf(declarator).find((c) => c.name === "ParameterList");
    if (paramList) {
      for (const p of childrenOf(paramList)) {
        if (p.name !== "ParameterDeclaration") continue;
        const idNode = childrenOf(p).find((c) => c.name === "Identifier");
        if (!idNode) {
          ctx.error("lambda 参数必须命名且为值传递（int/bool）", ctx.lineOf(p.from));
          return null;
        }
        params.push(ctx.text(idNode));
      }
    }
  }
  const body = stmts(ctx, bodyNode, false);
  return { kind: "lambda", params, capture, body, label: `<λ@L${line}>`, line };
}

function initListExpr(ctx: ParseCtx, node: SyntaxNode): Expr | null {
  const line = ctx.lineOf(node.from);
  const parts = childrenOf(node).filter((c) => c.name !== "{" && c.name !== "}" && c.name !== ",");
  const designated = parts.some((c) => c.name === "InitializerPair");
  if (designated) {
    const fields: Record<string, Expr> = {};
    for (const p of parts) {
      if (p.name !== "InitializerPair") continue;
      const pkids = childrenOf(p);
      const designator = pkids.find((c) => c.name === "FieldDesignator");
      const valueNode = designator ? pkids.find((c) => c !== designator) : null;
      if (!designator || !valueNode) {
        ctx.error("无法解析的指定初始化列表", line);
        return null;
      }
      const fieldNode = childrenOf(designator).find((c) => c.name === "FieldIdentifier");
      if (!fieldNode) {
        ctx.error("无法解析的指定初始化字段名", line);
        return null;
      }
      const value = expr(ctx, valueNode);
      if (!value) return null;
      fields[ctx.text(fieldNode)] = value;
    }
    return { kind: "designated", fields, line } satisfies DesignatedInitExpr;
  }
  const items: Expr[] = [];
  for (const p of parts) {
    const e = expr(ctx, p);
    if (!e) return null;
    items.push(e);
  }
  return { kind: "array_init", items, line };
}

function callExpr(ctx: ParseCtx, node: SyntaxNode): Expr | null {
  const line = ctx.lineOf(node.from);
  const parts = childrenOf(node);
  const callee = parts[0];
  const argListNode = parts.find((c) => c.name === "ArgumentList");
  if (!callee || !argListNode) {
    ctx.error("无法解析的函数调用", line);
    return null;
  }
  const args: Expr[] = [];
  for (const c of childrenOf(argListNode)) {
    if (c.name === "(" || c.name === ")" || c.name === ",") continue;
    const e = expr(ctx, c);
    if (!e) return null;
    args.push(e);
  }

  const calleeName = nameOf(callee);
  if (calleeName === "Identifier") {
    const fnName = ctx.text(callee);
    // 方法调用 obj.method(...)
    if (fnName === "FieldExpression") {
      const fparts = childrenOf(callee);
      const fieldNode = fparts.find((c) => c.name === "FieldIdentifier");
      const objNode = fparts[0];
      const methodName = fieldNode ? ctx.text(fieldNode) : "";
      const arity = METHOD_ARITY.get(methodName);
      if (!fieldNode || !objNode || !arity) {
        ctx.error(`不支持的方法 ".${methodName}"（不在模拟器 API 中）`, line);
        return null;
      }
      if (args.length < arity.min || args.length > arity.max) {
        ctx.error(`.${methodName}() 参数个数不匹配（应为 ${arity.min}~${arity.max} 个，实为 ${args.length} 个）`, line);
        return null;
      }
      const obj = expr(ctx, objNode);
      if (!obj) return null;
      return { kind: "call", calleePath: methodName, calleeObj: obj, args, line };
    }
    const spec = NAMESPACE_CALLS[`std::${fnName}`] ?? null;
    const sig = ctx.signatures.get(fnName);
    if (spec) {
      if (args.length < spec.minArgs || args.length > spec.maxArgs) {
        ctx.error(`std::${fnName}() 参数个数不匹配（应为 ${spec.minArgs}~${spec.maxArgs} 个，实为 ${args.length} 个）`, line);
        return null;
      }
      return { kind: "call", calleePath: `std::${fnName}`, args, line };
    }
    if (sig) {
      if (args.length !== sig.params.length) {
        ctx.error(`函数 ${fnName}() 需要 ${sig.params.length} 个参数（实为 ${args.length} 个）`, line);
        return null;
      }
      return { kind: "call", calleePath: fnName, args, line };
    }
    ctx.error(`无法识别的函数调用 ${fnName}()`, line);
    return null;
  }
  if (calleeName === "ScopedIdentifier" || calleeName === "ScopedNamespaceIdentifier") {
    const full = ctx.text(callee).replace(/\s+/g, "");
    const spec = NAMESPACE_CALLS[full];
    if (!spec) {
      ctx.error(`不支持的方法 ${full}()（不在模拟器 API 中）`, line);
      return null;
    }
    if (args.length < spec.minArgs || args.length > spec.maxArgs) {
      ctx.error(`${full}() 参数个数不匹配（应为 ${spec.minArgs}~${spec.maxArgs} 个，实为 ${args.length} 个）`, line);
      return null;
    }
    return { kind: "call", calleePath: full, args, line };
  }
  if (calleeName === "FieldExpression") {
    const fparts = childrenOf(callee);
    const fieldNode = fparts.find((c) => c.name === "FieldIdentifier");
    const objNode = fparts[0];
    const methodName = fieldNode ? ctx.text(fieldNode) : "";
    const arity = METHOD_ARITY.get(methodName);
    if (!fieldNode || !objNode || !arity) {
      ctx.error(`不支持的方法 ".${methodName}"（不在模拟器 API 中）`, line);
      return null;
    }
    if (args.length < arity.min || args.length > arity.max) {
      ctx.error(`.${methodName}() 参数个数不匹配（应为 ${arity.min}~${arity.max} 个，实为 ${args.length} 个）`, line);
      return null;
    }
    const obj = expr(ctx, objNode);
    if (!obj) return null;
    return { kind: "call", calleePath: methodName, calleeObj: obj, args, line };
  }
  if (calleeName === "ScopedTypeIdentifier" || calleeName === "TemplateType") {
    const typeText = ctx.text(callee).replace(/\s+/g, " ").trim();
    if (!lookupObjectType(typeText.replace(/\s+/g, ""))) {
      ctx.error(`不支持的类型 "${typeText}"`, line);
      return null;
    }
    return { kind: "call", calleePath: typeText.replace(/\s+/g, ""), isTypeCtor: true, args, line };
  }
  ctx.error(`不支持此形式的函数调用（callee: ${calleeName}）`, line);
  return null;
}

// ==========================================
// 语句
// ==========================================

function stmts(ctx: ParseCtx, node: SyntaxNode, isGlobal: boolean): Stmt[] {
  const out: Stmt[] = [];
  const parts = childrenOf(node).filter((c) => c.name !== "{" && c.name !== "}");
  for (const c of parts) {
    const s = convertStatement(ctx, c, isGlobal);
    if (s) out.push(...s);
  }
  return out;
}

function conditionExpr(ctx: ParseCtx, clause: SyntaxNode): Expr | null {
  const parts = childrenOf(clause).filter((c) => c.name !== "(" && c.name !== ")");
  if (parts.length !== 1) {
    ctx.error("无法解析的条件表达式", ctx.lineOf(clause.from));
    return null;
  }
  return expr(ctx, parts[0]);
}

/** Case A 恢复：`Type<...> name(args);` 被误解析为比较表达式 */
function tryCtorMisparse(ctx: ParseCtx, node: SyntaxNode): VarDeclStmt | null {
  const line = ctx.lineOf(node.from);
  const raw = ctx.text(node).replace(/;\s*$/, "").trim();
  const m = /^([A-Za-z_]\w*(?:::[A-Za-z_]\w*)*(?:<[^<>]*>)?)\s+([A-Za-z_]\w*)\s*\((.*)\)$/s.exec(raw);
  if (!m) return null;
  const spec = lookupObjectType(m[1]);
  if (!spec || spec.kind === "scalar" || spec.kind === "array") return null;
  const args = ctx.reparseArgs(m[3], line);
  if (!args) return null;
  return { kind: "vardecl", typeText: m[1], name: m[2], ctorArgs: args, isConst: false, line };
}

function convertStatement(ctx: ParseCtx, node: SyntaxNode, isGlobal: boolean): Stmt[] | null {
  const name = nameOf(node);
  const line = ctx.lineOf(node.from);
  switch (name) {
    case "CompoundStatement":
      return [{ kind: "block", body: stmts(ctx, node, false), line }];
    case "Declaration":
      return convertDecl(ctx, node, false);
    case "ExpressionStatement": {
      const recovered = tryCtorMisparse(ctx, node);
      if (recovered) return [recovered];
      const inner = childrenOf(node).filter((c) => c.name !== ";")[0];
      if (!inner) return [];
      const e = expr(ctx, inner);
      if (!e) return null;
      return [{ kind: "expr", expr: e, line }];
    }
    case "IfStatement": {
      const cond = childrenOf(node).find((c) => c.name === "ConditionClause");
      if (!cond) {
        ctx.error("无法解析的 if 语句", line);
        return null;
      }
      const condE = conditionExpr(ctx, cond);
      if (!condE) return null;
      let sawElse = false;
      let thenStmt: Stmt | null = null;
      let elseStmt: Stmt | null = null;
      for (const c of childrenOf(node)) {
        if (c.name === "if" || c.name === "ConditionClause") continue;
        if (c.name === "else") {
          sawElse = true;
          continue;
        }
        const converted = convertStatement(ctx, c, isGlobal);
        if (!converted || converted.length !== 1) return null;
        if (!sawElse) thenStmt = converted[0];
        else elseStmt = converted[0];
      }
      if (!thenStmt) {
        ctx.error("if 缺少主体语句", line);
        return null;
      }
      const out: Stmt = { kind: "if", cond: condE, then: thenStmt, else: elseStmt ?? undefined, line };
      return [out];
    }
    case "WhileStatement": {
      const cond = childrenOf(node).find((c) => c.name === "ConditionClause");
      if (!cond) {
        ctx.error("无法解析的 while 语句", line);
        return null;
      }
      const condE = conditionExpr(ctx, cond);
      if (!condE) return null;
      const bodyNode = childrenOf(node).find((c) => c.name === "CompoundStatement" || c.name !== "ConditionClause" && c.name !== "while");
      if (!bodyNode) {
        ctx.error("while 缺少主体语句", line);
        return null;
      }
      const body = convertStatement(ctx, bodyNode, isGlobal);
      if (!body || body.length !== 1) return null;
      return [{ kind: "while", cond: condE, body: body[0], line }];
    }
    case "DoStatement": {
      const bodyNode = childrenOf(node).find((c) => c.name === "CompoundStatement");
      const condNode = childrenOf(node).find((c) => c.name === "ParenthesizedExpression");
      if (!bodyNode || !condNode) {
        ctx.error("无法解析的 do-while 语句", line);
        return null;
      }
      const condE = conditionExpr(ctx, condNode);
      if (!condE) return null;
      const body = convertStatement(ctx, bodyNode, isGlobal);
      if (!body || body.length !== 1) return null;
      return [{ kind: "dowhile", cond: condE, body: body[0], line }];
    }
    case "ForStatement": {
      const kids = childrenOf(node);
      const openIdx = kids.findIndex((c) => c.name === "(");
      const closeIdx = kids.findIndex((c) => c.name === ")");
      const bodyNode = kids[kids.length - 1];
      if (openIdx < 0 || closeIdx < 0 || !bodyNode) {
        ctx.error("无法解析的 for 语句", line);
        return null;
      }
      const headerFrom = kids[openIdx].to;
      const headerTo = kids[closeIdx].from;
      const semis: number[] = [];
      for (let i = headerFrom; i < headerTo; i++) {
        if (ctx.code[i] === ";") semis.push(i);
      }
      if (semis.length !== 2) {
        ctx.error("for 循环头部格式错误", line);
        return null;
      }
      const parts = kids.slice(openIdx + 1, closeIdx);
      const initNode = parts.find((p) => p.to <= semis[0]) ?? null;
      const condNode = parts.find((p) => p.from >= semis[0] && p.to <= semis[1]) ?? null;
      const incNode = parts.find((p) => p.from >= semis[1]) ?? null;
      let init: Stmt | null = null;
      if (initNode) {
        if (initNode.name === "Declaration") {
          const decls = convertDecl(ctx, initNode, false);
          if (!decls || decls.length !== 1) {
            if (decls && decls.length > 1) ctx.error("for 循环初始化只支持一个声明", line);
            return null;
          }
          init = decls[0];
        } else {
          const initStmt = convertStatement(ctx, initNode, false);
          if (!initStmt || initStmt.length !== 1) return null;
          init = initStmt[0];
        }
      }
      let cond: Expr | null = null;
      if (condNode) {
        cond = expr(ctx, condNode);
        if (!cond) return null;
      }
      let inc: Expr | null = null;
      if (incNode) {
        inc = expr(ctx, incNode);
        if (!inc) return null;
      }
      const body = convertStatement(ctx, bodyNode, isGlobal);
      if (!body || body.length !== 1) return null;
      return [{ kind: "for", init, cond, inc, body: body[0], line }];
    }
    case "BreakStatement":
      return [{ kind: "break", line }];
    case "ContinueStatement":
      return [{ kind: "continue", line }];
    case "ReturnStatement": {
      const valueNode = childrenOf(node).find((c) => c.name !== "return");
      let value: Expr | null = null;
      if (valueNode) {
        value = expr(ctx, valueNode);
        if (!value) return null;
      }
      return [{ kind: "return", value: value ?? undefined, line }];
    }
    case "SwitchStatement":
    case "CaseStatement":
      ctx.error("不支持 switch 语句（请用 if/else 重写）", line);
      return null;
    case "TryStatement":
    case "ThrowStatement":
      ctx.error("不支持异常处理（try/throw/catch）", line);
      return null;
    case "GotoStatement":
    case "LabeledStatement":
      ctx.error("不支持 goto 语句", line);
      return null;
    case "RangeForStatement":
      ctx.error("不支持范围 for（请用下标遍历）", line);
      return null;
    case "UsingDeclaration":
    case "UsingDirective":
      ctx.error("不支持 using 声明（请写完整的 std:: 前缀）", line);
      return null;
    case "NamespaceDefinition":
      ctx.error("不支持命名空间定义", line);
      return null;
    case "TemplateDeclaration":
      ctx.error("不支持模板定义（模板类型只能用于标准库容器）", line);
      return null;
    case "StructSpec":
    case "ClassSpec":
    case "UnionSpec":
    case "EnumSpec":
      ctx.error("不支持用户自定义类型（class/struct/union/enum）", line);
      return null;
    case "⚠":
      return null;
    default:
      ctx.error(`不支持的语句（${name}）`, line);
      return null;
  }
}

// ==========================================
// 声明
// ==========================================

function declaratorName(ctx: ParseCtx, decl: SyntaxNode): { name: string; arraySize: number | undefined } | null {
  const kids = childrenOf(decl);
  if (decl.name === "Identifier") {
    return { name: ctx.text(decl), arraySize: undefined };
  }
  if (decl.name === "ArrayDeclarator") {
    const idNode = kids[0];
    if (!idNode || idNode.name !== "Identifier") {
      ctx.error("数组声明格式不支持（多维数组请用多个一维数组）", ctx.lineOf(decl.from));
      return null;
    }
    const sizeNodes = kids.filter((c) => c.name !== "[" && c.name !== "]" && c !== idNode);
    if (sizeNodes.length === 0) return { name: ctx.text(idNode), arraySize: undefined };
    if (sizeNodes.length !== 1 || sizeNodes[0].name !== "Number") {
      ctx.error("数组大小必须是整数字面量", ctx.lineOf(decl.from));
      return null;
    }
    const size = parseNumberText(ctx.text(sizeNodes[0]));
    if (size === null || size < 0) {
      ctx.error("数组大小必须是整数字面量", ctx.lineOf(decl.from));
      return null;
    }
    return { name: ctx.text(idNode), arraySize: size };
  }
  if (decl.name === "PointerDeclarator" || decl.name === "ReferenceDeclarator") {
    ctx.error("不支持指针/引用声明", ctx.lineOf(decl.from));
    return null;
  }
  if (decl.name === "FunctionDeclarator") {
    ctx.error("不支持在函数内定义函数", ctx.lineOf(decl.from));
    return null;
  }
  ctx.error("无法解析的声明符", ctx.lineOf(decl.from));
  return null;
}

/** Declaration → VarDeclStmt[]（支持逗号分隔的多声明符） */
function convertDecl(ctx: ParseCtx, node: SyntaxNode, isGlobal: boolean): VarDeclStmt[] | null {
  const line = ctx.lineOf(node.from);
  const kids = childrenOf(node);

  // 修饰符：const → isConst；函数内的 static/extern → 诊断
  let isConst = false;
  const typeNodes: SyntaxNode[] = [];
  const declarators: SyntaxNode[] = [];
  for (const c of kids) {
    const n = nameOf(c);
    if (n === "const") isConst = true;
    else if (n === "static" || n === "extern") {
      if (!isGlobal) {
        ctx.error("不支持函数内的 static/extern 局部变量", ctx.lineOf(c.from));
        return null;
      }
    } else if (n === "inline" || n === "constexpr" || n === "volatile" || n === "mutable") {
      // 全局修饰符，忽略
    } else if (TYPE_NODE_NAMES.has(n) || n === "auto") {
      typeNodes.push(c);
    } else if (n === "InitDeclarator" || n === "Identifier" || n === "ArrayDeclarator" || n === "FunctionDeclarator") {
      declarators.push(c);
    } else if (n === "," || n === ";") {
      // skip
    } else if (n === "StructSpec" || n === "ClassSpec" || n === "UnionSpec" || n === "EnumSpec") {
      ctx.error("不支持用户自定义类型（class/struct/union/enum）", ctx.lineOf(c.from));
      return null;
    } else if (n === "TemplateType" || n === "ScopedTypeIdentifier" || n === "PrimitiveType" || n === "SizedTypeSpecifier") {
      typeNodes.push(c);
    } else {
      ctx.error(`不支持的声明语法（${n}）`, ctx.lineOf(c.from));
      return null;
    }
  }
  if (typeNodes.length !== 1 || declarators.length === 0) {
    ctx.error("声明格式无法解析（缺少类型或声明符）", line);
    return null;
  }
  const typeNode = typeNodes[0];
  const rawType = ctx.text(typeNode);
  const cleanType = rawType.replace(/\s+/g, "");
  const spec = lookupObjectType(cleanType);
  if (!spec) {
    if (nameOf(typeNode) === "TypeIdentifier") {
      ctx.error(`不支持类型 "${rawType}"（模拟器不支持用户自定义类/结构体）`, line);
    } else {
      ctx.error(`不支持的类型 "${rawType}"`, line);
    }
    return null;
  }

  const out: VarDeclStmt[] = [];
  for (const d of declarators) {
    const declLine = ctx.lineOf(d.from);
    // InitDeclarator：[declarator, init?]
    if (d.name === "InitDeclarator") {
      const dkids = childrenOf(d);
      const innerDecl = dkids[0];
      const initNode = dkids.find((c) => c !== innerDecl);
      if (!innerDecl) {
        ctx.error("无法解析的声明符", declLine);
        return null;
      }
      const dn = declaratorName(ctx, innerDecl);
      if (!dn) return null;
      let init: Expr | undefined;
      let ctorArgs: Expr[] | undefined;
      let braceArgs: Expr[] | undefined;
      if (initNode) {
        const iname = nameOf(initNode);
        if (iname === "ArgumentList") {
          const args: Expr[] = [];
          for (const c of childrenOf(initNode)) {
            if (c.name === "(" || c.name === ")" || c.name === ",") continue;
            const e = expr(ctx, c);
            if (!e) return null;
            args.push(e);
          }
          ctorArgs = args;
        } else if (iname === "InitializerList") {
          const listExpr = initListExpr(ctx, initNode);
          if (!listExpr) return null;
          if (listExpr.kind === "designated") {
            init = listExpr;
          } else if (spec.kind === "scalar" || spec.kind === "array") {
            init = listExpr;
          } else {
            braceArgs = listExpr.kind === "array_init" ? listExpr.items : undefined;
            if (!braceArgs) return null;
          }
        } else {
          const e = expr(ctx, initNode);
          if (!e) return null;
          init = e;
        }
      }
      out.push({
        kind: "vardecl",
        typeText: cleanType,
        name: dn.name,
        arraySize: dn.arraySize,
        init,
        ctorArgs,
        braceArgs,
        isConst,
        line: declLine,
      });
      continue;
    }
    // 裸声明符（无初始化）
    if (d.name === "FunctionDeclarator") {
      if (spec.kind !== "scalar" && spec.kind !== "array") {
        // Case B：vexing parse——把 ParameterList 当作构造实参
        const idNode = childrenOf(d).find((c) => c.name === "Identifier");
        const paramList = childrenOf(d).find((c) => c.name === "ParameterList");
        if (!idNode || !paramList) {
          ctx.error("无法解析的构造声明", declLine);
          return null;
        }
        const args = ctx.reparseArgs(ctx.text(paramList).slice(1, -1), declLine);
        if (!args) return null;
        out.push({
          kind: "vardecl",
          typeText: cleanType,
          name: ctx.text(idNode),
          ctorArgs: args,
          isConst,
          line: declLine,
        });
        continue;
      }
      ctx.error("不支持在函数内声明函数", declLine);
      return null;
    }
    const dn = declaratorName(ctx, d);
    if (!dn) return null;
    out.push({ kind: "vardecl", typeText: cleanType, name: dn.name, arraySize: dn.arraySize, isConst, line: declLine });
  }
  return out;
}

// ==========================================
// 函数
// ==========================================

function convertParams(ctx: ParseCtx, paramList: SyntaxNode): FuncParam[] | null {
  const params: FuncParam[] = [];
  for (const c of childrenOf(paramList)) {
    if (c.name !== "ParameterDeclaration") continue;
    const line = ctx.lineOf(c.from);
    const kids = childrenOf(c);
    const typeNode = kids.find((k) => TYPE_NODE_NAMES.has(nameOf(k)) || nameOf(k) === "auto");
    const idNode = kids.find((k) => nameOf(k) === "Identifier");
    if (!typeNode || !idNode) {
      ctx.error("函数参数必须是命名的基础类型（int/bool 等值传递）", line);
      return null;
    }
    if (kids.some((k) => nameOf(k) === "PointerDeclarator" || nameOf(k) === "ReferenceDeclarator")) {
      ctx.error("不支持指针/引用参数", line);
      return null;
    }
    const typeText = ctx.text(typeNode).replace(/\s+/g, "");
    const spec = lookupObjectType(typeText);
    if (!spec || spec.kind !== "scalar") {
      ctx.error(`函数参数类型 "${typeText}" 不受支持（只支持 int/bool 值传递）`, line);
      return null;
    }
    params.push({ name: ctx.text(idNode), typeText });
  }
  return params;
}

function convertReturnType(ctx: ParseCtx, typeName: string, line: number): "void" | "int" | "bool" | "auto" | null {
  if (typeName === "void" || typeName === "int" || typeName === "bool" || typeName === "auto") return typeName;
  if (typeName === "unsigned" || typeName === "unsignedint") return "int";
  ctx.error(`函数返回类型 "${typeName}" 不受支持（只支持 void/int/bool/auto）`, line);
  return null;
}

function convertFunction(ctx: ParseCtx, node: SyntaxNode): FuncDecl | null {
  const line = ctx.lineOf(node.from);
  const kids = childrenOf(node).filter(
    (c) => !["static", "inline", "constexpr", "extern", "volatile"].includes(nameOf(c)),
  );
  const typeNode = kids.find((c) => TYPE_NODE_NAMES.has(nameOf(c)) || nameOf(c) === "auto");
  const declarator = kids.find((c) => c.name === "FunctionDeclarator");
  const bodyNode = kids.find((c) => c.name === "CompoundStatement");
  if (!typeNode || !declarator || !bodyNode) {
    ctx.error("函数定义格式无法解析", line);
    return null;
  }
  const returnType = convertReturnType(ctx, ctx.text(typeNode).replace(/\s+/g, ""), line);
  if (!returnType) return null;
  const idNode = childrenOf(declarator).find((c) => c.name === "Identifier");
  const paramList = childrenOf(declarator).find((c) => c.name === "ParameterList");
  if (!idNode || !paramList) {
    ctx.error("函数定义格式无法解析", line);
    return null;
  }
  const params = convertParams(ctx, paramList);
  if (!params) return null;
  const name = ctx.text(idNode);
  const body = { kind: "block" as const, body: stmts(ctx, bodyNode, false), line: ctx.lineOf(bodyNode.from) };
  return { name, returnType, params, body, line };
}

// ==========================================
// 顶层
// ==========================================

/** 顶层原型/对象构造声明的辨析：返回 true 表示已处理（记录签名） */
function tryRecordPrototype(ctx: ParseCtx, node: SyntaxNode): boolean {
  // Declaration 含 FunctionDeclarator 且类型是基础类型 → 函数原型
  if (node.name !== "Declaration") return false;
  const kids = childrenOf(node);
  const hasFnDeclarator = kids.some((c) => c.name === "FunctionDeclarator");
  if (!hasFnDeclarator) return false;
  const typeNode = kids.find((c) => TYPE_NODE_NAMES.has(nameOf(c)) || nameOf(c) === "auto");
  if (!typeNode) return false;
  const cleanType = ctx.text(typeNode).replace(/\s+/g, "");
  const spec = lookupObjectType(cleanType);
  if (spec && spec.kind !== "scalar" && spec.kind !== "array") return false; // Case B 对象构造声明
  const declarator = kids.find((c) => c.name === "FunctionDeclarator");
  const idNode = declarator ? childrenOf(declarator).find((c) => c.name === "Identifier") : null;
  const paramList = declarator ? childrenOf(declarator).find((c) => c.name === "ParameterList") : null;
  if (!idNode || !paramList) {
    ctx.error("函数原型格式无法解析", ctx.lineOf(node.from));
    return true;
  }
  const params = convertParams(ctx, paramList);
  if (!params) return true;
  const returnType = convertReturnType(ctx, cleanType, ctx.lineOf(node.from));
  if (!returnType) return true;
  const name = ctx.text(idNode);
  const existing = ctx.signatures.get(name);
  if (existing && existing.defined) return true; // 已有定义，原型可忽略
  if (!existing) {
    ctx.signatures.set(name, { returnType, params, defined: false, line: ctx.lineOf(node.from) });
  }
  return true;
}

export function parseCppSubset(code: string): ParseResult {
  const ctx = new ParseCtx(code);
  const tree = parser.parse(code);

  // 1. ⚠ 错误节点扫描（有语法错误时不再做子集降级，避免级联诊断）
  if (ctx.scanErrorNodes(tree.topNode)) {
    return { program: null, diagnostics: ctx.diagnostics };
  }

  const topLevel = childrenOf(tree.topNode);

  // 2. Pass A：收集所有函数签名（定义 + 原型），调用点校验才能前向引用
  for (const node of topLevel) {
    const name = nameOf(node);
    if (name === "FunctionDefinition") {
      const kids = childrenOf(node).filter(
        (c) => !["static", "inline", "constexpr", "extern", "volatile"].includes(nameOf(c)),
      );
      const typeNode = kids.find((c) => TYPE_NODE_NAMES.has(nameOf(c)) || nameOf(c) === "auto");
      const declarator = kids.find((c) => c.name === "FunctionDeclarator");
      const idNode = declarator ? childrenOf(declarator).find((c) => c.name === "Identifier") : null;
      const paramList = declarator ? childrenOf(declarator).find((c) => c.name === "ParameterList") : null;
      if (!typeNode || !idNode || !paramList) {
        ctx.error("函数定义格式无法解析", ctx.lineOf(node.from));
        continue;
      }
      const returnType = convertReturnType(ctx, ctx.text(typeNode).replace(/\s+/g, ""), ctx.lineOf(node.from));
      const params = convertParams(ctx, paramList);
      if (!returnType || !params) continue;
      const fname = ctx.text(idNode);
      if (ctx.signatures.has(fname) && ctx.signatures.get(fname)!.defined) {
        ctx.error(`函数 ${fname} 重复定义`, ctx.lineOf(node.from));
        continue;
      }
      ctx.signatures.set(fname, { returnType, params, defined: true, line: ctx.lineOf(node.from) });
    } else if (name === "Declaration") {
      tryRecordPrototype(ctx, node);
    }
  }

  // 3. Pass B：降级转换
  const globals: VarDeclStmt[] = [];
  const functions = new Map<string, FuncDecl>();
  let main: FuncDecl | null = null;

  for (const node of topLevel) {
    const name = nameOf(node);
    const line = ctx.lineOf(node.from);
    if (name === "PreprocDirective") {
      const text = ctx.text(node).trim();
      if (!text.startsWith("#include")) {
        ctx.error("不支持预处理指令（只允许 #include）", line);
      }
      continue;
    }
    if (name === "FunctionDefinition") {
      const fd = convertFunction(ctx, node);
      if (!fd) continue;
      if (fd.name === "main") {
        main = fd;
      } else {
        functions.set(fd.name, fd);
      }
      continue;
    }
    if (name === "Declaration") {
      const decls = convertDecl(ctx, node, true);
      if (decls) globals.push(...decls);
      continue;
    }
    if (name === "ExpressionStatement") {
      const recovered = tryCtorMisparse(ctx, node);
      if (recovered) {
        globals.push(recovered);
      } else {
        ctx.error("顶层只允许 #include、变量声明和函数定义", line);
      }
      continue;
    }
    if (name === "NamespaceDefinition") {
      ctx.error("不支持命名空间定义", line);
    } else if (name === "TemplateDeclaration") {
      ctx.error("不支持模板定义", line);
    } else if (name === "UsingDeclaration" || name === "UsingDirective") {
      ctx.error("不支持 using 声明", line);
    } else if (name !== "Comment") {
      ctx.error(`不支持的顶层语法（${name}）`, line);
    }
  }

  if (!main) {
    ctx.error("缺少 int main() 函数", 1);
  }

  // 4. 诊断去重 + 按行排序
  const seen = new Set<string>();
  const diagnostics = ctx.diagnostics
    .filter((d) => {
      const key = `${d.level}|${d.line ?? 0}|${d.message}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => (a.line ?? 0) - (b.line ?? 0) || a.level.localeCompare(b.level));

  if (ctx.hasErrors() || !main) {
    return { program: null, diagnostics };
  }

  const program: Program = {
    globals,
    functions,
    main,
    lines: code.split("\n").length,
  };
  return { program, diagnostics };
}
