import { BASE_XRAYS, DOUBLE_SCAN_XRAYS, TECH_MULTIPLIER } from './balance';
import { getItem, type Item } from './catalog';

export type DirectiveId = 'weight-check' | 'tech-crackdown' | 'double-scan';

export type Directive = {
  id: DirectiveId;
  name: string;
  icon: string;
  blurb: string; // one line, shown on the post and the booth
};

export const DIRECTIVES: readonly Directive[] = [
  {
    id: 'weight-check',
    name: 'Weight Check',
    icon: '⚖️',
    blurb: 'Every bag shows its total weight.',
  },
  {
    id: 'tech-crackdown',
    name: 'Tech Crackdown',
    icon: '🔌',
    blurb: 'Tech items are worth double today.',
  },
  {
    id: 'double-scan',
    name: 'Double Scan',
    icon: '📡',
    blurb: 'Officers get 2 X-rays this shift.',
  },
];

export const isDirectiveId = (value: unknown): value is DirectiveId =>
  DIRECTIVES.some((d) => d.id === value);

export const getDirective = (id: DirectiveId): Directive => {
  const d = DIRECTIVES.find((x) => x.id === id);
  if (!d) throw new Error(`Unknown directive: ${id}`);
  return d;
};

export const xraysFor = (id: DirectiveId): number =>
  id === 'double-scan' ? DOUBLE_SCAN_XRAYS : BASE_XRAYS;

export const showsWeight = (id: DirectiveId): boolean => id === 'weight-check';

/** An item's value under today's directive (Tech Crackdown doubles tech). */
export const itemValue = (item: Item, directive: DirectiveId): number =>
  directive === 'tech-crackdown' && item.tags.includes('tech')
    ? item.value * TECH_MULTIPLIER
    : item.value;

/** Total contraband value in a bag under today's directive. */
export const contrabandValue = (
  itemIds: readonly string[],
  directive: DirectiveId
): number =>
  itemIds
    .map(getItem)
    .filter((i) => i.contraband)
    .reduce((sum, i) => sum + itemValue(i, directive), 0);

export const bagWeight = (itemIds: readonly string[]): number =>
  itemIds.map(getItem).reduce((sum, i) => sum + i.grams, 0);

export const isClean = (itemIds: readonly string[]): boolean =>
  itemIds.every((id) => !getItem(id).contraband);
