import { useCallback, useMemo, useState } from "react";
import { STEP_DEFS, type StepKey } from "./course";

const STORAGE_KEY = "professional-cpp-learning-console:v1";

interface SavedProgress {
  version: 2;
  completedDays: number[];
  steps: Record<string, StepKey[]>;
  weakPoints: string[];
}

function initialState(): SavedProgress {
  return {
    version: 2,
    completedDays: [],
    steps: {},
    weakPoints: [],
  };
}

function loadState(): SavedProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState();
    const parsed = JSON.parse(raw) as Partial<SavedProgress>;
    const steps = parsed.steps ?? {};
    // v1 prefilled every published repository day as "complete". Completion is
    // learning evidence, so migrate only days whose eight stages were recorded.
    const completedDays =
      parsed.version === 2
        ? (parsed.completedDays ?? [])
        : Object.entries(steps)
            .filter(([, completed]) =>
              STEP_DEFS.every((step) => completed.includes(step.key)),
            )
            .map(([day]) => Number(day))
            .filter((day) => Number.isFinite(day));
    return {
      version: 2,
      completedDays: Array.from(new Set(completedDays)).sort((a, b) => a - b),
      steps,
      weakPoints: parsed.weakPoints ?? [],
    };
  } catch {
    return initialState();
  }
}

export function useLearningProgress() {
  const [state, setState] = useState<SavedProgress>(() => loadState());

  const persist = useCallback((next: SavedProgress) => {
    setState(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Keep the current session usable when persistent storage is unavailable.
    }
  }, []);

  const markStep = useCallback(
    (day: number, step: StepKey) => {
      const current = new Set(state.steps[String(day)] ?? []);
      current.add(step);
      const steps = { ...state.steps, [String(day)]: [...current] };
      const completedDays = new Set(state.completedDays);
      if (STEP_DEFS.every((item) => current.has(item.key))) completedDays.add(day);
      persist({
        ...state,
        version: 2,
        steps,
        completedDays: [...completedDays].sort((a, b) => a - b),
      });
    },
    [persist, state],
  );

  const isDayComplete = useCallback(
    (day: number) => state.completedDays.includes(day),
    [state.completedDays],
  );

  const isStepComplete = useCallback(
    (day: number, step: StepKey) =>
      isDayComplete(day) || (state.steps[String(day)] ?? []).includes(step),
    [isDayComplete, state.steps],
  );

  const completedStepCount = useCallback(
    (day: number) => STEP_DEFS.filter((step) => isStepComplete(day, step.key)).length,
    [isStepComplete],
  );

  const addWeakPoint = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed || state.weakPoints.includes(trimmed)) return;
      persist({ ...state, weakPoints: [...state.weakPoints, trimmed] });
    },
    [persist, state],
  );

  const removeWeakPoint = useCallback(
    (value: string) => {
      persist({
        ...state,
        weakPoints: state.weakPoints.filter((item) => item !== value),
      });
    },
    [persist, state],
  );

  const value = useMemo(
    () => ({
      state,
      markStep,
      isDayComplete,
      isStepComplete,
      completedStepCount,
      addWeakPoint,
      removeWeakPoint,
    }),
    [
      addWeakPoint,
      completedStepCount,
      isDayComplete,
      isStepComplete,
      markStep,
      removeWeakPoint,
      state,
    ],
  );

  return value;
}
