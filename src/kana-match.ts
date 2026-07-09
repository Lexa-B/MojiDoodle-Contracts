/**
 * Kana-aware character matching helpers shared by the MojiDoodle app and worker.
 * Extracted from workbook.page.ts so the draw, type, and multiple-choice input
 * components can share them.
 *
 * The Google Input Tools API and human input both tend to mix small/big kana,
 * chōon variants, and wave-dash variants. The match logic below treats those
 * as equivalent for grading purposes.
 */

/** Small kana → big kana mapping (covers both hiragana and katakana). */
export const SMALL_TO_BIG_KANA: Record<string, string> = {
  // Hiragana
  'っ': 'つ', 'ゃ': 'や', 'ゅ': 'ゆ', 'ょ': 'よ',
  'ぁ': 'あ', 'ぃ': 'い', 'ぅ': 'う', 'ぇ': 'え', 'ぉ': 'お',
  'ゎ': 'わ',
  // Katakana
  'ッ': 'ツ', 'ャ': 'ヤ', 'ュ': 'ユ', 'ョ': 'ヨ',
  'ァ': 'ア', 'ィ': 'イ', 'ゥ': 'ウ', 'ェ': 'エ', 'ォ': 'オ',
  'ヮ': 'ワ',
};

/** Chōon (長音) mark equivalents — vertical line variants. */
export const CHOON_EQUIVALENTS = new Set<string>([
  'ー',  // U+30FC Katakana-Hiragana Prolonged Sound Mark
  '|',  // U+007C Vertical Line (halfwidth)
  '｜', // U+FF5C Fullwidth Vertical Line
]);

/** Wave dash equivalents. */
export const WAVE_DASH_EQUIVALENTS = new Set<string>([
  '〜', // U+301C Wave Dash (Japanese)
  '~',  // U+007E Tilde (ASCII)
  '～', // U+FF5E Fullwidth Tilde
]);

/**
 * Check if two single-character strings match, treating small/big kana,
 * chōon-variants, and wave-dash variants as equivalent.
 */
export function kanaMatch(target: string, candidate: string): boolean {
  if (target === candidate) return true;

  if (CHOON_EQUIVALENTS.has(target) && CHOON_EQUIVALENTS.has(candidate)) {
    return true;
  }

  if (WAVE_DASH_EQUIVALENTS.has(target) && WAVE_DASH_EQUIVALENTS.has(candidate)) {
    return true;
  }

  const targetBig = SMALL_TO_BIG_KANA[target];
  if (targetBig && targetBig === candidate) return true;
  const candidateBig = SMALL_TO_BIG_KANA[candidate];
  if (candidateBig && candidateBig === target) return true;
  if (targetBig && candidateBig && targetBig === candidateBig) return true;

  return false;
}

/**
 * Check whether two answer strings match position-by-position under kanaMatch.
 * Whitespace is stripped before comparison. Lengths must match (post-strip).
 *
 * Used by type-input for keyboard-entered answers, where the user is expected
 * to produce the actual character sequence.
 */
export function kanaMatchAnswer(target: string, candidate: string): boolean {
  const t = target.replace(/\s+/g, '');
  const c = candidate.replace(/\s+/g, '');
  const tChars = [...t];
  const cChars = [...c];
  if (tChars.length !== cChars.length) return false;
  for (let i = 0; i < tChars.length; i++) {
    if (!kanaMatch(tChars[i], cChars[i])) return false;
  }
  return true;
}
