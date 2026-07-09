import { describe, it, expect } from 'vitest';
import {
  kanaMatch,
  kanaMatchAnswer,
  SMALL_TO_BIG_KANA,
  CHOON_EQUIVALENTS,
  WAVE_DASH_EQUIVALENTS,
} from '../src/kana-match';

describe('kanaMatch', () => {
  it('matches identical characters', () => {
    expect(kanaMatch('あ', 'あ')).toBe(true);
    expect(kanaMatch('一', '一')).toBe(true);
  });
  it('rejects mismatched characters', () => {
    expect(kanaMatch('あ', 'い')).toBe(false);
    expect(kanaMatch('ア', 'い')).toBe(false);
  });
  it('treats small/big kana as equivalent (both directions, both scripts)', () => {
    expect(kanaMatch('っ', 'つ')).toBe(true);
    expect(kanaMatch('つ', 'っ')).toBe(true);
    expect(kanaMatch('ャ', 'ヤ')).toBe(true);
    expect(kanaMatch('ヨ', 'ョ')).toBe(true);
  });
  it('treats chōon variants as equivalent', () => {
    expect(kanaMatch('ー', '|')).toBe(true);
    expect(kanaMatch('ー', '｜')).toBe(true);
  });
  it('treats wave-dash variants as equivalent', () => {
    expect(kanaMatch('〜', '~')).toBe(true);
    expect(kanaMatch('～', '〜')).toBe(true);
  });
  it('keeps the table membership stable', () => {
    expect(SMALL_TO_BIG_KANA['っ']).toBe('つ');
    expect(CHOON_EQUIVALENTS.has('ー')).toBe(true);
    expect(WAVE_DASH_EQUIVALENTS.has('〜')).toBe(true);
  });
});

describe('kanaMatchAnswer', () => {
  it('matches exact answers', () => {
    expect(kanaMatchAnswer('あい', 'あい')).toBe(true);
  });
  it('strips whitespace before comparison', () => {
    expect(kanaMatchAnswer('き つ ね', 'きつね')).toBe(true);
    expect(kanaMatchAnswer('きっね', 'きつね')).toBe(true);
  });
  it('rejects length-mismatched inputs', () => {
    expect(kanaMatchAnswer('あい', 'あいう')).toBe(false);
    expect(kanaMatchAnswer('あいう', 'あい')).toBe(false);
  });
  it('rejects plain wrongs', () => {
    expect(kanaMatchAnswer('あい', 'あえ')).toBe(false);
  });
  it('honors kana equivalence position-by-position', () => {
    expect(kanaMatchAnswer('つき', 'っき')).toBe(true);
  });
});
