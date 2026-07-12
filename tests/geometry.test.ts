import { describe, expect, it } from 'vitest';
import {
  normalizeCharacterStrokes, samplePathPoints, strokeSummary,
} from '../src/geometry';

// An L-shaped two-stroke "character": vertical bar + horizontal bar.
const SHAPE = [
  [{ x: 0, y: 0 }, { x: 0, y: 50 }, { x: 0, y: 100 }],
  [{ x: 0, y: 100 }, { x: 25, y: 100 }, { x: 50, y: 100 }],
];
const shifted = (dx: number, dy: number, k: number) =>
  SHAPE.map(s => s.map(p => ({ x: p.x * k + dx, y: p.y * k + dy })));

describe('normalizeCharacterStrokes', () => {
  it('is invariant to translation and scale', () => {
    const a = normalizeCharacterStrokes(shifted(0, 0, 1));
    const b = normalizeCharacterStrokes(shifted(300, 120, 3.5));
    const c = normalizeCharacterStrokes(shifted(-40, 999, 0.2));
    expect(b.strokes).toEqual(a.strokes);
    expect(c.strokes).toEqual(a.strokes);
    expect(a.aspectRatio).toBe(2); // bbox 50 wide × 100 tall
  });
  it('maps the longer side to 0..100 and centers the shorter axis', () => {
    const { strokes } = normalizeCharacterStrokes(shifted(0, 0, 1));
    const ys = strokes.flat().map(p => p.y);
    const xs = strokes.flat().map(p => p.x);
    expect(Math.min(...ys)).toBe(0);
    expect(Math.max(...ys)).toBe(100);
    expect(Math.min(...xs)).toBe(25); // 50-wide shape centered: 25..75
    expect(Math.max(...xs)).toBe(75);
  });
  it('coordinates are integers', () => {
    const { strokes } = normalizeCharacterStrokes(shifted(7, 3, 1.37));
    for (const p of strokes.flat()) {
      expect(Number.isInteger(p.x)).toBe(true);
      expect(Number.isInteger(p.y)).toBe(true);
    }
  });
  it('handles a degenerate single dot', () => {
    const { strokes, aspectRatio } = normalizeCharacterStrokes([[{ x: 42, y: 17 }]]);
    expect(strokes).toEqual([[{ x: 50, y: 50 }]]);
    expect(aspectRatio).toBe(1);
  });
  it('caps the ratio for a zero-width character', () => {
    const { aspectRatio } = normalizeCharacterStrokes([[{ x: 5, y: 0 }, { x: 5, y: 80 }]]);
    expect(aspectRatio).toBe(99);
  });
});

describe('strokeSummary', () => {
  it('reports endpoints, trend, and a bow-revealing center of mass', () => {
    // Quarter arc from (100,0) to (0,100), bowing away from the chord (via (71,71)).
    const arc = Array.from({ length: 33 }, (_, i) => {
      const th = (i / 32) * (Math.PI / 2);
      return { x: Math.round(Math.cos(th) * 100), y: Math.round(Math.sin(th) * 100) };
    });
    const s = strokeSummary(arc);
    expect(s.start).toEqual({ x: 100, y: 0 });
    expect(s.end).toEqual({ x: 0, y: 100 });
    expect(s.trend).toBe('⭩');
    // Chord midpoint is (50,50); the arc bulges toward (71,71), so CoM sits beyond it.
    expect(s.com.x).toBeGreaterThan(55);
    expect(s.com.y).toBeGreaterThan(55);
  });
  it('flags a degenerate stroke with the point trend', () => {
    const s = strokeSummary([{ x: 9, y: 9 }, { x: 9, y: 9 }]);
    expect(s.trend).toBe('·');
    expect(s.com).toEqual({ x: 9, y: 9 });
  });
  it('throws on an empty stroke', () => {
    expect(() => strokeSummary([])).toThrow();
  });
});

describe('samplePathPoints', () => {
  it('samples a cubic path from start to end', () => {
    const pts = samplePathPoints('M0,0C10,0 20,0 30,0');
    expect(pts[0]).toEqual({ x: 0, y: 0 });
    const last = pts[pts.length - 1];
    expect(last.x).toBeCloseTo(30, 5);
    expect(last.y).toBeCloseTo(0, 5);
    expect(pts.length).toBeGreaterThan(20);
  });
  it('supports m/c/s relative and smooth segments', () => {
    // Two-segment path using s (smooth): must stay finite and end near (40,20).
    const pts = samplePathPoints('M0,0c10,0 20,0 30,0s10,20 10,20');
    const last = pts[pts.length - 1];
    expect(last.x).toBeCloseTo(40, 5);
    expect(last.y).toBeCloseTo(20, 5);
    for (const p of pts) {
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.y)).toBe(true);
    }
  });
});
