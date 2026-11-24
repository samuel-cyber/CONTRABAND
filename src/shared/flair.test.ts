import { describe, expect, it } from 'vitest';
import { flairFor } from './flair';

describe('flairFor', () => {
  it('returns null before any milestone', () => {
    expect(flairFor({ shifts: 1, bestStreak: 1, lifetimeCut: 0 })).toBeNull();
  });
  it('awards milestones in priority order', () => {
    expect(flairFor({ shifts: 3, bestStreak: 3, lifetimeCut: 0 })).toBe(
      '3-Day Shift Streak'
    );
    expect(flairFor({ shifts: 10, bestStreak: 3, lifetimeCut: 0 })).toBe(
      'Iron Stamp'
    );
    expect(flairFor({ shifts: 10, bestStreak: 7, lifetimeCut: 0 })).toBe(
      '7-Day Shift Streak'
    );
    expect(flairFor({ shifts: 1, bestStreak: 1, lifetimeCut: 5000 })).toBe(
      'Master Smuggler'
    );
  });
});
