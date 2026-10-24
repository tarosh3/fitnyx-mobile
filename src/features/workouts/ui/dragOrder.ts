// Pure maths for drag-to-reorder (worklets, so they run on the UI thread
// during a drag). `tops` / `heights` are each item's layout in the list's
// content, by index; `offset` is how far the dragged item has moved.

/** Index the dragged item would drop at: it passes an item once its centre crosses that item's centre. */
export function dropIndex(from: number, offset: number, tops: number[], heights: number[]): number {
  'worklet';
  const centre = tops[from] + offset + heights[from] / 2;
  let to = from;
  for (let j = from + 1; j < tops.length; j++) {
    if (tops[j] != null && tops[j] + heights[j] / 2 < centre) to = j;
  }
  for (let j = from - 1; j >= 0; j--) {
    if (tops[j] != null && tops[j] + heights[j] / 2 > centre) to = j;
  }
  return to;
}

/** Offset that puts the dragged item exactly in its drop slot. */
export function slotOffset(from: number, to: number, tops: number[], heights: number[]): number {
  'worklet';
  if (to > from) return tops[to] + heights[to] - heights[from] - tops[from];
  if (to < from) return tops[to] - tops[from];
  return 0;
}

/** How far a non-dragged item slides to make room: one dragged-item height plus the gap. */
export function makeRoomShift(index: number, from: number, to: number, room: number): number {
  'worklet';
  if (index > from && index <= to) return -room;
  if (index < from && index >= to) return room;
  return 0;
}

/** `list` with the item at `from` moved to `to`. */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = [...list];
  next.splice(to, 0, ...next.splice(from, 1));
  return next;
}
