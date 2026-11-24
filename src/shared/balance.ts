// Every tunable number in CONTRABLUFF lives here, so balancing is one file.

export const SHIFT_SIZE = 5;
export const BAG_SIZE = 3;
export const HAND_SIZE = 5;

// Hand composition. A hand needs at least BAG_SIZE legal items, or nobody can
// pack a clean bag that day (that would break bluffing and the honesty badge).
export const MIN_LEGAL_IN_HAND = 3;
export const MIN_CONTRABAND_IN_HAND = 2;

export const BASE_XRAYS = 1;
export const DOUBLE_SCAN_XRAYS = 2;
export const TECH_MULTIPLIER = 2;

// Officer profit per stamp. BUST on a dirty bag pays its contraband value.
export const OFFICER = {
  passClean: 100,
  passContraband: -250,
  bustClean: -300,
} as const;

// Smuggler's Cut, credited to the packer every time their bag is inspected.
export const SMUGGLER = {
  contrabandPassedShare: 0.25, // share of the bag's contraband value
  contrabandBusted: -100,
  cleanBusted: 200,
  cleanPassed: 25,
} as const;

// Catalogue value ranges (validated by tests).
export const CONTRABAND_VALUE_RANGE = { min: 300, max: 900 } as const;
export const LEGAL_VALUE_RANGE = { min: 20, max: 80 } as const;

// Reputation
export const HONESTY_WINDOW_DAYS = 7;
export const HONESTY_MIN_BAGS = 2;

// Share card
export const SHARE_MAX_CALLOUTS = 2;

// Storage
export const DAY_KEY_TTL_SECONDS = 9 * 24 * 60 * 60;
export const LEADERBOARD_PREVIEW_SIZE = 5;
export const LEADERBOARD_SIZE = 10;
