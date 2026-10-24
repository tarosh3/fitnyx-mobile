import { dropIndex, makeRoomShift, moveItem, slotOffset } from '../dragOrder';

// Three cards 100 tall with a 10 gap; the middle one is taller (an open exercise).
const tops = [0, 110, 330];
const heights = [100, 210, 100];

it('drops where the dragged centre has passed the other centres', () => {
  expect(dropIndex(0, 0, tops, heights)).toBe(0);
  expect(dropIndex(0, 160, tops, heights)).toBe(0); // centre 210, card 1's is 215
  expect(dropIndex(0, 170, tops, heights)).toBe(1); // centre 220
  expect(dropIndex(0, 400, tops, heights)).toBe(2);
  expect(dropIndex(2, -110, tops, heights)).toBe(2); // centre 270, card 1's is 215
  expect(dropIndex(2, -170, tops, heights)).toBe(1); // centre 210
  expect(dropIndex(2, -400, tops, heights)).toBe(0);
  expect(dropIndex(1, 2000, tops, heights)).toBe(2);
});

it('ignores items that have not been measured yet', () => {
  expect(dropIndex(0, 400, [0, undefined as unknown as number, 330], heights)).toBe(2);
});

it('lands the dragged item exactly in its slot', () => {
  // Card 0 to the end: its top becomes card 2's bottom minus its own height.
  expect(slotOffset(0, 2, tops, heights)).toBe(330);
  expect(slotOffset(2, 0, tops, heights)).toBe(-330);
  expect(slotOffset(1, 1, tops, heights)).toBe(0);
});

it('slides only the items between the start and the drop', () => {
  expect([0, 1, 2, 3].map((i) => makeRoomShift(i, 0, 2, 110))).toEqual([0, -110, -110, 0]);
  expect([0, 1, 2, 3].map((i) => makeRoomShift(i, 3, 1, 110))).toEqual([0, 110, 110, 0]);
});

it('moves an item to a new index', () => {
  expect(moveItem(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
  expect(moveItem(['a', 'b', 'c', 'd'], 3, 0)).toEqual(['d', 'a', 'b', 'c']);
  const same = ['a'];
  expect(moveItem(same, 0, 3)).toBe(same);
});
