// Pure bag-pool selection: today's least-inspected bags (never your own),
// then yesterday's, then NPC backfill.

import { refId, type BagRef } from './shiftMachine';

export type PoolCandidates = {
  me: string;
  today: string;
  yesterday: string;
  /** userIds in today's pool, least-inspected first. */
  todayUsers: readonly string[];
  /** userIds in yesterday's pool, least-inspected first. */
  yesterdayUsers: readonly string[];
  /** Today's NPC order. */
  npcIds: readonly string[];
  /** Bags already in this shift. */
  used: readonly BagRef[];
};

export const pickNextRef = (c: PoolCandidates): BagRef | null => {
  const used = new Set(c.used.map(refId));
  const fresh = (ref: BagRef) => !used.has(refId(ref));
  // Never show the same traveller twice in one shift, even across days.
  const seenUsers = new Set(
    c.used.flatMap((r) => (r.kind === 'player' ? [r.userId] : []))
  );
  const playerOk = (userId: string) =>
    userId !== c.me && !seenUsers.has(userId);

  for (const userId of c.todayUsers) {
    if (playerOk(userId)) return { kind: 'player', day: c.today, userId };
  }
  for (const userId of c.yesterdayUsers) {
    if (playerOk(userId)) return { kind: 'player', day: c.yesterday, userId };
  }
  for (const npcId of c.npcIds) {
    const ref: BagRef = { kind: 'npc', npcId };
    if (fresh(ref)) return ref;
  }
  return null;
};
