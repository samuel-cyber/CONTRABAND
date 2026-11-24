import { describe, expect, it } from 'vitest';
import { honestyBadge, nextStreak, staleHistoryKeys } from './reputation';

const TODAY = '20261124';

describe('honestyBadge', () => {
  it('shows New Traveler with fewer than 2 bags', () => {
    expect(honestyBadge({}, TODAY)).toEqual({
      kind: 'new',
      text: 'New Traveler',
    });
    expect(honestyBadge({ '20261124': 'clean' }, TODAY).kind).toBe('new');
  });

  it('rates the share of clean bags in the last 7 days', () => {
    expect(
      honestyBadge(
        {
          '20261124': 'clean',
          '20261123': 'dirty',
          '20261122': 'dirty',
          '20261120': 'clean',
          '20261119': 'dirty',
        },
        TODAY
      )
    ).toEqual({ kind: 'rated', percent: 40, text: '40% Honest' });
    expect(
      honestyBadge({ '20261124': 'clean', '20261118': 'clean' }, TODAY).text
    ).toBe('100% Honest');
    expect(
      honestyBadge({ '20261124': 'dirty', '20261123': 'dirty' }, TODAY).text
    ).toBe('0% Honest');
  });

  it('ignores bags older than 7 days and future days', () => {
    // 20261117 is 7 days ago: outside a 7-day window that includes today.
    expect(
      honestyBadge({ '20261124': 'clean', '20261117': 'dirty' }, TODAY).kind
    ).toBe('new');
    expect(
      honestyBadge({ '20261124': 'clean', '20261125': 'dirty' }, TODAY).kind
    ).toBe('new');
  });

  it('lists stale keys for pruning', () => {
    expect(
      staleHistoryKeys(
        { '20261124': 'clean', '20261117': 'dirty', '20261101': 'clean' },
        TODAY
      ).sort()
    ).toEqual(['20261101', '20261117']);
  });
});

describe('nextStreak', () => {
  it('starts at 1', () => {
    expect(nextStreak(null, TODAY)).toEqual({
      streak: 1,
      best: 1,
      lastPlayedDay: TODAY,
    });
  });
  it('extends on consecutive days, including across months', () => {
    expect(
      nextStreak({ streak: 3, best: 3, lastPlayedDay: '20261123' }, TODAY)
    ).toEqual({ streak: 4, best: 4, lastPlayedDay: TODAY });
    expect(
      nextStreak({ streak: 1, best: 5, lastPlayedDay: '20261130' }, '20261201')
        .streak
    ).toBe(2);
  });
  it('resets after a gap but keeps best', () => {
    expect(
      nextStreak({ streak: 6, best: 6, lastPlayedDay: '20261121' }, TODAY)
    ).toEqual({ streak: 1, best: 6, lastPlayedDay: TODAY });
  });
  it('does not double-count the same day', () => {
    const s = { streak: 2, best: 4, lastPlayedDay: TODAY };
    expect(nextStreak(s, TODAY)).toBe(s);
  });
});
