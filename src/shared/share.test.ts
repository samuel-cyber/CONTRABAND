import { describe, expect, it } from 'vitest';
import { buildShareText, formatMoney } from './share';

describe('formatMoney', () => {
  it('formats with commas and sign', () => {
    expect(formatMoney(1750)).toBe('$1,750');
    expect(formatMoney(-250)).toBe('-$250');
    expect(formatMoney(0)).toBe('$0');
    expect(formatMoney(1234567)).toBe('$1,234,567');
  });
});

describe('buildShareText', () => {
  it('matches the spec format', () => {
    expect(
      buildShareText({
        dayKey: '20261121',
        profit: 1750,
        stamps: [
          { action: 'BUST', correct: true },
          { action: 'PASS', correct: true },
          { action: 'BUST', correct: true },
          { action: 'PASS', correct: true },
          { action: 'PASS', correct: true },
        ],
        bustedUsernames: ['pixelwizard'],
      })
    ).toBe(
      'CONTRABLUFF 21/11 🛃 $1,750 | 🟥🟩🟥🟩🟩 | busted u/pixelwizard 📦'
    );
  });

  it('marks wrong calls and omits callouts when nobody was busted', () => {
    expect(
      buildShareText({
        dayKey: '20261124',
        profit: -550,
        stamps: [
          { action: 'PASS', correct: false },
          { action: 'BUST', correct: false },
        ],
        bustedUsernames: [],
      })
    ).toBe('CONTRABLUFF 24/11 🛃 -$550 | ⬛⬛');
  });

  it('caps callouts at 2 and dedupes', () => {
    const text = buildShareText({
      dayKey: '20261124',
      profit: 100,
      stamps: [],
      bustedUsernames: ['a', 'b', 'a', 'c', 'd'],
    });
    expect(text.endsWith('busted u/a u/b +2 📦')).toBe(true);
  });
});
