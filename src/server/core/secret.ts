import { redis } from '@devvit/web/server';
import type { Today } from './day';
import { keys } from './keys';

let cachedSalt: string | null = null;

/**
 * A random per-install secret mixed into NPC seeds. Without it, anyone with
 * the source code and the (client-visible) subreddit id could compute every
 * NPC bag's contents ahead of time.
 */
const npcSalt = async (): Promise<string> => {
  if (cachedSalt) return cachedSalt;
  const fresh = crypto.randomUUID();
  await redis.hSetNX(keys.config(), 'npcSalt', fresh);
  cachedSalt = (await redis.hGet(keys.config(), 'npcSalt')) ?? fresh;
  return cachedSalt;
};

/** Seed scope for NPC bags and NPC order: subreddit + secret salt. */
export const npcScope = async (today: Today): Promise<string> =>
  `${today.subredditId}:${await npcSalt()}`;
