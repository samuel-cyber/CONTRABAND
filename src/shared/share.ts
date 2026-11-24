import { SHARE_MAX_CALLOUTS } from './balance';
import { formatShort } from './day';
import type { StampAction } from './scoring';

export type ShareStamp = { action: StampAction; correct: boolean };

export type ShareInput = {
  dayKey: string;
  profit: number;
  stamps: readonly ShareStamp[];
  /** Reddit usernames (no "u/") the officer correctly busted. NPCs excluded. */
  bustedUsernames: readonly string[];
};

/** "$1,750" / "-$250" with stable formatting on every platform. */
export const formatMoney = (amount: number): string => {
  const abs = String(Math.abs(Math.round(amount))).replace(
    /\B(?=(\d{3})+(?!\d))/g,
    ','
  );
  return `${amount < 0 ? '-' : ''}$${abs}`;
};

/** 🟩 correct PASS, 🟥 correct BUST, ⬛ a wrong call. */
export const stampEmoji = ({ action, correct }: ShareStamp): string =>
  !correct ? '⬛' : action === 'PASS' ? '🟩' : '🟥';

/** e.g. "CONTRABLUFF 21/11 🛃 $1,750 | 🟥🟩🟥🟩🟩 | busted u/pixelwizard 📦" */
export const buildShareText = (input: ShareInput): string => {
  const parts = [
    `CONTRABLUFF ${formatShort(input.dayKey)} 🛃 ${formatMoney(input.profit)}`,
    input.stamps.map(stampEmoji).join(''),
  ];
  const names = [...new Set(input.bustedUsernames)];
  if (names.length > 0) {
    const shown = names.slice(0, SHARE_MAX_CALLOUTS).map((n) => `u/${n}`);
    const extra = names.length - shown.length;
    parts.push(`busted ${shown.join(' ')}${extra > 0 ? ` +${extra}` : ''} 📦`);
  }
  return parts.join(' | ');
};
