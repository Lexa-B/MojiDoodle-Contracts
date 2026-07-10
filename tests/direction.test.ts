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
  it('throws on fewer than 2 distinct points', () => {
    expect(() => directionTrend([])).toThrow();
    expect(() => directionTrend([{x:1,y:1},{x:1,y:1}])).toThrow();
  });
  it('quantizes to the 8 published buckets', () => {
    expect(DIRECTION_TRENDS).toEqual(['⭡','⭧','⭢','⭨','⭣','⭩','⭠','⭦']);
    expect(DIRECTION_TRENDS).toContain(directionTrend(line(0,0,100,45)));
  });
});
