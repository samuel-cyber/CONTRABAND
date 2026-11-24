// Redis side of the shift state machine. Every mutation runs as
// watch(shiftKey) -> read -> pure transition -> multi -> exec, so a replayed
// or concurrent request can never apply the same step twice.

import { redis } from '@devvit/web/server';
import type { PackRequest, Reveal, ShiftReport } from '../../shared/api';
import { SHIFT_SIZE } from '../../shared/balance';
import { validatePack } from '../../shared/daily';
import { isClean, xraysFor } from '../../shared/directives';
import { npcOrderForDay } from '../../shared/npc';
import {
  honestyBadge,
  nextStreak,
  staleHistoryKeys,
  type Streak,
} from '../../shared/reputation';
import { shiftOutcome, type StampAction } from '../../shared/scoring';
import { buildShareText } from '../../shared/share';
import { MAX_BUSTER_NAMES, readPool, resolveRef } from './bags';
import type { Today } from './day';
import { ApiError, int } from './errors';
import { dayTtlSeconds, keys } from './keys';
import { myEntry } from './leaderboard';
import { pickNextRef } from './pool';
import { npcScope } from './secret';
import {
  readHistory,
  readStats,
  resolveSnoovatar,
  type Identity,
} from './player';
import {
  applyStamp,
  applyXray,
  createShift,
  currentRef,
  type BagRef,
  type ResolvedBag,
  type ShiftState,
  type StoredBag,
} from './shiftMachine';

type Tx = Awaited<ReturnType<typeof redis.watch>>;

const abort = async (tx: Tx): Promise<void> => {
  try {
    await tx.unwatch();
  } catch {
    // Already released.
  }
};

/** exec() resolves to null when a watched key changed (UNCONFIRMED: may throw). */
const commit = async (tx: Tx): Promise<void> => {
  let result: unknown[] | null;
  try {
    result = await tx.exec();
  } catch (error) {
    console.warn('Transaction failed', error);
    throw new ApiError('busy', 'The checkpoint is busy. Try again.');
  }
  if (result === null) {
    throw new ApiError('busy', 'The checkpoint is busy. Try again.');
  }
};

export const readShift = async (
  day: string,
  userId: string
): Promise<ShiftState | null> => {
  const raw = await redis.get(keys.shift(day, userId));
  if (!raw) return null;
  const state: ShiftState = JSON.parse(raw);
  return state;
};

const nextRefFor = async (
  me: string,
  today: Today,
  used: readonly BagRef[]
): Promise<BagRef | null> => {
  const [todayUsers, yesterdayUsers, scope] = await Promise.all([
    readPool(today.day),
    readPool(today.yesterday),
    npcScope(today),
  ]);
  return pickNextRef({
    me,
    today: today.day,
    yesterday: today.yesterday,
    todayUsers,
    yesterdayUsers,
    npcIds: npcOrderForDay(today.day, scope).map((n) => n.id),
    used,
  });
};

const asStrings = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];

/** Seals the player's bag and opens their shift, atomically. */
export const packBag = async (
  ident: Identity,
  today: Today,
  body: Partial<Record<keyof PackRequest, unknown>>
): Promise<ShiftState> => {
  const rawItems = asStrings(body.itemIds);
  const error = validatePack(today.setup.hand, rawItems, body.labelId);
  const labelId = body.labelId;
  if (error || typeof labelId !== 'string') {
    throw new ApiError('bad-request', `Invalid bag: ${error ?? 'label'}`);
  }
  const itemIds = rawItems.filter((x): x is string => typeof x === 'string');

  const { day } = today;
  const bagKey = keys.bag(day, ident.userId);
  if (await redis.exists(bagKey)) {
    throw new ApiError('already-packed', 'You already packed a bag today.');
  }

  const [snoovatarUrl, history] = await Promise.all([
    resolveSnoovatar(ident.username),
    readHistory(ident.userId),
  ]);
  const priorHistory = Object.fromEntries(
    Object.entries(history).filter(([d]) => d !== day)
  );
  const bag: StoredBag = {
    day,
    userId: ident.userId,
    username: ident.username,
    snoovatarUrl,
    itemIds,
    labelId,
    createdAt: Date.now(),
    honesty: honestyBadge(priorHistory, day),
  };

  const first = await nextRefFor(ident.userId, today, []);
  if (!first) throw new ApiError('server', 'No travellers in the queue.');
  const directive = today.setup.directiveId;
  const state = createShift(day, directive, xraysFor(directive), first);

  const ttl = dayTtlSeconds(day);
  const tx = await redis.watch(bagKey);
  if (await redis.exists(bagKey)) {
    await abort(tx);
    throw new ApiError('already-packed', 'You already packed a bag today.');
  }
  const stale = staleHistoryKeys(history, day);

  await tx.multi();
  await tx.hSet(bagKey, {
    data: JSON.stringify(bag),
    passes: '0',
    busts: '0',
    cut: '0',
  });
  await tx.expire(bagKey, ttl);
  await tx.zAdd(keys.pool(day), { member: ident.userId, score: 0 });
  await tx.expire(keys.pool(day), ttl);
  await tx.hSet(keys.userHistory(ident.userId), {
    [day]: isClean(itemIds) ? 'clean' : 'dirty',
  });
  if (stale.length > 0) await tx.hDel(keys.userHistory(ident.userId), stale);
  await tx.hSet(keys.names(day), { [ident.userId]: ident.username });
  await tx.expire(keys.names(day), ttl);
  await tx.hIncrBy(keys.dayStats(day), 'bags', 1);
  await tx.expire(keys.dayStats(day), ttl);
  await tx.set(keys.shift(day, ident.userId), JSON.stringify(state));
  await tx.expire(keys.shift(day, ident.userId), ttl);
  if (first.kind === 'player') {
    await tx.zIncrBy(keys.pool(first.day), first.userId, 1);
    await tx.expire(keys.pool(first.day), dayTtlSeconds(first.day));
  }
  await commit(tx);
  return state;
};

/** Loads the shift and current bag under a watch. Caller must exec or abort. */
const openShift = async (
  ident: Identity,
  today: Today,
  expectedStep: number
): Promise<{ tx: Tx; state: ShiftState; bag: ResolvedBag }> => {
  const tx = await redis.watch(keys.shift(today.day, ident.userId));
  try {
    const state = await readShift(today.day, ident.userId);
    if (!state) throw new ApiError('not-packed', 'Pack your bag first.');
    const ref = currentRef(state);
    if (!ref) throw new ApiError('shift-finished', 'Your shift is over.');
    // The client says which bag it is looking at; a retried or doubled
    // request for a bag that's already stamped is rejected, not re-applied.
    if (state.step !== expectedStep) {
      throw new ApiError('stale', 'That bag was already stamped.');
    }
    const bag = await resolveRef(ref, today);
    if (!bag) throw new ApiError('server', 'That bag went missing.');
    return { tx, state, bag };
  } catch (error) {
    await abort(tx);
    throw error;
  }
};

export const xrayCurrent = async (
  ident: Identity,
  today: Today,
  expectedStep: number
): Promise<{ state: ShiftState; bag: ResolvedBag; itemId: string }> => {
  const { tx, state, bag } = await openShift(ident, today, expectedStep);
  const result = applyXray(state, bag, Math.random);
  if (!result.ok) {
    await abort(tx);
    throw new ApiError(result.code, 'No X-rays left.');
  }
  const key = keys.shift(today.day, ident.userId);
  await tx.multi();
  await tx.set(key, JSON.stringify(result.state));
  await tx.expire(key, dayTtlSeconds(today.day));
  await commit(tx);
  return { state: result.state, bag, itemId: result.itemId };
};

export type StampOutcome = {
  state: ShiftState;
  reveal: Reveal;
  nextBag: ResolvedBag | null;
  streak: Streak | null; // set when this stamp finished the shift
};

export const stampCurrent = async (
  ident: Identity,
  today: Today,
  action: StampAction,
  expectedStep: number
): Promise<StampOutcome> => {
  const { tx, state, bag } = await openShift(ident, today, expectedStep);
  const { day } = today;
  let next: BagRef | null = null;
  let busterSlot: number | null = null;
  let streak: Streak | null = null;
  try {
    if (state.step + 1 < SHIFT_SIZE) {
      next = await nextRefFor(ident.userId, today, state.refs);
    }
    if (bag.ref.kind === 'player' && action === 'BUST') {
      const busts = int(
        await redis.hGet(keys.bag(bag.ref.day, bag.ref.userId), 'busts')
      );
      if (busts < MAX_BUSTER_NAMES) busterSlot = busts + 1;
    }
    if (state.step + 1 >= SHIFT_SIZE) {
      const stats = await readStats(ident.userId);
      streak = nextStreak(stats.lastPlayedDay ? stats : null, day);
    }
  } catch (error) {
    await abort(tx);
    throw error;
  }

  const result = applyStamp(state, bag, action, next, Date.now());
  if (!result.ok) {
    await abort(tx);
    throw new ApiError(result.code, 'Your shift is over.');
  }
  const { reveal } = result;
  const ttl = dayTtlSeconds(day);
  const shiftKey = keys.shift(day, ident.userId);

  await tx.multi();
  await tx.set(shiftKey, JSON.stringify(result.state));
  await tx.expire(shiftKey, ttl);
  await tx.zAdd(keys.lbOfficer(day), {
    member: ident.userId,
    score: result.state.profit,
  });
  await tx.expire(keys.lbOfficer(day), ttl);
  await tx.hSet(keys.names(day), { [ident.userId]: ident.username });
  await tx.expire(keys.names(day), ttl);
  if (next?.kind === 'player') {
    await tx.zIncrBy(keys.pool(next.day), next.userId, 1);
    await tx.expire(keys.pool(next.day), dayTtlSeconds(next.day));
  }
  if (action === 'BUST' && !reveal.clean) {
    await tx.hIncrBy(keys.dayStats(day), 'busted', 1);
    await tx.expire(keys.dayStats(day), ttl);
  }
  if (bag.ref.kind === 'player' && bag.passport.kind === 'player') {
    const packer = bag.ref;
    const bagKey = keys.bag(packer.day, packer.userId);
    const packerTtl = dayTtlSeconds(packer.day);
    await tx.hIncrBy(bagKey, action === 'PASS' ? 'passes' : 'busts', 1);
    await tx.hIncrBy(bagKey, 'cut', reveal.smugglerDelta);
    await tx.expire(bagKey, packerTtl);
    if (busterSlot !== null) {
      await tx.hSet(bagKey, { [`buster${busterSlot}`]: ident.username });
    }
    await tx.hIncrBy(
      keys.userStats(packer.userId),
      'cut',
      reveal.smugglerDelta
    );
    await tx.zIncrBy(
      keys.lbSmuggler(packer.day),
      packer.userId,
      reveal.smugglerDelta
    );
    await tx.expire(keys.lbSmuggler(packer.day), packerTtl);
    await tx.hSet(keys.names(packer.day), {
      [packer.userId]: bag.passport.username,
    });
    await tx.expire(keys.names(packer.day), packerTtl);
  }
  if (streak) {
    await tx.hIncrBy(keys.dayStats(day), 'shifts', 1);
    await tx.expire(keys.dayStats(day), ttl);
    await tx.hSet(keys.userStats(ident.userId), {
      streak: String(streak.streak),
      best: String(streak.best),
      lastPlayedDay: streak.lastPlayedDay,
    });
    await tx.hIncrBy(keys.userStats(ident.userId), 'shifts', 1);
  }
  await commit(tx);

  const nextBag = next ? await resolveRef(next, today) : null;
  return { state: result.state, reveal, nextBag, streak };
};

export const buildReport = async (
  ident: Identity,
  today: Today,
  state: ShiftState,
  streak: Pick<Streak, 'streak' | 'best'>
): Promise<ShiftReport> => {
  const mine = await myEntry(
    'officer',
    today.day,
    ident.userId,
    ident.username
  );
  const bustedUsernames = [...new Set(state.bustedUsernames)];
  return {
    outcome: shiftOutcome(state.profit),
    profit: state.profit,
    rank: mine?.rank ?? null,
    reveals: state.reveals,
    bustedUsernames,
    streak: streak.streak,
    bestStreak: streak.best,
    shareText: buildShareText({
      dayKey: state.day,
      profit: state.profit,
      stamps: state.reveals.map((r) => ({
        action: r.action,
        correct: r.correct,
      })),
      bustedUsernames,
    }),
  };
};
