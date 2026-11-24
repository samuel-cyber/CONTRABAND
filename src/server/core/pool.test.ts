import { describe, expect, it } from 'vitest';
import { pickNextRef, type PoolCandidates } from './pool';

const base: PoolCandidates = {
  me: 't2_me',
  today: '20261124',
  yesterday: '20261123',
  todayUsers: [],
  yesterdayUsers: [],
  npcIds: ['dr-vex', 'lola'],
  used: [],
};

describe('pickNextRef', () => {
  it("prefers today's least-inspected bag, never my own", () => {
    expect(
      pickNextRef({ ...base, todayUsers: ['t2_me', 't2_a', 't2_b'] })
    ).toEqual({ kind: 'player', day: '20261124', userId: 't2_a' });
  });

  it("falls back to yesterday's pool, then NPCs", () => {
    expect(
      pickNextRef({ ...base, todayUsers: ['t2_me'], yesterdayUsers: ['t2_y'] })
    ).toEqual({ kind: 'player', day: '20261123', userId: 't2_y' });
    expect(pickNextRef({ ...base, yesterdayUsers: ['t2_me'] })).toEqual({
      kind: 'npc',
      npcId: 'dr-vex',
    });
  });

  it('skips bags and travellers already in the shift', () => {
    expect(
      pickNextRef({
        ...base,
        todayUsers: ['t2_a'],
        yesterdayUsers: ['t2_a', 't2_b'],
        used: [
          { kind: 'player', day: '20261124', userId: 't2_a' },
          { kind: 'npc', npcId: 'dr-vex' },
        ],
      })
    ).toEqual({ kind: 'player', day: '20261123', userId: 't2_b' });
    expect(
      pickNextRef({ ...base, used: [{ kind: 'npc', npcId: 'dr-vex' }] })
    ).toEqual({ kind: 'npc', npcId: 'lola' });
  });

  it('returns null when nothing is left', () => {
    expect(
      pickNextRef({
        ...base,
        used: [
          { kind: 'npc', npcId: 'dr-vex' },
          { kind: 'npc', npcId: 'lola' },
        ],
      })
    ).toBeNull();
  });
});
