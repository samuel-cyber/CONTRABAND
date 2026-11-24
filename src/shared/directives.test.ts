import { describe, expect, it } from 'vitest';
import { getItem } from './catalog';
import {
  bagWeight,
  contrabandValue,
  isClean,
  itemValue,
  showsWeight,
  xraysFor,
} from './directives';

describe('directives', () => {
  it('Double Scan gives 2 X-rays, others 1', () => {
    expect(xraysFor('double-scan')).toBe(2);
    expect(xraysFor('weight-check')).toBe(1);
    expect(xraysFor('tech-crackdown')).toBe(1);
  });

  it('only Weight Check shows weight', () => {
    expect(showsWeight('weight-check')).toBe(true);
    expect(showsWeight('double-scan')).toBe(false);
  });

  it('Tech Crackdown doubles tech items only', () => {
    expect(itemValue(getItem('gpu'), 'tech-crackdown')).toBe(1600);
    expect(itemValue(getItem('gpu'), 'weight-check')).toBe(800);
    expect(itemValue(getItem('gold-watch'), 'tech-crackdown')).toBe(650);
  });

  it('sums contraband value, weight and cleanliness', () => {
    expect(
      contrabandValue(['gpu', 'gold-watch', 'laptop'], 'double-scan')
    ).toBe(1450);
    expect(
      contrabandValue(['gpu', 'gold-watch', 'laptop'], 'tech-crackdown')
    ).toBe(2250);
    expect(
      contrabandValue(['socks', 'laptop', 'toothbrush'], 'tech-crackdown')
    ).toBe(0);
    expect(bagWeight(['socks', 'toothbrush', 'rubber-duck'])).toBe(230);
    expect(isClean(['socks', 'laptop', 'toothbrush'])).toBe(true);
    expect(isClean(['socks', 'gpu', 'toothbrush'])).toBe(false);
  });
});
