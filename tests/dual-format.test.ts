/**
 * Regression guard for the segmenter's ESM-only mistake: this package must be
 * consumable from BOTH module systems. Reads the built dist/ output, so the
 * build must run before tests (CI and prepublishOnly both order it that way).
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

describe('dual-format output', () => {
  it('is requireable as CommonJS', () => {
    const cjs = require('../dist/index.cjs');
    expect(cjs.kanaMatch('っ', 'つ')).toBe(true);
    expect(cjs.ANALYSIS_VERDICTS).toContain('wrong_order');
  });

  it('is importable as ESM', async () => {
    const esm = await import('../dist/index.js');
    expect(esm.kanaMatch('ー', '｜')).toBe(true);
    expect(esm.ANALYSIS_VERDICTS).toHaveLength(4);
  });

  it('declares all three export conditions', () => {
    const pkg = require('../package.json');
    expect(pkg.exports['.'].import.types).toBe('./dist/index.d.ts');
    expect(pkg.exports['.'].import.default).toBe('./dist/index.js');
    expect(pkg.exports['.'].require.types).toBe('./dist/index.d.cts');
    expect(pkg.exports['.'].require.default).toBe('./dist/index.cjs');
  });

  it('exports the dual-model additions (0.2.0)', () => {
    const cjs = require('../dist/index.cjs');
    expect(cjs.NAMAZU_MODEL_PREFIX).toBe('sakana/namazu');
  });

  it('exports the 漢字 ending tokens and directionTrend (0.3.0)', () => {
    const cjs = require('../dist/index.cjs');
    expect(cjs.ENDING_TYPES).toEqual(['止め', '払い', 'はね']);
    expect(typeof cjs.directionTrend).toBe('function');
  });

  it('exports the renamed analysis family + V8 (0.3.2)', () => {
    const cjs = require('../dist/index.cjs');
    expect(cjs.ANALYSIS_VERDICTS).toEqual(['correct', 'wrong_order', 'wrong_direction', 'uncertain']);
    expect(cjs.FUGU_VERDICTS).toBeUndefined();       // clean rename, no alias
    expect(cjs.NAMAZU_MODEL_PREFIX).toBe('sakana/namazu');
  });

  it('GradeRequest accepts the 0.3.4 fixedGrid field', () => {
    const req: import('../src/grading').GradeRequest = {
      strokes: [[{ x: 1, y: 2, t: 0 }]],
      lassos: [],
      strokeEndings: [],
      canvasWidth: 300,
      canvasHeight: 150,
      cardId: 'c1',
      answers: ['かな'],
      distractors: [],
      canonicalStrokes: null,
      expectedStrokeCount: null,
      appLang: 'en',
      analysisSpeed: 'fast',
      fixedGrid: { squareSide: 150, strokeSlots: [0] },
    };
    expect(req.fixedGrid?.strokeSlots).toEqual([0]);
  });
});
