import { describe, it, expect } from 'vitest';
import { kanaMatch, kanaMatchAnswer } from '../src/kana-match';

describe('kanaMatch', () => {
  it('matches identical characters', () => {
    expect(kanaMatch('あ', 'あ')).toBe(true);
    expect(kanaMatch('あ', 'い')).toBe(false);
  });
  it('treats small/big kana as equivalent (both directions, both scripts)', () => {
    expect(kanaMatch('っ', 'つ')).toBe(true);
    expect(kanaMatch('つ', 'っ')).toBe(true);
    expect(kanaMatch('ャ', 'ヤ')).toBe(true);
  });
  it('treats chōon variants as equivalent', () => {
    expect(kanaMatch('ー', '|')).toBe(true);
    expect(kanaMatch('ー', '｜')).toBe(true);
  });
  it('treats wave-dash variants as equivalent', () => {
    expect(kanaMatch('〜', '~')).toBe(true);
    expect(kanaMatch('〜', '～')).toBe(true);
  });
});

describe('kanaMatchAnswer', () => {
  it('matches position-by-position with whitespace stripped', () => {
    expect(kanaMatchAnswer('き つ ね', 'きつね')).toBe(true);
    expect(kanaMatchAnswer('きっね', 'きつね')).toBe(true);
    expect(kanaMatchAnswer('きつ', 'きつね')).toBe(false);
  });
});
