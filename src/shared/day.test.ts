import { describe, expect, it } from 'vitest';
import {
  addDays,
  dayKey,
  daysBetween,
  formatShort,
  isDayKey,
  prevDayKey,
} from './day';

describe('day keys', () => {
  it('uses UTC', () => {
    expect(dayKey(new Date('2026-11-24T23:59:59Z'))).toBe('20261124');
    expect(dayKey(new Date('2026-11-25T00:00:00Z'))).toBe('20261125');
    expect(dayKey(new Date('2026-11-24T23:30:00-05:00'))).toBe('20261125');
  });
  it('does day arithmetic across month and year boundaries', () => {
    expect(prevDayKey('20260301')).toBe('20260228');
    expect(addDays('20261231', 1)).toBe('20270101');
    expect(daysBetween('20261130', '20261202')).toBe(2);
  });
  it('validates and formats', () => {
    expect(isDayKey('20261124')).toBe(true);
    expect(isDayKey('20261340')).toBe(false);
    expect(isDayKey('2026-11-24')).toBe(false);
    expect(formatShort('20261121')).toBe('21/11');
  });
});
