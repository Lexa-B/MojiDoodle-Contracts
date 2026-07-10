import { describe, it, expect } from 'vitest';
import { directionTrend, DIRECTION_TRENDS } from '../src/direction';

const line = (x0:number,y0:number,x1:number,y1:number,n=20) =>
  Array.from({length:n},(_,i)=>({x:x0+(x1-x0)*i/(n-1), y:y0+(y1-y0)*i/(n-1)}));

describe('directionTrend', () => {
  it('cardinal directions (SVG y-down: up = decreasing y)', () => {
    expect(directionTrend(line(0,0,100,0))).toBe('⭢');
    expect(directionTrend(line(0,100,0,0))).toBe('⭡');
    expect(directionTrend(line(0,0,0,100))).toBe('⭣');
    expect(directionTrend(line(100,0,0,0))).toBe('⭠');
  });
  it('diagonals', () => {
    expect(directionTrend(line(0,0,100,100))).toBe('⭨');   // right+down
    expect(directionTrend(line(100,0,0,100))).toBe('⭩');   // left+down
    expect(directionTrend(line(0,100,100,0))).toBe('⭧');
    expect(directionTrend(line(100,100,0,0))).toBe('⭦');
  });
  it('a terminal hook must not pollute the trunk (㇚: down then small up-left kick)', () => {
    const pts = [...line(50,10,50,90,40), ...line(50,90,42,84,6)];  // long ⭣ trunk + short hook
    expect(directionTrend(pts)).toBe('⭣');
  });
  it('a short curved sweep reads by its chord family, not its flat middle (愛 stroke-1 regression)', () => {
    // quarter-arc from (60,20) bowing left-down to (20,60): net ⭩
    const arc = Array.from({length:30},(_,i)=>{ const t=i/29*Math.PI/2;
      return { x: 60-40*Math.sin(t), y: 20+40*(1-Math.cos(t)) }; });
    expect(directionTrend(arc)).toBe('⭩');
  });
  it('real-data regression: 愛 stroke 1 (short curved ㇒ sweep) reads ⭩, not ⭠ (KanjiVG-sampled points)', () => {
    const pts = [
      {x:59.4,y:8.8},{x:59.3,y:9.1},{x:59.2,y:9.4},{x:59.0,y:9.7},{x:58.8,y:9.9},
      {x:58.6,y:10.2},{x:58.4,y:10.5},{x:58.2,y:10.7},{x:57.9,y:10.9},{x:56.4,y:11.9},
      {x:54.4,y:13.0},{x:51.9,y:14.1},{x:49.0,y:15.3},{x:45.8,y:16.5},{x:42.2,y:17.7},
      {x:38.5,y:18.8},{x:34.6,y:19.9},
    ];
    expect(directionTrend(pts)).toBe('⭩');
  });
  it('real-data regression: 愛 stroke 6 (㇖-family: long horizontal + terminal hook) reads ⭢ (KanjiVG-sampled points)', () => {
    const pts = [
      {x:18.4,y:39.7},{x:25.7,y:38.9},{x:33.9,y:37.9},{x:42.8,y:36.8},{x:52.0,y:35.7},
      {x:61.3,y:34.7},{x:70.5,y:33.8},{x:79.1,y:33.0},{x:87.0,y:32.6},{x:91.1,y:32.7},
      {x:93.3,y:33.5},{x:93.9,y:34.7},{x:93.3,y:36.1},{x:91.9,y:37.7},{x:90.0,y:39.3},
      {x:88.1,y:40.7},{x:86.4,y:41.8},
    ];
    expect(directionTrend(pts)).toBe('⭢');
  });
  it('throws on fewer than 2 distinct points', () => {
    expect(() => directionTrend([])).toThrow();
    expect(() => directionTrend([{x:1,y:1},{x:1,y:1}])).toThrow();
  });
  it('quantizes to the 8 published buckets', () => {
    expect(DIRECTION_TRENDS).toEqual(['⭡','⭧','⭢','⭨','⭣','⭩','⭠','⭦']);
    expect(DIRECTION_TRENDS).toContain(directionTrend(line(0,0,100,45)));
  });
});
