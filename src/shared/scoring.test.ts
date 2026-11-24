import { describe, expect, it } from 'vitest';
import { resolveInspection, shiftOutcome } from './scoring';

const CLEAN = ['socks', 'toothbrush', 'umbrella'];
const DIRTY = ['gold-watch', 'socks', 'paperback']; // 650 contraband
const TECH_DIRTY = ['gpu', 'prototype-phone', 'laptop']; // 1500, or 3000 on Tech Crackdown

describe('officer profit', () => {
  it('PASS clean = +100', () => {
    expect(resolveInspection(CLEAN, 'PASS', 'weight-check').officerDelta).toBe(
      100
    );
  });
  it('PASS contraband = -250', () => {
    expect(resolveInspection(DIRTY, 'PASS', 'weight-check').officerDelta).toBe(
      -250
    );
  });
  it('BUST contraband = + total contraband value', () => {
    expect(resolveInspection(DIRTY, 'BUST', 'weight-check').officerDelta).toBe(
      650
    );
  });
  it('BUST clean = -300', () => {
    expect(resolveInspection(CLEAN, 'BUST', 'weight-check').officerDelta).toBe(
      -300
    );
  });
  it('Tech Crackdown doubles the bust payout for tech contraband', () => {
    expect(
      resolveInspection(TECH_DIRTY, 'BUST', 'double-scan').officerDelta
    ).toBe(1500);
    expect(
      resolveInspection(TECH_DIRTY, 'BUST', 'tech-crackdown').officerDelta
    ).toBe(3000);
  });
  it('Tech Crackdown does not change flat outcomes', () => {
    expect(
      resolveInspection(TECH_DIRTY, 'PASS', 'tech-crackdown').officerDelta
    ).toBe(-250);
    expect(
      resolveInspection(
        ['laptop', 'headphones', 'socks'],
        'BUST',
        'tech-crackdown'
      ).officerDelta
    ).toBe(-300);
  });
});

describe("smuggler's cut", () => {
  it('contraband PASSED = +25% of contraband value', () => {
    expect(resolveInspection(DIRTY, 'PASS', 'weight-check').smugglerDelta).toBe(
      163
    ); // 162.5 rounded
    expect(
      resolveInspection(TECH_DIRTY, 'PASS', 'weight-check').smugglerDelta
    ).toBe(375);
  });
  it('Tech Crackdown doubles the smuggler cut for tech contraband', () => {
    expect(
      resolveInspection(TECH_DIRTY, 'PASS', 'tech-crackdown').smugglerDelta
    ).toBe(750);
  });
  it('contraband BUSTED = -100', () => {
    expect(resolveInspection(DIRTY, 'BUST', 'weight-check').smugglerDelta).toBe(
      -100
    );
  });
  it('clean BUSTED = +200', () => {
    expect(resolveInspection(CLEAN, 'BUST', 'weight-check').smugglerDelta).toBe(
      200
    );
  });
  it('clean PASSED = +25', () => {
    expect(resolveInspection(CLEAN, 'PASS', 'weight-check').smugglerDelta).toBe(
      25
    );
  });
});

describe('inspection result', () => {
  it('marks correctness and cleanliness', () => {
    expect(resolveInspection(CLEAN, 'PASS', 'double-scan')).toMatchObject({
      clean: true,
      correct: true,
      contrabandValue: 0,
    });
    expect(resolveInspection(CLEAN, 'BUST', 'double-scan')).toMatchObject({
      clean: true,
      correct: false,
    });
    expect(resolveInspection(DIRTY, 'BUST', 'double-scan')).toMatchObject({
      clean: false,
      correct: true,
      contrabandValue: 650,
    });
    expect(resolveInspection(DIRTY, 'PASS', 'double-scan')).toMatchObject({
      clean: false,
      correct: false,
    });
  });
});

describe('shiftOutcome', () => {
  it('clears only on positive profit', () => {
    expect(shiftOutcome(1)).toBe('SHIFT_CLEARED');
    expect(shiftOutcome(0)).toBe('DOCKED_PAY');
    expect(shiftOutcome(-550)).toBe('DOCKED_PAY');
  });
});
