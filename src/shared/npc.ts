import { BAG_SIZE } from './balance';
import { getItem, LABELS, NPCS, type Npc } from './catalog';
import { daySeed, type DaySetup } from './daily';
import { createRng } from './rng';

export type NpcBag = {
  npcId: string;
  itemIds: string[];
  labelId: string;
};

/**
 * Deterministic NPC bag for the day. Honest NPCs pack clean (when the hand
 * allows); dishonest ones carry 1 contraband, or 2 if they're feeling bold.
 */
export const npcBag = (
  npc: Npc,
  day: DaySetup,
  subredditId: string
): NpcBag => {
  const rng = createRng(`${daySeed(day.dayKey, subredditId)}:npc:${npc.id}`);
  const legal = rng.shuffle(day.hand.filter((id) => !getItem(id).contraband));
  const dirty = rng.shuffle(day.hand.filter((id) => getItem(id).contraband));

  const honest = rng.chance(npc.honesty);
  const bold = rng.chance(1 - npc.honesty);

  let contrabandCount = honest ? 0 : bold ? 2 : 1;
  // Respect what the hand can actually supply.
  contrabandCount = Math.min(contrabandCount, dirty.length);
  contrabandCount = Math.max(contrabandCount, BAG_SIZE - legal.length);

  const itemIds = [
    ...dirty.slice(0, contrabandCount),
    ...legal.slice(0, BAG_SIZE - contrabandCount),
  ];

  return {
    npcId: npc.id,
    itemIds: rng.shuffle(itemIds),
    labelId: rng.pick(LABELS).id,
  };
};

/** The day's NPC queue order, used for backfilling shifts. */
export const npcOrderForDay = (
  dayKey: string,
  subredditId: string
): readonly Npc[] =>
  createRng(`${daySeed(dayKey, subredditId)}:npc-order`).shuffle(NPCS);
