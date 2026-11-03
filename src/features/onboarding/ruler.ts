/**
 * Maths for the onboarding ruler picker (height / weight). The ruler is a row
 * of ticks `step` apart from `min` to `max`; tick `i` is the value
 * `min + i * step`. Values are rounded to the step's decimals so 0.1 steps
 * never drift into 72.30000000000001.
 */

function decimalsOf(step: number): number {
  const text = String(step);
  const dot = text.indexOf('.');
  return dot === -1 ? 0 : text.length - dot - 1;
}

export function roundToStep(value: number, step: number): number {
  const factor = 10 ** decimalsOf(step);
  return Math.round(value * factor) / factor;
}

/** Number of gaps between ticks (the last tick's index). */
export function tickCount(min: number, max: number, step: number): number {
  return Math.round((max - min) / step);
}

export function valueAtTick(index: number, min: number, max: number, step: number): number {
  const i = Math.max(0, Math.min(tickCount(min, max, step), Math.round(index)));
  return roundToStep(min + i * step, step);
}

/** The tick nearest to `value`, clamped to the ruler. */
export function tickOf(value: number, min: number, max: number, step: number): number {
  return Math.max(0, Math.min(tickCount(min, max, step), Math.round((value - min) / step)));
}

/**
 * `value` moved by `ticks` steps and kept on the ruler. A typed value between
 * ticks keeps its offset (72.45 + 0.1 → 72.55); 2 decimals is the finest any
 * stored value has.
 */
export function nudge(value: number, ticks: number, min: number, max: number, step: number): number {
  const moved = Math.round((value + ticks * step) * 100) / 100;
  return Math.max(min, Math.min(max, moved));
}
