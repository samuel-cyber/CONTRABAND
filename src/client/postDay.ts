import { context } from '@devvit/web/client';
import { isDayKey } from '../shared/day';

/** The UTC day this checkpoint post was created for, if known. */
export const postDayKey = (): string | null => {
  try {
    const day = context.postData?.dayKey;
    return isDayKey(day) ? day : null;
  } catch {
    return null;
  }
};

/** True when this post belongs to an earlier day and today's post exists. */
export const isOldPost = (
  todayKey: string,
  todayPostUrl: string | null
): boolean => {
  const day = postDayKey();
  return day !== null && day < todayKey && todayPostUrl !== null;
};
