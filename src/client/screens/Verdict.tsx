import type { Verdict as VerdictData } from '../../shared/api';
import { findItem, findLabel } from '../../shared/catalog';
import { formatMoney } from '../../shared/share';
import { BigButton } from '../components/Buttons';
import { ScreenTitle } from '../components/Header';

const names = (list: string[]) => list.map((n) => `u/${n}`).join(', ');

export const Verdict = ({
  verdict,
  onContinue,
}: {
  verdict: VerdictData;
  onContinue: () => void;
}) => {
  const inspected = verdict.passedBy + verdict.bustedBy;
  const baited = verdict.clean && verdict.bustedBy > 0;
  const headline =
    inspected === 0
      ? 'Still in the queue'
      : verdict.clean
        ? baited
          ? 'You baited them'
          : 'Clean and waved through'
        : verdict.passedBy > verdict.bustedBy
          ? 'You got away with it'
          : 'Caught red-handed';
  const good = inspected === 0 || verdict.cut >= 0;

  return (
    <div className="desk flex h-full flex-col gap-3 overflow-y-auto px-4 pt-4 pb-4">
      <ScreenTitle kicker="Yesterday's verdict" title="Your bag's fate" />
      <div className="paper flex flex-col items-center gap-3 rounded-xl border-2 border-manila-3 p-4 text-center shadow-[0_6px_0_rgb(0_0_0/0.35)]">
        <div className="flex gap-2 text-4xl" aria-label="Your bag">
          {verdict.itemIds.map((id) => (
            <span key={id}>{findItem(id)?.icon}</span>
          ))}
        </div>
        <div className="font-mono text-xs text-ink-soft">
          “{findLabel(verdict.labelId)?.text}”
        </div>
        <div
          className={`stamp-text -rotate-3 rounded-md border-4 px-3 py-1 text-2xl ${good ? 'border-clear text-clear' : 'border-crimson text-crimson'}`}
        >
          {headline}
        </div>
        {inspected === 0 ? (
          <p className="font-mono text-sm">
            Nobody reached your bag yet. It's still in today's queue.
          </p>
        ) : (
          <>
            <p className="font-mono text-sm">
              Passed by <b>{verdict.passedBy}</b>, busted by{' '}
              <b>{verdict.bustedBy}</b>.
            </p>
            <div className="font-mono text-xs text-ink-soft">
              Smuggler's Cut
            </div>
            <div
              className={`-mt-2 font-mono text-3xl font-bold ${verdict.cut >= 0 ? 'text-clear-dark' : 'text-crimson'}`}
            >
              {verdict.cut >= 0 ? '+' : ''}
              {formatMoney(verdict.cut)}
            </div>
            {verdict.bustedByNames.length > 0 && (
              <p className="font-mono text-xs">
                {baited ? 'Fell for it: ' : 'Busted by '}
                {names(verdict.bustedByNames)}
              </p>
            )}
          </>
        )}
      </div>
      <div className="mt-auto">
        <BigButton onClick={onContinue}>Clock in</BigButton>
      </div>
    </div>
  );
};
