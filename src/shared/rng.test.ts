import { describe, expect, it } from 'vitest';
import { createRng, hashString, mulberry32 } from './rng';

describe('rng', () => {
  it('produces the same sequence for the same seed', () => {
    const a = createRng('20261124:t5_abc');
    const b = createRng('20261124:t5_abc');
    const seqA = Array.from({ length: 50 }, () => a.next());
    const seqB = Array.from({ length: 50 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('produces different sequences for different seeds', () => {
    const a = createRng('20261124:t5_abc');
    const b = createRng('20261125:t5_abc');
    expect(a.next()).not.toEqual(b.next());
  });

  it('hashString is stable and unsigned 32-bit', () => {
    expect(hashString('contrabluff')).toBe(hashString('contrabluff'));
    const h = hashString('anything');
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThan(2 ** 32);
  });

  it('mulberry32 stays in [0, 1)', () => {
    const next = mulberry32(42);
    for (let i = 0; i < 1000; i++) {
      const v = next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('int is inclusive and in range', () => {
    const rng = createRng(7);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) seen.add(rng.int(1, 3));
    expect([...seen].sort()).toEqual([1, 2, 3]);
  });

  it('shuffle returns a permutation without mutating the input', () => {
    const input = [1, 2, 3, 4, 5, 6];
    const out = createRng('s').shuffle(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6]);
    expect([...out].sort()).toEqual(input);
    expect(createRng('s').shuffle(input)).toEqual(out);
  });

  it('pick throws on an empty list', () => {
    expect(() => createRng(1).pick([])).toThrow();
  });
});
