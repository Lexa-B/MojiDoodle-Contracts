/**
 * Shared stroke geometry: KanjiVG path sampling, character normalization,
 * and per-stroke summaries. One implementation for the worker's analysis
 * prompt, the calibration tooling, and (future) client-side comparison
 * grading — see MOJ-35's no-duplicate-geometry rule.
 */
import { directionTrend, resample, type DirectionTrend } from './direction';
import type { EndingType } from './grading';

export interface Point2D {
  x: number;
  y: number;
}

/** Wire mirror of the card YAML `stroke_info` block. */
export interface CardStrokeInfo {
  strokeCount: number;
  strokes: {
    stroke: string;
    endings: EndingType[];
    direction_trend: DirectionTrend;
    note: string;
  }[];
}

export interface StrokeSummary {
  start: Point2D;
  end: Point2D;
  /** Centroid of the uniform-arc-length resample — offset from the chord midpoint reveals bow direction. */
  com: Point2D;
  /** 8-way arrow, or '·' for a degenerate (point-like) stroke. */
  trend: DirectionTrend | '·';
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Normalize a character's strokes into the 0–100 square: uniform scale so the
 * longer bbox side spans 0–100, shorter axis centered, integer coordinates.
 * aspectRatio = bbox height / width (2 dp), clamped to [0.01, 99].
 */
export function normalizeCharacterStrokes(
  strokes: Point2D[][],
): { strokes: Point2D[][]; aspectRatio: number } {
  const pts = strokes.flat();
  if (pts.length === 0) return { strokes: [], aspectRatio: 1 };
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const w = maxX - minX;
  const h = maxY - minY;
  const longer = Math.max(w, h);
  if (longer === 0) {
    return {
      strokes: strokes.map(s => s.map(() => ({ x: 50, y: 50 }))),
      aspectRatio: 1,
    };
  }
  const scale = 100 / longer;
  const xPad = (100 - w * scale) / 2;
  const yPad = (100 - h * scale) / 2;
  const out = strokes.map(s =>
    s.map(p => ({
      x: Math.round((p.x - minX) * scale + xPad),
      y: Math.round((p.y - minY) * scale + yPad),
    })),
  );
  const aspectRatio =
    w === 0 ? 99 : Math.min(99, Math.max(0.01, round2(h / w)));
  return { strokes: out, aspectRatio };
}

export function strokeSummary(stroke: Point2D[]): StrokeSummary {
  if (stroke.length === 0) throw new Error('strokeSummary: empty stroke');
  const start = stroke[0];
  const end = stroke[stroke.length - 1];
  const degenerate = !stroke.some(p => p.x !== start.x || p.y !== start.y);
  if (degenerate) {
    return { start, end, com: { ...start }, trend: '·' };
  }
  const rs = resample(stroke);
  const com = {
    x: Math.round(rs.reduce((a, p) => a + p.x, 0) / rs.length),
    y: Math.round(rs.reduce((a, p) => a + p.y, 0) / rs.length),
  };
  return { start, end, com, trend: directionTrend(stroke) };
}

// --- KanjiVG path sampler --------------------------------------------------
// Ported from the MojiDoodle app's scripts/lib/kanjivg-sample.ts
// (samplePathD -> samplePathPoints), minus the fs/XML file-loading helpers,
// which stay out of contracts. Behaviorally identical: same command support
// (M/m, L/l implicit-lineto, C/c, S/s), same sampling math.

// Tokenizes SVG path `d` data into command letters and numbers. Handles
// KanjiVG's glued-negative-number style (e.g. "3-0.62" -> "3", "-0.62")
// by matching decimals before bare integers.
const TOKEN_RE = /[MmCcSs]|-?\d+\.\d+|-?\.\d+|-?\d+/g;

function tokenize(d: string): string[] {
  return d.match(TOKEN_RE) ?? [];
}

function sampleCubic(
  p0: Point2D, p1: Point2D, p2: Point2D, p3: Point2D, n: number,
): Point2D[] {
  const out: Point2D[] = [];
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const mt = 1 - t;
    const a = mt * mt * mt;
    const b = 3 * mt * mt * t;
    const c = 3 * mt * t * t;
    const e = t * t * t;
    out.push({
      x: a * p0.x + b * p1.x + c * p2.x + e * p3.x,
      y: a * p0.y + b * p1.y + c * p2.y + e * p3.y,
    });
  }
  return out;
}

/** Samples a single stroke's `d` attribute into an ordered point list. */
export function samplePathPoints(d: string, samplesPerSegment = 24): Point2D[] {
  const tokens = tokenize(d);
  const points: Point2D[] = [];
  let cur: Point2D = { x: 0, y: 0 };
  let prevCtrl2: Point2D | null = null;
  let cmd = '';
  let i = 0;

  const num = (idx: number) => parseFloat(tokens[idx]);

  while (i < tokens.length) {
    const tok = tokens[i];
    if (/^[A-Za-z]$/.test(tok)) {
      cmd = tok;
      i++;
      continue;
    }

    switch (cmd) {
      case 'M': {
        cur = { x: num(i), y: num(i + 1) };
        i += 2;
        points.push(cur);
        prevCtrl2 = null;
        cmd = 'L'; // any further coordinate pairs before the next letter are implicit lineto
        break;
      }
      case 'm': {
        cur = { x: cur.x + num(i), y: cur.y + num(i + 1) };
        i += 2;
        points.push(cur);
        prevCtrl2 = null;
        cmd = 'l';
        break;
      }
      case 'L': {
        cur = { x: num(i), y: num(i + 1) };
        i += 2;
        points.push(cur);
        prevCtrl2 = null;
        break;
      }
      case 'l': {
        cur = { x: cur.x + num(i), y: cur.y + num(i + 1) };
        i += 2;
        points.push(cur);
        prevCtrl2 = null;
        break;
      }
      case 'C': {
        const c1 = { x: num(i), y: num(i + 1) };
        const c2 = { x: num(i + 2), y: num(i + 3) };
        const end = { x: num(i + 4), y: num(i + 5) };
        i += 6;
        points.push(...sampleCubic(cur, c1, c2, end, samplesPerSegment));
        prevCtrl2 = c2;
        cur = end;
        break;
      }
      case 'c': {
        const c1 = { x: cur.x + num(i), y: cur.y + num(i + 1) };
        const c2 = { x: cur.x + num(i + 2), y: cur.y + num(i + 3) };
        const end = { x: cur.x + num(i + 4), y: cur.y + num(i + 5) };
        i += 6;
        points.push(...sampleCubic(cur, c1, c2, end, samplesPerSegment));
        prevCtrl2 = c2;
        cur = end;
        break;
      }
      case 'S': {
        const c1 = prevCtrl2 ? { x: 2 * cur.x - prevCtrl2.x, y: 2 * cur.y - prevCtrl2.y } : { ...cur };
        const c2 = { x: num(i), y: num(i + 1) };
        const end = { x: num(i + 2), y: num(i + 3) };
        i += 4;
        points.push(...sampleCubic(cur, c1, c2, end, samplesPerSegment));
        prevCtrl2 = c2;
        cur = end;
        break;
      }
      case 's': {
        const c1 = prevCtrl2 ? { x: 2 * cur.x - prevCtrl2.x, y: 2 * cur.y - prevCtrl2.y } : { ...cur };
        const c2 = { x: cur.x + num(i), y: cur.y + num(i + 1) };
        const end = { x: cur.x + num(i + 2), y: cur.y + num(i + 3) };
        i += 4;
        points.push(...sampleCubic(cur, c1, c2, end, samplesPerSegment));
        prevCtrl2 = c2;
        cur = end;
        break;
      }
      default:
        // Unrecognized command token (shouldn't occur in vendored KanjiVG
        // data — see kanjivg-sample.ts header in the app repo). Skip to
        // avoid an infinite loop rather than throwing on a single odd glyph.
        i++;
    }
  }

  return points;
}
