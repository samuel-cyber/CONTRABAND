import { describe, expect, it } from 'vitest';
import { BAG_SIZE, HAND_SIZE } from './balance';
import { getItem } from './catalog';
import { generateDay, validatePack } from './daily';
import { addDays } from './day';
import { isDirectiveId } from './directives';

const days = Array.from({ length: 365 }, (_, i) => addDays('20260101', i));

describe('generateDay', () => {
  it('is deterministic for the same day and subreddit', () => {
    expect(generateDay('20261124', 't5_abc')).toEqual(
      generateDay('20261124', 't5_abc')
    );
  });

  it('varies across days and subreddits', () => {
    const hands = new Set(
      days.map((d) => generateDay(d, 't5_abc').hand.join())
    );
    expect(hands.size).toBeGreaterThan(300);
    expect(generateDay('20261124', 't5_abc')).not.toEqual(
      generateDay('20261124', 't5_xyz')
    );
  });

  it('always deals 5 unique items with ≥2 legal and ≥2 contraband', () => {
    for (const d of days) {
      const { hand } = generateDay(d, 't5_abc');
      expect(hand).toHaveLength(HAND_SIZE);
      expect(new Set(hand).size).toBe(HAND_SIZE);
      const contraband = hand.filter((id) => getItem(id).contraband).length;
      expect(contraband).toBeGreaterThanOrEqual(2);
      expect(HAND_SIZE - contraband).toBeGreaterThanOrEqual(2);
    }
  });

  it('always lets a player pack a clean bag', () => {
    for (const d of days) {
      const legal = generateDay(d, 't5_abc').hand.filter(
        (id) => !getItem(id).contraband
      );
      expect(legal.length).toBeGreaterThanOrEqual(BAG_SIZE);
    }
  });

  it('picks a valid directive and uses all three over a year', () => {
    const ids = days.map((d) => generateDay(d, 't5_abc').directiveId);
    expect(ids.every(isDirectiveId)).toBe(true);
    expect(new Set(ids).size).toBe(3);
  });
});

describe('validatePack', () => {
  const { hand } = generateDay('20261124', 't5_abc');
  const [a = '', b = '', c = '', d = ''] = hand;

  it('accepts 3 distinct hand items and a known label', () => {
    expect(validatePack(hand, [a, b, c], 'laundry')).toBeNull();
  });

  it('rejects bad packs', () => {
    expect(validatePack(hand, [a, b], 'laundry')).toBe('wrong-count');
    expect(validatePack(hand, [a, b, c, d], 'laundry')).toBe('wrong-count');
    expect(validatePack(hand, [a, a, b], 'laundry')).toBe('duplicate-item');
    const outside =
      ['socks', 'gpu', 'laptop', 'gold-bar'].find((id) => !hand.includes(id)) ??
      '';
    expect(validatePack(hand, [a, b, outside], 'laundry')).toBe(
      'item-not-in-hand'
    );
    expect(validatePack(hand, [a, b, 3], 'laundry')).toBe('item-not-in-hand');
    expect(validatePack(hand, [a, b, c], 'free text')).toBe('unknown-label');
    expect(validatePack(hand, [a, b, c], undefined)).toBe('unknown-label');
  });
});
