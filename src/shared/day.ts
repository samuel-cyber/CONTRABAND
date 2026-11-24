// Day keys are YYYYMMDD in UTC. A new day starts at 00:00 UTC.

const DAY_MS = 24 * 60 * 60 * 1000;
const DAY_KEY_RE = /^\d{8}$/;

const pad = (n: number, width = 2) => String(n).padStart(width, '0');

export const dayKey = (date: Date = new Date()): string =>
  `${pad(date.getUTCFullYear(), 4)}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}`;

export const isDayKey = (value: unknown): value is string => {
  if (typeof value !== 'string' || !DAY_KEY_RE.test(value)) return false;
  return dayKey(dayKeyToDate(value)) === value;
};

/** Midnight UTC of the given day. */
export const dayKeyToDate = (key: string): Date =>
  new Date(
    Date.UTC(
      Number(key.slice(0, 4)),
      Number(key.slice(4, 6)) - 1,
      Number(key.slice(6, 8))
    )
  );

export const addDays = (key: string, days: number): string =>
  dayKey(new Date(dayKeyToDate(key).getTime() + days * DAY_MS));

export const prevDayKey = (key: string): string => addDays(key, -1);

/** Whole days from `a` to `b` (positive when b is later). */
export const daysBetween = (a: string, b: string): number =>
  Math.round((dayKeyToDate(b).getTime() - dayKeyToDate(a).getTime()) / DAY_MS);

/** "21/11" style short date, used on the share card. */
export const formatShort = (key: string): string =>
  `${key.slice(6, 8)}/${key.slice(4, 6)}`;
