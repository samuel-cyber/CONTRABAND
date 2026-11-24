import { redis } from '@devvit/web/server';
import type { Today } from './day';
import { int } from './errors';
import { keys } from './keys';
import {
  resolveNpcBag,
  resolvePlayerBag,
  type BagRef,
  type ResolvedBag,
  type StoredBag,
} from './shiftMachine';

const POOL_SCAN = 50;
export const MAX_BUSTER_NAMES = 3;

export const readBag = async (
  day: string,
  userId: string
): Promise<StoredBag | null> => {
  const raw = await redis.hGet(keys.bag(day, userId), 'data');
  if (!raw) return null;
  const bag: StoredBag = JSON.parse(raw);
  return bag;
};

export type BagCounters = {
  passes: number;
  busts: number;
  cut: number;
  busters: string[];
};

export const readBagCounters = async (
  day: string,
  userId: string
): Promise<BagCounters> => {
  const raw = await redis.hGetAll(keys.bag(day, userId));
  const busters: string[] = [];
  for (let i = 1; i <= MAX_BUSTER_NAMES; i++) {
    const name = raw[`buster${i}`];
    if (name) busters.push(name);
  }
  return {
    passes: int(raw.passes),
    busts: int(raw.busts),
    cut: int(raw.cut),
    busters,
  };
};

/** Loads a bag's secret contents. NPC bags are regenerated from today's seed. */
export const resolveRef = async (
  ref: BagRef,
  today: Today
): Promise<ResolvedBag | null> => {
  if (ref.kind === 'npc') {
    return resolveNpcBag(ref.npcId, today.setup, today.subredditId);
  }
  const stored = await readBag(ref.day, ref.userId);
  return stored ? resolvePlayerBag(stored) : null;
};

/** userIds in a day's pool, least-inspected first. */
export const readPool = async (day: string): Promise<string[]> => {
  const rows = await redis.zRange(keys.pool(day), 0, POOL_SCAN - 1, {
    by: 'rank',
  });
  return rows.map((r) => r.member);
};
