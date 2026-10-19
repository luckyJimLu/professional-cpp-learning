import type { KeyboardEvent } from "react";

/** Keyboard behavior shared by the memory and RTOS detail tab lists. */
export function moveTabFocus(event: KeyboardEvent<HTMLButtonElement>) {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  const list = event.currentTarget.closest('[role="tablist"]');
  if (!list) return;
  const buttons = [
    ...list.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
  ].filter((button) => !button.disabled);
  if (!buttons.length) return;
  event.preventDefault();
  const index = buttons.indexOf(event.currentTarget);
  const next =
    event.key === "Home"
      ? 0
      : event.key === "End"
        ? buttons.length - 1
        : (index + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) %
          buttons.length;
  buttons[next].focus();
  buttons[next].click();
}
