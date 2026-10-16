import { useEffect, useRef } from "react";
import {
  EditorView,
  lineNumbers,
  highlightActiveLineGutter,
  Decoration,
  type DecorationSet,
  gutter,
  GutterMarker,
  type ViewUpdate,
} from "@codemirror/view";
import { Compartment, EditorState, RangeSet, StateField, StateEffect } from "@codemirror/state";
import { cpp } from "@codemirror/lang-cpp";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { keymap } from "@codemirror/view";

// 状态效果：设置当前正在执行的高亮代码行（1-based，0 表示不高亮）
const setActiveLineEffect = StateEffect.define<number>();

// VS Code 风格调试行号槽指示器（红点 + 黄色步进箭头）
class DebugExecutionMarker extends GutterMarker {
  toDOM() {
    const marker = document.createElement("span");
    marker.className = "cm-debug-gutter-marker";
    marker.setAttribute("aria-hidden", "true");
    marker.textContent = "●";
    return marker;
  }
}

const debugMarkerInstance = new DebugExecutionMarker();

// 行装饰器高亮当前执行行
const activeLineField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    decorations = decorations.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(setActiveLineEffect)) {
        const lineNum = e.value;
        if (lineNum <= 0 || lineNum > tr.state.doc.lines) {
          return Decoration.none;
        }
        const line = tr.state.doc.line(lineNum);
        return Decoration.set([
          Decoration.line({
            class: "cm-active-execution-line",
          }).range(line.from),
        ]);
      }
    }
    return decorations;
  },
  provide: (f) => EditorView.decorations.from(f),
});

// 调试状态行号槽（Gutter）
const debugGutterField = StateField.define< number >({
  create() {
    return 0;
  },
  update(lineNum, tr) {
    for (const e of tr.effects) {
      if (e.is(setActiveLineEffect)) {
        return e.value;
      }
    }
    return lineNum;
  },
});

const debugGutterExtension = [
  debugGutterField,
  gutter({
    class: "cm-debug-gutter",
    markers: (view) => {
      const lineNum = view.state.field(debugGutterField, false) ?? 0;
      if (lineNum <= 0 || lineNum > view.state.doc.lines) {
        return RangeSet.empty;
      }
      const line = view.state.doc.line(lineNum);
      return RangeSet.of([debugMarkerInstance.range(line.from)]);
    },
  }),
];

// 暗色主题样式配置，贴合工程整体的 "Code Surface" (#10151c)
const visualizerTheme = EditorView.theme(
  {
    "&": {
      color: "var(--code-ink, #dbe7f3)",
      backgroundColor: "var(--code, #10151c)",
      fontFamily: "var(--mono, monospace)",
      fontSize: "13.5px",
      height: "100%",
    },
    ".cm-content": {
      caretColor: "#4dabf7",
      padding: "12px 0",
      lineHeight: "1.65",
    },
    ".cm-gutters": {
      backgroundColor: "#0b0f14",
      color: "#54667a",
      borderRight: "1px solid #1c2430",
      paddingRight: "6px",
    },
    ".cm-debug-gutter": {
      width: "18px",
      paddingLeft: "4px",
    },
    ".cm-debug-gutter-marker": {
      color: "#ef4444",
      fontSize: "11px",
      lineHeight: "1",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      textShadow: "0 0 6px rgba(239, 68, 68, 0.65)",
    },
    ".cm-lineNumbers .cm-gutterElement": {
      paddingLeft: "6px",
      minWidth: "32px",
    },
    ".cm-active-execution-line": {
      backgroundColor: "rgba(56, 189, 248, 0.18) !important",
      borderLeft: "3px solid #fbbf24",
      boxShadow: "inset 0 0 0 1px rgba(251, 191, 36, 0.22)",
      position: "relative",
    },
    "&.cm-focused .cm-cursor": {
      borderLeftColor: "#38bdf8",
    },
  },
  { dark: true },
);

export function CodeMirrorEditor({
  value,
  onChange,
  activeLine = 0,
  readOnly = false,
  wrapLines = false,
  className = "",
}: {
  value: string;
  onChange?: (val: string) => void;
  activeLine?: number;
  readOnly?: boolean;
  wrapLines?: boolean;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const readOnlyCompartment = useRef(new Compartment());
  const wrapCompartment = useRef(new Compartment());

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // 初始化 CodeMirror
  useEffect(() => {
    if (!containerRef.current) return;

    const updateListener = EditorView.updateListener.of((update: ViewUpdate) => {
      if (update.docChanged && onChangeRef.current) {
        onChangeRef.current(update.state.doc.toString());
      }
    });

    const state = EditorState.create({
      doc: value,
      extensions: [
        debugGutterExtension,
        lineNumbers(),
        highlightActiveLineGutter(),
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        cpp(),
        visualizerTheme,
        activeLineField,
        updateListener,
        readOnlyCompartment.current.of(EditorState.readOnly.of(readOnly)),
        wrapCompartment.current.of(wrapLines ? EditorView.lineWrapping : []),
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []); // 仅在挂载时初始化

  // 动态同步 readOnly 状态
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: readOnlyCompartment.current.reconfigure(EditorState.readOnly.of(readOnly)),
    });
  }, [readOnly]);

  // 动态同步 wrapLines 状态
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: wrapCompartment.current.reconfigure(wrapLines ? EditorView.lineWrapping : []),
    });
  }, [wrapLines]);

  // 外部文本同步
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const currentDoc = view.state.doc.toString();
    if (value !== currentDoc) {
      view.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: value },
      });
    }
  }, [value]);

  // 高亮行与仅限编辑器容器内部的平滑视口滚动同步（绝不滚动外部页面或顶部工具栏）
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    view.dispatch({
      effects: setActiveLineEffect.of(activeLine),
    });

    if (activeLine > 0 && activeLine <= view.state.doc.lines) {
      const line = view.state.doc.line(activeLine);
      requestAnimationFrame(() => {
        if (!viewRef.current) return;
        const scroller = view.scrollDOM;
        const block = view.lineBlockAt(line.from);
        const viewportHeight = scroller.clientHeight;
        if (viewportHeight > 0) {
          const targetScrollTop = Math.max(0, block.top - viewportHeight / 2 + block.height / 2);
          scroller.scrollTo({
            top: targetScrollTop,
            behavior: "smooth",
          });
        }
      });
    }
  }, [activeLine]);

  return <div ref={containerRef} className={`cm-editor-host ${className}`} />;
}

