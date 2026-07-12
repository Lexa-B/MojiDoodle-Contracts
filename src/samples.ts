/**
 * Collection-sample schema versions (v3 onward), shared by the MojiDoodle app, worker, and analytics.
 *
 * v3 extends v2 with study-condition fields. Stroke / canvas / segmenter /
 * recognition fields are still required but become "[]"/"0"/null for the
 * type and mc practice modes (which don't run the canvas pipeline).
 */

import { Point, EndingClassification, StrokeAnalysis } from './grading';

/**
 * A selection lasso for manual segmentation.
 * Users draw polygons around strokes belonging to one character.
 */
export interface SelectionLasso {
  /** Polygon points defining the lasso boundary */
  points: { x: number; y: number }[];
  /** Which strokes are enclosed by this lasso */
  strokeIndices: number[];
}

/**
 * Ground truth stroke-to-character assignment.
 * Either inferred from successful recognition or manually verified.
 */
export interface GroundTruthEntry {
  /** Which strokes belong to this character */
  strokeIndices: number[];
  /** Expected character (from answers) */
  character: string;
}

/** Character assignment from segmenter output. */
export interface CharacterAssignment {
  /** Reading-order index (0 = first character). */
  characterIndex: number;
  /** Which input strokes belong to this character. */
  strokeIndices: number[];
  /** Bounding box of this character's strokes. */
  bounds: { minX: number; maxX: number; minY: number; maxY: number; width: number; height: number };
}

/** Distractor-match info captured at grading time. */
export interface DistractorMatchInfo {
  matchedAnswer: string;
  toast: string;
}

/**
 * v3 training sample — extends v2 with study fields and a `practiceMode`
 * discriminator so multi-modal grading is captured under one schema.
 */
export interface CollectionSampleV3 {
  version: 3;

  // Raw input (empty arrays / zeros for type and mc modes)
  strokes: Point[][];
  canvasWidth: number;
  canvasHeight: number;

  // Segmentation output ([] for type/mc)
  characterAssignments: CharacterAssignment[];

  // Lasso data (null for type/mc)
  selectionLassos: SelectionLasso[] | null;

  // Card & recognition
  answers: string[];
  recognitionResults: { character: string; score: number }[][] | null;
  groundTruth: GroundTruthEntry[] | null;
  success: boolean;

  // Metadata
  id: string;
  userId: string;
  cardId: string;
  timestamp: number;

  // v3 study fields
  practiceMode: 'draw' | 'type' | 'mc';
  studyCondition: 'a' | 'b' | 'c' | null;
  participantId: string | null;
  itemCondition: 1 | 2 | 3;
  /** Typed string (type) / chosen option (mc) / null (draw). */
  userInput: string | null;
  /** Populated whenever the distractor-match loop fires in any mode. (V3 field name retained; V4 renames to distractorMatched.) */
  befuddlerMatched: DistractorMatchInfo | null;
}

/** Re-export the previous schema under its original name for callers that
 *  may still hold v2 typed references — the new code paths emit v3. */
export type CollectionSampleV2 = CollectionSampleV3;

/**
 * v4 training sample — extends v3 with the trajectory primitive snapshot,
 * renames `befuddlerMatched` → `distractorMatched`, and adds a top-level
 * `resultEvent` marker so analytics can query "what just happened in this
 * rep" without parsing the buffer.
 *
 * See docs/superpowers/specs/2026-06-21-trajectory-primitive-design.md.
 */
export interface CollectionSampleV4 extends Omit<CollectionSampleV3, 'version' | 'befuddlerMatched'> {
  version: 4;

  /** Renamed from V3's `befuddlerMatched`. */
  distractorMatched: DistractorMatchInfo | null;

  /** Post-grading counters (snapshot after this rep's increment). */
  successCount: number;
  failureCount: number;
  distractedCount: number;

  /** Post-grading buffer (newest-right, 0..20 chars from {S, F, D}). */
  recentResults: string;

  /** What just happened in this rep. Mirrors the marker appended to recentResults. */
  resultEvent: 'S' | 'F' | 'D';
}

/**
 * v5 training sample — extends v4 with a `mode` discriminator
 * (srs vs practice) and a `practiceCount` snapshot. Practice samples
 * still carry the full grading body (strokes, recognition, etc.).
 *
 * See docs/superpowers/specs/2026-06-21-glossary-redesign-design.md.
 */
export interface CollectionSampleV5 extends Omit<CollectionSampleV4, 'version'> {
  version: 5;

  /** Distinguishes SRS-relevant grading from practice-mode reps. */
  mode: 'srs' | 'practice';

  /** Snapshot of cards.practice_count at sample time. */
  practiceCount: number;
}

/**
 * v6 training sample — extends v5 with per-stroke ending classifications
 * (払い / はね / とめ). Parallel array to `strokes`; same length, same order.
 * Empty for non-draw modes (type/mc never produce strokes).
 *
 * See docs/superpowers/specs/2026-06-26-stroke-ending-classifier-design.md.
 */
export interface CollectionSampleV6 extends Omit<CollectionSampleV5, 'version'> {
  version: 6;

  /** Parallel to `strokes` — one entry per stroke. Empty when `strokes` is empty. */
  strokeEndings: EndingClassification[];
}

/**
 * v7 training sample — extends v6 with the Fugu stroke-order analysis
 * produced during backend grading. Null when the analysis failed, timed
 * out, or the stream was abandoned.
 *
 * See docs/superpowers/specs/2026-07-07-fugu-grading-analysis-design.md.
 */
export interface CollectionSampleV7 extends Omit<CollectionSampleV6, 'version'> {
  version: 7;
  /** Field name retained from V7 (declaration of history); type updated to StrokeAnalysis in 0.3.2. */
  fuguAnalysis: StrokeAnalysis | null;
}

/**
 * v8 training sample — renames the analysis field: `fuguAnalysis` → `stroke_analysis`
 * (either model's output; `.model` is the provenance). snake_case matches
 * the stroke_info family. No other change from V7.
 */
export interface CollectionSampleV8 extends Omit<CollectionSampleV7, 'version' | 'fuguAnalysis'> {
  version: 8;
  stroke_analysis: StrokeAnalysis | null;
}

/** Type alias for the current "latest" sample shape. */
export type CollectionSampleLatest = CollectionSampleV8;
