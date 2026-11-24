import { context, redis } from '@devvit/web/server';
import type { StateResponse, Verdict } from '../../shared/api';
import { LEADERBOARD_PREVIEW_SIZE } from '../../shared/balance';
import { isClean } from '../../shared/directives';
import { readBag, readBagCounters, resolveRef } from './bags';
import type { Today } from './day';
import { int } from './errors';
import { keys } from './keys';
import { topEntries } from './leaderboard';
import { readStats, type Identity } from './player';
import { buildReport, readShift } from './shift';
import { currentRef, isFinished, toShiftView } from './shiftMachine';

/** Yesterday's verdict on the player's bag, if they packed one. */
export const readVerdict = async (
  userId: string,
  day: string
): Promise<Verdict | null> => {
  const bag = await readBag(day, userId);
  if (!bag) return null;
  const c = await readBagCounters(day, userId);
  return {
    dayKey: day,
    clean: isClean(bag.itemIds),
    itemIds: bag.itemIds,
    labelId: bag.labelId,
    passedBy: c.passes,
    bustedBy: c.busts,
    cut: c.cut,
    bustedByNames: c.busters,
  };
};

export const buildState = async (
  ident: Identity | null,
  today: Today
): Promise<StateResponse> => {
  const [dayStats, leaderboard] = await Promise.all([
    redis.hGetAll(keys.dayStats(today.day)),
    topEntries('officer', today.day, LEADERBOARD_PREVIEW_SIZE),
  ]);
  const base: StateResponse = {
    type: 'state',
    dayKey: today.day,
    nextDayAt: today.nextDayAt,
    directiveId: today.setup.directiveId,
    hand: today.setup.hand,
    phase: 'logged-out',
    me: null,
    myBag: null,
    verdict: null,
    shift: null,
    report: null,
    bustedToday: int(dayStats.busted),
    shiftsToday: int(dayStats.shifts),
    leaderboard,
  };
  if (!ident) return base;

  const [stats, myBag, shift, verdict] = await Promise.all([
    readStats(ident.userId),
    readBag(today.day, ident.userId),
    readShift(today.day, ident.userId),
    readVerdict(ident.userId, today.yesterday),
  ]);

  const ref = shift ? currentRef(shift) : null;
  const current = ref ? await resolveRef(ref, today) : null;
  const finished = shift ? isFinished(shift) : false;
  const playedToday = stats.lastPlayedDay === today.day;

  return {
    ...base,
    phase: !myBag ? 'pack' : shift && !finished ? 'inspect' : 'report',
    me: {
      username: ident.username,
      snoovatarUrl: context.snoovatar ?? myBag?.snoovatarUrl ?? null,
      streak: stats.streak,
      firstShift: stats.shifts === 0 || (stats.shifts === 1 && playedToday),
    },
    myBag: myBag ? { itemIds: myBag.itemIds, labelId: myBag.labelId } : null,
    verdict,
    shift: shift ? toShiftView(shift, current) : null,
    report:
      shift && finished
        ? await buildReport(ident, today, shift, {
            streak: stats.streak,
            best: stats.best,
          })
        : null,
  };
};
