/**
 * The backend-grading wire protocol: what the app sends to the worker's
 * POST /grade endpoint and what comes back over its SSE stream, plus the
 * stroke-ending classification types that ride along.
 */

/** A captured pen point. t is milliseconds relative to drawing start. */
export interface Point {
  x: number;
  y: number;
  t: number;
}

/**
 * 漢字 forms exactly ('止め', '払い', 'はね' — はね stays kana). Breaking
 * change from the pre-0.3.0 romaji tokens ('tome' | 'harai' | 'hane'):
 * GCS samples captured before 0.3.0 carry the romaji strings, so any code
 * reading historical samples must translate them.
 */
export type EndingType = '止め' | '払い' | 'はね';

export const ENDING_TYPES: readonly EndingType[] = ['止め', '払い', 'はね'];

export interface EndingFeatures {
  /** px/ms over the tip window. */
  endVelocity: number;
  /** Mean body velocity ÷ endVelocity (>1 means decelerating). */
  decelerationRatio: number;
  /** Max angle change found anywhere in the late portion, in degrees. */
  lateCornerAngleDeg: number;
  /** Mean px/ms from the corner index to the end. NaN if no corner found. */
  velocityAfterCorner: number;
  /** Informational. NOT used as a decision gate (a 書道 practitioner may pause arbitrarily at the corner). */
  cornerToEndDurationMs: number;
  /** How much of the tip window we actually measured (ms). */
  tailWindowMs: number;
}

export interface EndingClassification {
  type: EndingType;
  /** 0..1 — how confident the classifier is in this decision. */
  confidence: number;
  features: EndingFeatures;
  /**
   * Index in `points[]` where the ending region begins. Used by the overlay to size its circle.
   * For はね this is the flick onset (first post-corner point with segment velocity ≥ MIN_FLICK_SEG_V),
   * not the raw geometric corner peak — the refinement skips any pause-zone dwell so the
   * region encompasses the visible flick rather than the practitioner's hand-pause.
   */
  endingRegionStartIndex: number;
}

/** Which analysis model tier the user selected. 'fast' = Namazu (thinking
 *  disabled), 'thorough' = Fugu. The worker may fall back from fast to
 *  thorough; the analysis-done payload's `model` reports what actually ran. */
export type AnalysisSpeed = 'fast' | 'thorough';

/** Prefix of Namazu wire model names (internal AND future production variants).
 *  Clients detect fast→thorough fallback by testing analysis.model against this. */
export const NAMAZU_MODEL_PREFIX = 'sakana/namazu';

export interface GradeRequest {
  strokes: Point[][];
  lassos: { points: { x: number; y: number }[] }[];
  strokeEndings: EndingClassification[];
  canvasWidth: number;
  canvasHeight: number;
  cardId: string;
  answers: string[];
  distractors: { answers: string[]; toast: string }[];
  canonicalStrokes: string[] | null;
  expectedStrokeCount: number | null;
  appLang: 'en' | 'ja';
  analysisSpeed: AnalysisSpeed;
}

export interface GradePayload {
  isCorrect: boolean;
  matchedAnswer: string;
  distractorMatched: { matchedAnswer: string; toast: string } | null;
  recognitionResults: { character: string; score: number }[][] | null;
  topMatches: { character: string; score: number }[];
  /**
   * The segmenter's SegmentResult, serialized as-is. Opaque at the contract
   * level: not every consumer installs mojidoodle-algo-segmenter (analytics
   * doesn't), so consumers that need the shape narrow it themselves.
   */
  segmentResult: unknown;
}

export const ANALYSIS_VERDICTS = ['correct', 'wrong_order', 'wrong_direction', 'uncertain'] as const;

export type AnalysisVerdict = (typeof ANALYSIS_VERDICTS)[number];

export interface StrokeAnalysis {
  model: string;
  text: string;
  verdict: AnalysisVerdict;
  latencyMs: number;
}

export interface GradingError {
  phase: 'grade' | 'analysis';
  message: string;
}
