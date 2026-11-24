import { OFFICER, SMUGGLER } from './balance';
import { contrabandValue, type DirectiveId } from './directives';

export type StampAction = 'PASS' | 'BUST';

export const isStampAction = (value: unknown): value is StampAction =>
  value === 'PASS' || value === 'BUST';

export type InspectionResult = {
  clean: boolean;
  /** True when the officer made the right call. */
  correct: boolean;
  contrabandValue: number;
  officerDelta: number;
  smugglerDelta: number;
};

export const officerDelta = (value: number, action: StampAction): number => {
  const clean = value === 0;
  if (action === 'PASS')
    return clean ? OFFICER.passClean : OFFICER.passContraband;
  return clean ? OFFICER.bustClean : value;
};

export const smugglerDelta = (value: number, action: StampAction): number => {
  const clean = value === 0;
  if (action === 'PASS') {
    return clean
      ? SMUGGLER.cleanPassed
      : Math.round(value * SMUGGLER.contrabandPassedShare);
  }
  return clean ? SMUGGLER.cleanBusted : SMUGGLER.contrabandBusted;
};

/** Resolves one stamp on one bag. All values include the day's directive. */
export const resolveInspection = (
  itemIds: readonly string[],
  action: StampAction,
  directive: DirectiveId
): InspectionResult => {
  const value = contrabandValue(itemIds, directive);
  const clean = value === 0;
  return {
    clean,
    correct: clean ? action === 'PASS' : action === 'BUST',
    contrabandValue: value,
    officerDelta: officerDelta(value, action),
    smugglerDelta: smugglerDelta(value, action),
  };
};

export type ShiftOutcome = 'SHIFT_CLEARED' | 'DOCKED_PAY';

export const shiftOutcome = (profit: number): ShiftOutcome =>
  profit > 0 ? 'SHIFT_CLEARED' : 'DOCKED_PAY';
