/**
 * Shared direction-trend of a directed 2D polyline (SVG y-down coordinates).
 * ONE implementation for both canonical KanjiVG strokes (sampled béziers,
 * build-time) and learner strokes (captured points, runtime) — see MOJ-35.
 *
 * Algorithm: resample to uniform arc length, take the dominant axis via
 * PCA (total least squares) over the resampled points, sign it by the
 * chord (start→end travel), quantize to 45° buckets. PCA keeps terminal
 * flicks/hooks (short arc length ⇒ few samples) from dragging the trend,
 * while the chord sign preserves direction of travel. Known limits: loops
 * and sharp multi-phase strokes flatten to one arrow until MOJ-29.
 */
export type DirectionTrend = '⭡' | '⭧' | '⭢' | '⭨' | '⭣' | '⭩' | '⭠' | '⭦';
export const DIRECTION_TRENDS: readonly DirectionTrend[] =
  ['⭡', '⭧', '⭢', '⭨', '⭣', '⭩', '⭠', '⭦'];

const N_RESAMPLE = 64;

function resample(points: { x: number; y: number }[]): { x: number; y: number }[] {
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

export function directionTrend(points: { x: number; y: number }[]): DirectionTrend {
  if (points.length < 2) throw new Error('directionTrend: need at least 2 points');
  const pts = resample(points);
  // PCA over resampled points
  const n = pts.length;
  const mx = pts.reduce((s,p)=>s+p.x,0)/n, my = pts.reduce((s,p)=>s+p.y,0)/n;
  let sxx = 0, sxy = 0, syy = 0;
  for (const p of pts) { const dx=p.x-mx, dy=p.y-my; sxx+=dx*dx; sxy+=dx*dy; syy+=dy*dy; }
  // dominant eigenvector of [[sxx,sxy],[sxy,syy]]
  const theta = 0.5 * Math.atan2(2*sxy, sxx - syy);
  let ax = Math.cos(theta), ay = Math.sin(theta);
  // sign by chord (direction of travel)
  const cx = points[points.length-1].x - points[0].x;
  const cy = points[points.length-1].y - points[0].y;
  if (ax*cx + ay*cy < 0) { ax = -ax; ay = -ay; }
  // y-down → flip for compass angle
  const ang = (Math.atan2(-ay, ax) * 180 / Math.PI + 360) % 360;
  const order: DirectionTrend[] = ['⭢','⭧','⭡','⭦','⭠','⭩','⭣','⭨']; // 0°,45°,…315°
  return order[Math.round(ang / 45) % 8];
}
