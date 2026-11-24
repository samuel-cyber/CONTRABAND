import {
  BAG_SIZE,
  HAND_SIZE,
  MIN_CONTRABAND_IN_HAND,
  MIN_LEGAL_IN_HAND,
} from './balance';
import { CONTRABAND_ITEMS, findLabel, LEGAL_ITEMS } from './catalog';
import { DIRECTIVES, type DirectiveId } from './directives';
import { createRng } from './rng';

export type DaySetup = {
  dayKey: string;
  directiveId: DirectiveId;
  hand: string[]; // item ids, length HAND_SIZE
};

export const daySeed = (dayKey: string, subredditId: string): string =>
  `${dayKey}:${subredditId}`;

/** Deterministic daily setup for one subreddit. */
export const generateDay = (dayKey: string, subredditId: string): DaySetup => {
  const rng = createRng(daySeed(dayKey, subredditId));
  const legal = rng.shuffle(LEGAL_ITEMS).map((i) => i.id);
  const contraband = rng.shuffle(CONTRABAND_ITEMS).map((i) => i.id);

  const picked = [
    ...legal.splice(0, MIN_LEGAL_IN_HAND),
    ...contraband.splice(0, MIN_CONTRABAND_IN_HAND),
  ];
  const rest = rng.shuffle([...legal, ...contraband]);
  picked.push(...rest.slice(0, HAND_SIZE - picked.length));

  return {
    dayKey,
    directiveId: rng.pick(DIRECTIVES).id,
    hand: rng.shuffle(picked),
  };
};

export type PackError =
  'wrong-count' | 'duplicate-item' | 'item-not-in-hand' | 'unknown-label';

/** Validates a pack intent against today's hand. Returns null when valid. */
export const validatePack = (
  hand: readonly string[],
  itemIds: readonly unknown[],
  labelId: unknown
): PackError | null => {
  if (itemIds.length !== BAG_SIZE) return 'wrong-count';
  if (new Set(itemIds).size !== itemIds.length) return 'duplicate-item';
  if (!itemIds.every((id) => typeof id === 'string' && hand.includes(id))) {
    return 'item-not-in-hand';
  }
  if (typeof labelId !== 'string' || !findLabel(labelId))
    return 'unknown-label';
  return null;
};
