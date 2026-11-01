import { nudge, roundToStep, tickCount, tickOf, valueAtTick } from '../ruler';

describe('ruler maths', () => {
  it('counts ticks without float drift', () => {
    expect(tickCount(30, 200, 0.1)).toBe(1700);
    expect(tickCount(66, 440, 0.2)).toBe(1870);
    expect(tickCount(36, 96, 1)).toBe(60);
  });

  it('maps ticks to clean values and back', () => {
    expect(valueAtTick(423, 30, 200, 0.1)).toBe(72.3);
    expect(tickOf(72.3, 30, 200, 0.1)).toBe(423);
    expect(valueAtTick(5, 66, 440, 0.2)).toBe(67);
    expect(roundToStep(0.1 + 0.2, 0.1)).toBe(0.3);
  });

  it('clamps to the ruler', () => {
    expect(valueAtTick(-4, 30, 200, 0.1)).toBe(30);
    expect(valueAtTick(99999, 30, 200, 0.1)).toBe(200);
    expect(tickOf(250, 30, 200, 0.1)).toBe(1700);
  });

  it('nudges by one step and keeps a typed value between ticks', () => {
    expect(nudge(72.3, 1, 30, 200, 0.1)).toBe(72.4);
    expect(nudge(72.45, 1, 30, 200, 0.1)).toBe(72.55);
    expect(nudge(30, -1, 30, 200, 0.1)).toBe(30);
    expect(nudge(170, 1, 100, 250, 1)).toBe(171);
  });
});
