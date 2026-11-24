import { redis, reddit } from '@devvit/web/server';
import { getDirective } from '../../shared/directives';
import { formatShort } from '../../shared/day';
import type { Today } from './day';
import { dayTtlSeconds, keys } from './keys';

const CLAIM_TIMEOUT_MS = 2 * 60 * 1000;

export type DailyPost = { postId: string; created: boolean };

export const checkpointTitle = (n: number, directiveName: string): string =>
  `Checkpoint #${n}: ${directiveName}`;

/**
 * Creates today's checkpoint post exactly once per UTC day, no matter how
 * many times the scheduler, install trigger or mod menu call it.
 * Returns null if another caller is creating it right now.
 */
export const ensureDailyPost = async (
  today: Today
): Promise<DailyPost | null> => {
  const key = keys.dayPost(today.day);
  for (let attempt = 0; attempt < 2; attempt++) {
    const existing = await redis.hGetAll(key);
    if (existing.postId) return { postId: existing.postId, created: false };

    const claimed = await redis.hSetNX(key, 'claim', String(Date.now()));
    if (claimed !== 1) {
      const since = Date.now() - Number(existing.claim ?? 0);
      if (since < CLAIM_TIMEOUT_MS) return null;
      await redis.hDel(key, ['claim']); // stale claim from a crashed run
      continue;
    }
    await redis.expire(key, dayTtlSeconds(today.day));

    try {
      const directive = getDirective(today.setup.directiveId);
      const n = await redis.incrBy(keys.checkpointCounter(), 1);
      const post = await reddit.submitCustomPost({
        title: checkpointTitle(n, directive.name),
        entry: 'default',
        postData: {
          dayKey: today.day,
          directiveId: directive.id,
          checkpoint: n,
        },
        textFallback: {
          text: `CONTRABLUFF checkpoint for ${formatShort(today.day)}. Today's directive: ${directive.name}. ${directive.blurb} Open this post in the Reddit app or on new Reddit to play.`,
        },
      });
      await redis.hSet(key, { postId: post.id });
      return { postId: post.id, created: true };
    } catch (error) {
      await redis.hDel(key, ['claim']);
      throw error;
    }
  }
  return null;
};
