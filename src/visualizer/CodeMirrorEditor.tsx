import { useEffect, useRef } from "react";
import {
  EditorView,
  lineNumbers,
  highlightActiveLineGutter,
  Decoration,
  type DecorationSet,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";
import { EditorState, StateField, StateEffect } from "@codemirror/state";
import { cpp } from "@codemirror/lang-cpp";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { keymap } from "@codemirror/view";

// 状态效果：设置当前正在执行的高亮代码行（1-based，0 表示不高亮）
const setActiveLineEffect = StateEffect.define<number>();

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
      paddingRight: "8px",
    },
    ".cm-lineNumbers .cm-gutterElement": {
      paddingLeft: "12px",
      minWidth: "36px",
    },
    ".cm-active-execution-line": {
      backgroundColor: "rgba(0, 89, 156, 0.35) !important",
      borderLeft: "3px solid #38bdf8",
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
  className = "",
}: {
  value: string;
  onChange?: (val: string) => void;
  activeLine?: number;
  readOnly?: boolean;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  // 初始化 CodeMirror
  useEffect(() => {
    if (!containerRef.current) return;

    const updateListener = EditorView.updateListener.of((update: ViewUpdate) => {
      if (update.docChanged && onChange) {
        onChange(update.state.doc.toString());
      }
    });

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        cpp(),
        visualizerTheme,
        activeLineField,
        updateListener,
        EditorState.readOnly.of(readOnly),
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

  // 高亮行与视口滚动同步
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    view.dispatch({
      effects: setActiveLineEffect.of(activeLine),
    });

    if (activeLine > 0 && activeLine <= view.state.doc.lines) {
      const line = view.state.doc.line(activeLine);
      view.dispatch({
        effects: EditorView.scrollIntoView(line.from, { y: "center" }),
      });
    }
  }, [activeLine]);

  return <div ref={containerRef} className={`cm-editor-host ${className}`} />;
}
