/**
 * Shared direction-trend of a directed 2D polyline (SVG y-down coordinates).
 * ONE implementation for both canonical KanjiVG strokes (sampled béziers,
 * build-time) and learner strokes (captured points, runtime) — see MOJ-35.
 *
 * Algorithm ("reversal-trimmed chord"): resample to uniform arc length,
 * compute the full chord (last − first) as the stroke's overall travel
 * direction, then walk resampled segments backwards from the end trimming
 * any run of terminal segments whose tangent OPPOSES that travel (dot
 * product < 0) — this is hook/kick material (㇚'s kick, ㇖'s tail) that
 * would otherwise drag a naive endpoint-to-endpoint reading backwards.
 * Trimming stops at the first non-opposing segment and is capped at 30%
 * of total arc length so a strongly curved stroke can't be trimmed away
 * entirely. The final direction is the chord from the first point to the
 * (possibly trimmed) endpoint. Smooth arcs never oppose their own overall
 * chord, so they're read whole (e.g. 愛 stroke 1's quarter-arc → ⭩); only
 * genuine terminal reversals get trimmed. Result is signed, y-down-flipped,
 * and quantized to 45° buckets. Known limits: loops and sharp multi-phase
 * strokes flatten to one arrow until MOJ-29.
 */
export type DirectionTrend = '⭡' | '⭧' | '⭢' | '⭨' | '⭣' | '⭩' | '⭠' | '⭦';
export const DIRECTION_TRENDS: readonly DirectionTrend[] =
  ['⭡', '⭧', '⭢', '⭨', '⭣', '⭩', '⭠', '⭦'];

const N_RESAMPLE = 64;

export function resample(points: { x: number; y: number }[]): { x: number; y: number }[] {
  const segs: number[] = [];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const d = Math.hypot(points[i].x - points[i-1].x, points[i].y - points[i-1].y);
    segs.push(d); total += d;
  }
  if (total === 0) throw new Error('directionTrend: degenerate stroke (no extent)');
  const out = [points[0]];
  let acc = 0, seg = 0;
  for (let k = 1; k < N_RESAMPLE - 1; k++) {
    const want = k * (total / (N_RESAMPLE - 1));
    while (seg < segs.length && acc + segs[seg] < want) { acc += segs[seg]; seg++; }
    const remain = want - acc;
    const t = segs[seg] === 0 ? 0 : remain / segs[seg];
    out.push({
      x: points[seg].x + (points[seg+1].x - points[seg].x) * t,
      y: points[seg].y + (points[seg+1].y - points[seg].y) * t,
    });
  }
  out.push(points[points.length - 1]);
  return out;
}

// Cap on how much terminal arc length can be trimmed as hook/kick material,
// as a fraction of total stroke length. Keeps a strongly curved stroke (e.g.
// a tight hook whose whole tail opposes the chord) from being trimmed away
// to nothing; tuned against 愛 stroke 6 (long ㇖ trunk + short terminal hook)
// where the hook is a small fraction of total length and must trim fully,
// while still bounding worst-case trim on shorter strokes.
const MAX_TRIM_FRACTION = 0.3;

export function directionTrend(points: { x: number; y: number }[]): DirectionTrend {
  if (points.length < 2) throw new Error('directionTrend: need at least 2 points');
  const pts = resample(points);
  const n = pts.length;

  // Overall travel direction: the full chord, first → last resampled point.
  const cx = pts[n - 1].x - pts[0].x;
  const cy = pts[n - 1].y - pts[0].y;

  // Per-segment lengths (needed to cap total trim by arc length, not by
  // segment count, since resample() is uniform in arc length anyway — but
  // this keeps the cap correct even if that invariant ever changes).
  const segLens: number[] = [];
  let totalLen = 0;
  for (let i = 1; i < n; i++) {
    const d = Math.hypot(pts[i].x - pts[i-1].x, pts[i].y - pts[i-1].y);
    segLens.push(d);
    totalLen += d;
  }

  // Walk segments backwards from the end. While a segment's tangent
  // OPPOSES overall travel (dot(tangent, chord) < 0), it's terminal-hook
  // material: mark it for trim. Stop at the first non-opposing segment.
  // Cap total trimmed length at MAX_TRIM_FRACTION of the stroke.
  const maxTrim = totalLen * MAX_TRIM_FRACTION;
  let trimmed = 0;
  let endIdx = n - 1; // index into pts of the (possibly trimmed) endpoint
  for (let i = segLens.length - 1; i >= 0; i--) {
    const tx = pts[i+1].x - pts[i].x;
    const ty = pts[i+1].y - pts[i].y;
    const opposes = (tx*cx + ty*cy) < 0;
    if (!opposes) break;
    if (trimmed + segLens[i] > maxTrim) break;
    trimmed += segLens[i];
    endIdx = i;
  }

  const first = pts[0];
  const end = pts[endIdx];
  let ax = end.x - first.x;
  let ay = end.y - first.y;
  if (ax === 0 && ay === 0) { ax = cx; ay = cy; } // degenerate trim fallback: use full chord

  // y-down → flip for compass angle
  const ang = (Math.atan2(-ay, ax) * 180 / Math.PI + 360) % 360;
  const order: DirectionTrend[] = ['⭢','⭧','⭡','⭦','⭠','⭩','⭣','⭨']; // 0°,45°,…315°
  return order[Math.round(ang / 45) % 8];
}
