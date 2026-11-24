import { describe, expect, it } from 'vitest';
import { SHIFT_SIZE } from '../../shared/balance';
import { generateDay } from '../../shared/daily';
import {
  applyStamp,
  applyXray,
  createShift,
  currentRef,
  isFinished,
  resolveNpcBag,
  resolvePlayerBag,
  toBagView,
  toShiftView,
  type BagRef,
  type ResolvedBag,
  type ShiftState,
} from './shiftMachine';

const DAY = '20261124';
const SUB = 't5_test';
const setup = generateDay(DAY, SUB);

const playerBag = (itemIds: string[], userId = 't2_packer'): ResolvedBag =>
  resolvePlayerBag({
    day: DAY,
    userId,
    username: `user_${userId}`,
    snoovatarUrl: null,
    itemIds,
    labelId: 'laundry',
    createdAt: 0,
    honesty: { kind: 'new', text: 'New Traveler' },
  });

const DIRTY = playerBag(['gold-watch', 'socks', 'paperback']);
const CLEAN = playerBag(['socks', 'toothbrush', 'umbrella'], 't2_clean');
const npcRef = (npcId: string): BagRef => ({ kind: 'npc', npcId });

const fresh = (xrays = 1): ShiftState =>
  createShift(DAY, 'weight-check', xrays, DIRTY.ref);

describe('shift machine', () => {
  it('starts at step 0 with the first bag current', () => {
    const s = fresh();
    expect(s.step).toBe(0);
    expect(currentRef(s)).toEqual(DIRTY.ref);
    expect(isFinished(s)).toBe(false);
  });

  it('x-ray reveals a real item, spends a charge and never repeats', () => {
    const s0 = fresh(2);
    const r1 = applyXray(s0, DIRTY, () => 0);
    if (!r1.ok) throw new Error('expected ok');
    expect(DIRTY.itemIds).toContain(r1.itemId);
    expect(r1.state.xraysLeft).toBe(1);
    const r2 = applyXray(r1.state, DIRTY, () => 0);
    if (!r2.ok) throw new Error('expected ok');
    expect(r2.itemId).not.toBe(r1.itemId);
    expect(applyXray(r2.state, DIRTY, () => 0)).toEqual({
      ok: false,
      code: 'no-xrays',
    });
    expect(s0.xraysLeft).toBe(2); // input not mutated
  });

  it('stamping advances one step, scores and queues the next bag', () => {
    const r = applyStamp(fresh(), DIRTY, 'BUST', npcRef('dr-vex'), 1);
    if (!r.ok) throw new Error('expected ok');
    expect(r.state.step).toBe(1);
    expect(r.state.profit).toBe(650);
    expect(r.reveal).toMatchObject({
      index: 0,
      action: 'BUST',
      correct: true,
      clean: false,
      itemIds: DIRTY.itemIds,
    });
    expect(r.state.bustedUsernames).toEqual(['user_t2_packer']);
    expect(currentRef(r.state)).toEqual(npcRef('dr-vex'));
  });

  it('does not call out clean bags or NPCs', () => {
    const s = createShift(DAY, 'weight-check', 1, CLEAN.ref);
    const r = applyStamp(s, CLEAN, 'BUST', null, 1);
    if (!r.ok) throw new Error('expected ok');
    expect(r.state.bustedUsernames).toEqual([]);
    expect(r.state.profit).toBe(-300);
  });

  it('finishes after SHIFT_SIZE stamps and refuses more', () => {
    let s = fresh();
    for (let i = 0; i < SHIFT_SIZE; i++) {
      const r = applyStamp(s, CLEAN, 'PASS', npcRef(`n${i}`), 99);
      if (!r.ok) throw new Error('expected ok');
      s = r.state;
    }
    expect(isFinished(s)).toBe(true);
    expect(s.finishedAt).toBe(99);
    expect(s.refs).toHaveLength(SHIFT_SIZE);
    expect(currentRef(s)).toBeNull();
    expect(applyStamp(s, CLEAN, 'PASS', null, 1)).toEqual({
      ok: false,
      code: 'shift-finished',
    });
    expect(applyXray(s, CLEAN, () => 0)).toEqual({
      ok: false,
      code: 'shift-finished',
    });
  });
});

describe('sanitizing', () => {
  it('never leaks contents beyond x-rayed items', () => {
    const s0 = fresh();
    const view = toBagView(s0, 0, DIRTY);
    expect(JSON.stringify(view)).not.toContain('gold-watch');
    expect(view.xrayedItemIds).toEqual([]);
    const x = applyXray(s0, DIRTY, () => 0);
    if (!x.ok) throw new Error('expected ok');
    const after = toShiftView(x.state, DIRTY);
    expect(after.current?.xrayedItemIds).toEqual([x.itemId]);
    const hidden = DIRTY.itemIds.filter((id) => id !== x.itemId);
    for (const id of hidden) {
      expect(JSON.stringify(after)).not.toContain(`"${id}"`);
    }
  });

  it('shows weight only on Weight Check days', () => {
    expect(toBagView(fresh(), 0, DIRTY).weightGrams).toBe(180 + 120 + 300);
    const s = createShift(DAY, 'double-scan', 2, DIRTY.ref);
    expect(toBagView(s, 0, DIRTY).weightGrams).toBeNull();
  });
});

describe('npc bags', () => {
  it('resolves deterministically with an NPC passport', () => {
    const a = resolveNpcBag('aunty-bisi', setup, SUB);
    expect(a).toEqual(resolveNpcBag('aunty-bisi', setup, SUB));
    expect(a?.passport).toEqual({
      kind: 'npc',
      npcId: 'aunty-bisi',
      honesty: { kind: 'rated', percent: 80, text: '80% Honest' },
    });
    expect(resolveNpcBag('nobody', setup, SUB)).toBeNull();
  });
});

describe('npc seed salt', () => {
  it('changes NPC bags so they cannot be precomputed from public data', () => {
    const ids = [
      'aunty-bisi',
      'dr-vex',
      'captain-marlowe',
      'lola',
      'mr-kim',
      'madame-rouge',
      'professor-okoro',
      'chef-antoine',
    ];
    const plain = ids.map((id) => resolveNpcBag(id, setup, SUB)?.itemIds);
    const salted = ids.map(
      (id) => resolveNpcBag(id, setup, `${SUB}:secret-salt`)?.itemIds
    );
    expect(salted).not.toEqual(plain);
  });
});
