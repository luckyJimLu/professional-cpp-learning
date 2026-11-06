import { useCallback, useMemo, useState } from "react";
import { stepDefsForDay, type StepKey } from "./course";

const STORAGE_KEY = "professional-cpp-learning-console:v1";

interface SavedProgress {
  version: 3;
  completedDays: number[];
  steps: Record<string, StepKey[]>;
  weakPoints: string[];
}

function initialState(): SavedProgress {
  return {
    version: 3,
    completedDays: [],
    steps: {},
    weakPoints: [],
  };
}

function loadState(): SavedProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState();
    const parsed = JSON.parse(raw) as {
      version?: number;
      completedDays?: number[];
      steps?: Record<string, StepKey[]>;
      weakPoints?: string[];
    };
    const steps = parsed.steps ?? {};
    const isRecordedComplete = (day: number) =>
      stepDefsForDay(day).every((step) =>
        (steps[String(day)] ?? []).includes(step.key),
      );

    // v2 counted eight stages. Preserve legacy completion only when all stages
    // required by that lesson's format were recorded; ten-stage lessons must
    // have DESIGN and EMBEDDED evidence before remaining complete.
    const completedDays =
      parsed.version === 3
        ? (parsed.completedDays ?? [])
        : parsed.version === 2
          ? (parsed.completedDays ?? []).filter(isRecordedComplete)
          : Object.keys(steps)
              .map(Number)
              .filter((day) => Number.isFinite(day) && isRecordedComplete(day));
    return {
      version: 3,
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
      if (stepDefsForDay(day).every((item) => current.has(item.key))) completedDays.add(day);
      persist({
        ...state,
        version: 3,
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
    (day: number) => stepDefsForDay(day).filter((step) => isStepComplete(day, step.key)).length,
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
