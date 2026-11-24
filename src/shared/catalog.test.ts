import { describe, expect, it } from 'vitest';
import { CONTRABAND_VALUE_RANGE, LEGAL_VALUE_RANGE } from './balance';
import { CONTRABAND_ITEMS, ITEMS, LABELS, LEGAL_ITEMS, NPCS } from './catalog';

const unique = (xs: readonly string[]) => new Set(xs).size === xs.length;

describe('catalog', () => {
  it('has 15 legal and 15 contraband items with unique ids', () => {
    expect(LEGAL_ITEMS).toHaveLength(15);
    expect(CONTRABAND_ITEMS).toHaveLength(15);
    expect(unique(ITEMS.map((i) => i.id))).toBe(true);
  });

  it('keeps values inside the balance ranges', () => {
    for (const i of LEGAL_ITEMS) {
      expect(i.value).toBeGreaterThanOrEqual(LEGAL_VALUE_RANGE.min);
      expect(i.value).toBeLessThanOrEqual(LEGAL_VALUE_RANGE.max);
    }
    for (const i of CONTRABAND_ITEMS) {
      expect(i.value).toBeGreaterThanOrEqual(CONTRABAND_VALUE_RANGE.min);
      expect(i.value).toBeLessThanOrEqual(CONTRABAND_VALUE_RANGE.max);
    }
  });

  it('tags exactly the five tech items', () => {
    const tech = ITEMS.filter((i) => i.tags.includes('tech')).map((i) => i.id);
    expect(tech.sort()).toEqual(
      ['gpu', 'headphones', 'laptop', 'phone-charger', 'prototype-phone'].sort()
    );
  });

  it('has 24 unique labels of at most 8 words', () => {
    expect(LABELS).toHaveLength(24);
    expect(unique(LABELS.map((l) => l.id))).toBe(true);
    for (const l of LABELS)
      expect(l.text.split(/\s+/).length).toBeLessThanOrEqual(8);
  });

  it('has 12 unique NPCs with honesty in [0, 1]', () => {
    expect(NPCS).toHaveLength(12);
    expect(unique(NPCS.map((n) => n.id))).toBe(true);
    for (const n of NPCS) {
      expect(n.honesty).toBeGreaterThanOrEqual(0);
      expect(n.honesty).toBeLessThanOrEqual(1);
      expect(n.title.length).toBeGreaterThan(0);
    }
  });
});
