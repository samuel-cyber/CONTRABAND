import { Hono } from 'hono';
import type { TaskRequest, TaskResponse } from '@devvit/web/server';
import { getToday } from '../core/day';
import { ensureDailyPost } from '../core/post';

export const scheduler = new Hono();

// cron "5 0 * * *" in devvit.json: 00:05 UTC, right after the day rolls over.
scheduler.post('/daily-post', async (c) => {
  await c.req.json<TaskRequest>().catch(() => null);
  const startedAt = new Date().toISOString();
  try {
    const result = await ensureDailyPost(getToday());
    console.log(
      `[daily-post] ran at ${startedAt}: ${
        result
          ? `${result.created ? 'created' : 'already had'} ${result.postId}`
          : 'another run is creating it'
      }`
    );
  } catch (error) {
    console.error(`[daily-post] failed at ${startedAt}`, error);
  }
  return c.json<TaskResponse>({}, 200);
});
