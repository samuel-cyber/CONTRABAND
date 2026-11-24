// Static game content: items, preset labels and NPC travellers.
// `icon` is a placeholder emoji until the designer's SVGs arrive
// (src/client/assets/items/item-<id>.svg, assets/npcs/npc-<id>.svg).

export type ItemTag =
  'tech' | 'food' | 'luxury' | 'living' | 'antique' | 'comfort';

export type Item = {
  id: string;
  name: string;
  icon: string;
  contraband: boolean;
  value: number;
  grams: number;
  tags: readonly ItemTag[];
};

export type Label = { id: string; text: string };

export type Npc = {
  id: string;
  name: string;
  title: string;
  honesty: number; // probability (0..1) that their bag is clean on a given day
  icon: string;
};

const legal = (
  id: string,
  name: string,
  icon: string,
  value: number,
  grams: number,
  tags: readonly ItemTag[] = []
): Item => ({ id, name, icon, contraband: false, value, grams, tags });

const contraband = (
  id: string,
  name: string,
  icon: string,
  value: number,
  grams: number,
  tags: readonly ItemTag[] = []
): Item => ({ id, name, icon, contraband: true, value, grams, tags });

// Weights: contraband tends to be heavy, but a few light contraband and heavy
// legal items keep Weight Check days from being a solved puzzle.
export const ITEMS: readonly Item[] = [
  legal('socks', 'Socks', '🧦', 20, 120, ['comfort']),
  legal('coffee-beans', 'Coffee Beans', '☕', 40, 500, ['food']),
  legal('paperback', 'Paperback Novel', '📕', 25, 300),
  legal('phone-charger', 'Phone Charger', '🔌', 30, 150, ['tech']),
  legal('rubber-duck', 'Rubber Duck', '🦆', 20, 80),
  legal('toothbrush', 'Toothbrush', '🪥', 20, 30),
  legal('sunglasses', 'Sunglasses', '🕶️', 60, 50),
  legal('umbrella', 'Umbrella', '☂️', 35, 450),
  legal('tea-box', 'Tea Box', '🍵', 30, 250, ['food']),
  legal('headphones', 'Headphones', '🎧', 80, 280, ['tech']),
  legal('board-game', 'Board Game', '🎲', 50, 1100),
  legal('travel-pillow', 'Travel Pillow', '💤', 30, 350, ['comfort']),
  legal('snack-pack', 'Snack Pack', '🍪', 20, 400, ['food']),
  legal('teddy-bear', 'Teddy Bear', '🧸', 40, 400, ['comfort']),
  legal('laptop', 'Laptop', '💻', 80, 1600, ['tech']),

  contraband('gpu', 'Smuggled GPU', '🖥️', 800, 1800, ['tech']),
  contraband('gold-watch', 'Gold Watch', '⌚', 650, 180, ['luxury']),
  contraband('rare-sneakers', 'Rare Sneakers', '👟', 450, 1100, ['luxury']),
  contraband('fake-designer-bag', 'Fake Designer Bag', '👜', 350, 900, [
    'luxury',
  ]),
  contraband('vintage-wine', 'Vintage Wine', '🍷', 500, 1400, [
    'food',
    'luxury',
  ]),
  contraband('live-parrot', 'Live Parrot', '🦜', 700, 600, ['living']),
  contraband('meteorite', 'Meteorite Chunk', '☄️', 600, 2500, ['antique']),
  contraband('gold-bar', 'Gold Bar', '🪙', 900, 2000, ['luxury']),
  contraband('diamond-ring', 'Diamond Ring', '💍', 850, 20, ['luxury']),
  contraband('ancient-vase', 'Ancient Vase', '🏺', 750, 2200, ['antique']),
  contraband('rare-comic', 'Rare Comic Book', '📚', 400, 250, ['antique']),
  contraband('exotic-cheese', 'Smelly Exotic Cheese', '🧀', 300, 1200, [
    'food',
  ]),
  contraband('prototype-phone', 'Prototype Phone', '📱', 700, 220, ['tech']),
  contraband('rare-orchid', 'Rare Orchid', '🌸', 450, 700, ['living']),
  contraband('caviar-tin', 'Caviar Tin', '🥫', 550, 400, ['food', 'luxury']),
];

export const LABELS: readonly Label[] = [
  { id: 'laundry', text: 'Just laundry, officer' },
  { id: 'grandmas-tea', text: "Grandma's tea, don't ask" },
  { id: 'souvenirs', text: 'Souvenirs for my nephew' },
  { id: 'business', text: 'Strictly business documents' },
  { id: 'nothing-to-declare', text: 'Nothing to declare, honestly' },
  { id: 'snacks', text: 'Snacks. Lots of snacks.' },
  { id: 'in-laws', text: 'Gifts for my in-laws' },
  { id: 'school-project', text: "It's for a school project" },
  { id: 'emotional-support', text: 'Emotional support items only' },
  { id: 'conference-swag', text: 'Conference swag, I swear' },
  { id: 'wedding', text: 'Wedding stuff, very fragile' },
  { id: 'mum-packed', text: 'My mum packed this' },
  { id: 'camping', text: 'Camping gear, mostly' },
  { id: 'sentimental', text: 'Sentimental value only' },
  { id: 'personal', text: "Please don't open, it's personal" },
  { id: 'vacation', text: 'Vacation essentials' },
  { id: 'totally-normal', text: 'Totally normal luggage' },
  { id: 'art-supplies', text: 'Art supplies for a workshop' },
  { id: 'regrets', text: 'Spare clothes and regrets' },
  { id: 'duty-free', text: 'Bought it all at duty free' },
  { id: 'lucky-socks', text: 'Lucky socks. Very lucky.' },
  { id: 'lawyer', text: 'Ask my lawyer' },
  { id: 'homemade-jam', text: 'Homemade jam for Aunty' },
  { id: 'heavier-than-it-looks', text: 'Heavier than it looks, sorry' },
];

export const NPCS: readonly Npc[] = [
  {
    id: 'aunty-bisi',
    name: 'Aunty Bisi',
    title: 'Frequent Flyer',
    honesty: 0.8,
    icon: '👵🏾',
  },
  {
    id: 'dr-vex',
    name: 'Dr. Vex',
    title: 'Suspiciously Calm',
    honesty: 0.2,
    icon: '🧐',
  },
  {
    id: 'captain-marlowe',
    name: 'Captain Marlowe',
    title: 'Retired Sea Captain',
    honesty: 0.5,
    icon: '🧔',
  },
  {
    id: 'lola',
    name: 'Lola',
    title: 'Backpacker on a Budget',
    honesty: 0.7,
    icon: '🎒',
  },
  {
    id: 'mr-kim',
    name: 'Mr. Kim',
    title: 'Business Class Regular',
    honesty: 0.75,
    icon: '👔',
  },
  {
    id: 'madame-rouge',
    name: 'Madame Rouge',
    title: 'Art Collector',
    honesty: 0.3,
    icon: '💄',
  },
  {
    id: 'professor-okoro',
    name: 'Professor Okoro',
    title: 'Visiting Lecturer',
    honesty: 0.9,
    icon: '👨🏿‍🏫',
  },
  {
    id: 'chef-antoine',
    name: 'Chef Antoine',
    title: 'Gourmet on Tour',
    honesty: 0.35,
    icon: '👨‍🍳',
  },
  {
    id: 'sister-grace',
    name: 'Sister Grace',
    title: 'Mission Trip Volunteer',
    honesty: 0.95,
    icon: '🙏',
  },
  {
    id: 'slick-eddie',
    name: '"Slick" Eddie',
    title: 'Knows a Guy',
    honesty: 0.1,
    icon: '😎',
  },
  {
    id: 'coach-tunde',
    name: 'Coach Tunde',
    title: 'Away Game Coach',
    honesty: 0.7,
    icon: '🏅',
  },
  {
    id: 'nana-ama',
    name: 'Nana Ama',
    title: 'Visiting Grandkids',
    honesty: 0.8,
    icon: '🧕🏿',
  },
];

const itemById = new Map(ITEMS.map((i) => [i.id, i]));
const labelById = new Map(LABELS.map((l) => [l.id, l]));
const npcById = new Map(NPCS.map((n) => [n.id, n]));

export const findItem = (id: string): Item | undefined => itemById.get(id);
export const findLabel = (id: string): Label | undefined => labelById.get(id);
export const findNpc = (id: string): Npc | undefined => npcById.get(id);

/** Lookup for ids that are already validated; throws on unknown ids. */
export const getItem = (id: string): Item => {
  const item = itemById.get(id);
  if (!item) throw new Error(`Unknown item id: ${id}`);
  return item;
};

export const LEGAL_ITEMS = ITEMS.filter((i) => !i.contraband);
export const CONTRABAND_ITEMS = ITEMS.filter((i) => i.contraband);

export const itemAssetName = (id: string): string => `item-${id}.svg`;
export const npcAssetName = (id: string): string => `npc-${id}.svg`;
