import { context } from '@devvit/web/server';
import { generateDay, type DaySetup } from '../../shared/daily';
import { addDays, dayKey, dayKeyToDate, prevDayKey } from '../../shared/day';

export type Today = {
  setup: DaySetup;
  day: string;
  yesterday: string;
  subredditId: string;
  nextDayAt: number;
};

/** Game state is keyed by the current UTC day, never by the post. */
export const getToday = (now: Date = new Date()): Today => {
  const day = dayKey(now);
  const subredditId = context.subredditId;
  return {
    setup: generateDay(day, subredditId),
    day,
    yesterday: prevDayKey(day),
    subredditId,
    nextDayAt: dayKeyToDate(addDays(day, 1)).getTime(),
  };
};
