import { describe, expect, it } from 'vitest';
import { BAG_SIZE } from './balance';
import { findLabel, getItem, NPCS } from './catalog';
import { generateDay } from './daily';
import { addDays } from './day';
import { npcBag, npcOrderForDay } from './npc';

const SUB = 't5_abc';
const days = Array.from({ length: 200 }, (_, i) => addDays('20260101', i));
const npc = (id: string) => {
  const n = NPCS.find((x) => x.id === id);
  if (!n) throw new Error(id);
  return n;
};

describe('npcBag', () => {
  it('is deterministic', () => {
    const day = generateDay('20261124', SUB);
    for (const n of NPCS)
      expect(npcBag(n, day, SUB)).toEqual(npcBag(n, day, SUB));
  });

  it('always packs 3 distinct items from the hand and a real label', () => {
    for (const d of days) {
      const day = generateDay(d, SUB);
      for (const n of NPCS) {
        const bag = npcBag(n, day, SUB);
        expect(bag.itemIds).toHaveLength(BAG_SIZE);
        expect(new Set(bag.itemIds).size).toBe(BAG_SIZE);
        expect(bag.itemIds.every((id) => day.hand.includes(id))).toBe(true);
        expect(findLabel(bag.labelId)).toBeDefined();
      }
    }
  });

  it('follows personality: honest NPCs are mostly clean, crooks mostly dirty', () => {
    const cleanRate = (id: string) =>
      days.filter((d) =>
        npcBag(npc(id), generateDay(d, SUB), SUB).itemIds.every(
          (i) => !getItem(i).contraband
        )
      ).length / days.length;
    expect(cleanRate('sister-grace')).toBeGreaterThan(0.85);
    expect(cleanRate('slick-eddie')).toBeLessThan(0.25);
    expect(cleanRate('aunty-bisi')).toBeGreaterThan(cleanRate('dr-vex'));
  });

  it('npcOrderForDay is a deterministic permutation of all NPCs', () => {
    const order = npcOrderForDay('20261124', SUB).map((n) => n.id);
    expect(order).toEqual(npcOrderForDay('20261124', SUB).map((n) => n.id));
    expect([...order].sort()).toEqual(NPCS.map((n) => n.id).sort());
  });
});
