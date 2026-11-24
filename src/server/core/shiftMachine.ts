// Pure shift state machine. No Redis here, so it can be unit-tested.
// The Redis layer (shift.ts) loads a ShiftState, calls these functions and
// writes the result back inside a watch/multi transaction.

import { SHIFT_SIZE } from '../../shared/balance';
import { findNpc } from '../../shared/catalog';
import {
  showsWeight,
  bagWeight,
  type DirectiveId,
} from '../../shared/directives';
import { npcBag } from '../../shared/npc';
import type { DaySetup } from '../../shared/daily';
import type { BagView, Passport, Reveal, ShiftView } from '../../shared/api';
import type { HonestyBadge } from '../../shared/reputation';
import { resolveInspection, type StampAction } from '../../shared/scoring';

export type BagRef =
  | { kind: 'player'; day: string; userId: string }
  | { kind: 'npc'; npcId: string };

/** A bag with its secret contents. Never sent to the client before stamping. */
export type ResolvedBag = {
  ref: BagRef;
  itemIds: string[];
  labelId: string;
  passport: Passport;
};

/** What we store for a player's bag (field `data` of the bag hash). */
export type StoredBag = {
  day: string;
  userId: string;
  username: string;
  snoovatarUrl: string | null;
  itemIds: string[];
  labelId: string;
  createdAt: number;
  honesty: HonestyBadge; // computed at pack time from history *before* today
};

export type ShiftState = {
  v: 1;
  day: string;
  directiveId: DirectiveId;
  refs: BagRef[]; // refs[step] is the current bag while step < SHIFT_SIZE
  step: number;
  xraysLeft: number;
  profit: number;
  xrayed: string[][]; // item ids revealed by X-ray, per bag index
  reveals: Reveal[];
  bustedUsernames: string[];
  finishedAt: number | null;
};

export const refId = (ref: BagRef): string =>
  ref.kind === 'npc' ? `npc:${ref.npcId}` : `${ref.day}:${ref.userId}`;

export const npcHonesty = (honesty: number): HonestyBadge => {
  const percent = Math.round(honesty * 100);
  return { kind: 'rated', percent, text: `${percent}% Honest` };
};

export const resolveNpcBag = (
  npcId: string,
  day: DaySetup,
  /** subredditId + secret salt (see secret.ts) */
  scope: string
): ResolvedBag | null => {
  const npc = findNpc(npcId);
  if (!npc) return null;
  const bag = npcBag(npc, day, scope);
  return {
    ref: { kind: 'npc', npcId },
    itemIds: bag.itemIds,
    labelId: bag.labelId,
    passport: { kind: 'npc', npcId, honesty: npcHonesty(npc.honesty) },
  };
};

export const resolvePlayerBag = (stored: StoredBag): ResolvedBag => ({
  ref: { kind: 'player', day: stored.day, userId: stored.userId },
  itemIds: stored.itemIds,
  labelId: stored.labelId,
  passport: {
    kind: 'player',
    username: stored.username,
    snoovatarUrl: stored.snoovatarUrl,
    honesty: stored.honesty,
  },
});

export const createShift = (
  day: string,
  directiveId: DirectiveId,
  xrays: number,
  first: BagRef
): ShiftState => ({
  v: 1,
  day,
  directiveId,
  refs: [first],
  step: 0,
  xraysLeft: xrays,
  profit: 0,
  xrayed: [],
  reveals: [],
  bustedUsernames: [],
  finishedAt: null,
});

export const isFinished = (s: ShiftState): boolean => s.step >= SHIFT_SIZE;

export const currentRef = (s: ShiftState): BagRef | null =>
  isFinished(s) ? null : (s.refs[s.step] ?? null);

export type MachineError = 'shift-finished' | 'no-xrays' | 'nothing-left';

export type XrayResult =
  | { ok: true; state: ShiftState; itemId: string }
  | { ok: false; code: MachineError };

/** Reveals one not-yet-revealed item of the current bag. */
export const applyXray = (
  s: ShiftState,
  bag: ResolvedBag,
  random: () => number
): XrayResult => {
  if (isFinished(s)) return { ok: false, code: 'shift-finished' };
  if (s.xraysLeft <= 0) return { ok: false, code: 'no-xrays' };
  const seen = s.xrayed[s.step] ?? [];
  const hidden = bag.itemIds.filter((id) => !seen.includes(id));
  const itemId = hidden[Math.floor(random() * hidden.length)];
  if (itemId === undefined) return { ok: false, code: 'nothing-left' };

  const xrayed = [...s.xrayed];
  while (xrayed.length <= s.step) xrayed.push([]);
  xrayed[s.step] = [...seen, itemId];
  return {
    ok: true,
    itemId,
    state: { ...s, xrayed, xraysLeft: s.xraysLeft - 1 },
  };
};

export type StampResult =
  | { ok: true; state: ShiftState; reveal: Reveal }
  | { ok: false; code: MachineError };

/**
 * Stamps the current bag. `next` is the bag assigned to the following slot
 * (ignored when this was the last bag).
 */
export const applyStamp = (
  s: ShiftState,
  bag: ResolvedBag,
  action: StampAction,
  next: BagRef | null,
  now: number
): StampResult => {
  if (isFinished(s)) return { ok: false, code: 'shift-finished' };
  const result = resolveInspection(bag.itemIds, action, s.directiveId);
  const reveal: Reveal = {
    ...result,
    index: s.step,
    action,
    itemIds: bag.itemIds,
    passport: bag.passport,
    labelId: bag.labelId,
  };
  const step = s.step + 1;
  const finished = step >= SHIFT_SIZE;
  const caughtPlayer =
    action === 'BUST' && !result.clean && bag.passport.kind === 'player';
  return {
    ok: true,
    reveal,
    state: {
      ...s,
      step,
      profit: s.profit + result.officerDelta,
      reveals: [...s.reveals, reveal],
      refs: !finished && next ? [...s.refs, next] : s.refs,
      bustedUsernames:
        caughtPlayer && bag.passport.kind === 'player'
          ? [...s.bustedUsernames, bag.passport.username]
          : s.bustedUsernames,
      finishedAt: finished ? now : null,
    },
  };
};

/** The officer's view of a bag: no contents beyond what was X-rayed. */
export const toBagView = (
  s: ShiftState,
  index: number,
  bag: ResolvedBag
): BagView => ({
  index,
  passport: bag.passport,
  labelId: bag.labelId,
  weightGrams: showsWeight(s.directiveId) ? bagWeight(bag.itemIds) : null,
  xrayedItemIds: [...(s.xrayed[index] ?? [])],
});

export const toShiftView = (
  s: ShiftState,
  current: ResolvedBag | null
): ShiftView => ({
  step: s.step,
  total: SHIFT_SIZE,
  xraysLeft: s.xraysLeft,
  profit: s.profit,
  current: current && !isFinished(s) ? toBagView(s, s.step, current) : null,
  reveals: s.reveals,
});
