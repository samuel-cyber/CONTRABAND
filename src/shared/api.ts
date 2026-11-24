// Request/response contract between src/client and src/server.
// The client only sends intents (pack, xray, stamp); the server never sends
// bag contents before the bag is X-rayed (one item) or stamped (all items).

import type { DirectiveId } from './directives';
import type { HonestyBadge } from './reputation';
import type { InspectionResult, ShiftOutcome, StampAction } from './scoring';

export type ErrorResponse = { status: 'error'; message: string };

export type Passport =
  | {
      kind: 'player';
      username: string;
      snoovatarUrl: string | null;
      honesty: HonestyBadge;
    }
  | { kind: 'npc'; npcId: string; honesty: HonestyBadge };

/** A bag as the officer sees it before stamping. */
export type BagView = {
  index: number; // 0-based position in the shift
  passport: Passport;
  labelId: string;
  weightGrams: number | null; // only on Weight Check days
  xrayedItemIds: string[];
};

export type Reveal = InspectionResult & {
  index: number;
  action: StampAction;
  itemIds: string[];
};

export type ShiftView = {
  step: number; // bags stamped so far, 0..SHIFT_SIZE
  xraysLeft: number;
  profit: number;
  current: BagView | null; // null once the shift is finished
  reveals: Reveal[];
};

export type ShiftReport = {
  outcome: ShiftOutcome;
  profit: number;
  rank: number | null; // 1-based officer rank today
  reveals: Reveal[];
  bustedUsernames: string[];
  streak: number;
  shareText: string;
};

export type Verdict = {
  dayKey: string;
  passedBy: number;
  bustedBy: number;
  cut: number;
  bustedByNames: string[]; // max 3
};

export type LeaderboardEntry = {
  rank: number;
  username: string;
  score: number;
};

export type Phase = 'logged-out' | 'pack' | 'inspect' | 'report';

export type StateResponse = {
  type: 'state';
  dayKey: string;
  directiveId: DirectiveId;
  hand: string[];
  phase: Phase;
  me: { username: string; snoovatarUrl: string | null } | null;
  verdict: Verdict | null;
  shift: ShiftView | null;
  report: ShiftReport | null;
  bustedToday: number; // for the inline preview
  leaderboard: LeaderboardEntry[]; // top LEADERBOARD_PREVIEW_SIZE officers
};

export type PackRequest = { itemIds: string[]; labelId: string };
export type PackResponse = { type: 'pack'; shift: ShiftView };

export type XrayResponse = { type: 'xray'; itemId: string; xraysLeft: number };

export type StampRequest = { action: StampAction };
export type StampResponse = {
  type: 'stamp';
  reveal: Reveal;
  shift: ShiftView;
  report: ShiftReport | null; // set after the last bag
};

export type LeaderboardResponse = {
  type: 'leaderboard';
  officer: LeaderboardEntry[];
  smuggler: LeaderboardEntry[];
  myOfficerRank: number | null;
  mySmugglerRank: number | null;
};

// --- Template counter types: remove with the template demo code. ---

export type InitResponse = {
  type: 'init';
  postId: string;
  count: number;
  username: string;
};

export type IncrementResponse = {
  type: 'increment';
  postId: string;
  count: number;
};

export type DecrementResponse = {
  type: 'decrement';
  postId: string;
  count: number;
};
