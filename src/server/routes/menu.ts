import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { context } from '@devvit/web/server';
import { getToday } from '../core/day';
import { ensureDailyPost } from '../core/post';

export const menu = new Hono();

menu.post('/post-create', async (c) => {
  try {
    const result = await ensureDailyPost(getToday());
    if (!result) {
      return c.json<UiResponse>(
        {
          showToast:
            "Today's checkpoint is being created. Try again in a minute.",
        },
        200
      );
    }
    return c.json<UiResponse>(
      {
        showToast: result.created
          ? "Today's checkpoint is open!"
          : "Today's checkpoint already exists. Taking you there.",
        navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${result.postId}`,
      },
      200
    );
  } catch (error) {
    console.error('Error creating checkpoint post', error);
    return c.json<UiResponse>(
      { showToast: "Couldn't create the checkpoint post." },
      400
    );
  }
});

menu.post('/example-form', async (c) => {
  return c.json<UiResponse>(
    {
      showForm: {
        name: 'exampleForm',
        form: {
          title: 'Example form',
          fields: [{ name: 'message', label: 'Message', type: 'string' }],
        },
      },
    },
    200
  );
});
