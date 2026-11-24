import { useState } from 'react';
import type { Reveal, ShiftView, StateResponse } from '../../shared/api';
import { findItem } from '../../shared/catalog';
import type { DirectiveId } from '../../shared/directives';
import type { StampAction } from '../../shared/scoring';
import { formatMoney } from '../../shared/share';
import { BigButton } from '../components/Buttons';
import { DirectiveBadge } from '../components/DirectiveBadge';
import { ScreenTitle } from '../components/Header';
import { ItemCard } from '../components/ItemCard';
import { Passport } from '../components/Passport';
import { Suitcase } from '../components/Suitcase';
import { verdictLine } from './verdictCopy';

type Props = {
  state: StateResponse;
  shift: ShiftView;
  reveal: Reveal | null;
  pending: boolean;
  firstShift: boolean;
  onXray: () => Promise<void>;
  onStamp: (action: StampAction) => void;
  onNext: () => void;
};

const ProgressDots = ({ shift }: { shift: ShiftView }) => (
  <div
    className="flex shrink-0 gap-1.5"
    aria-label={`Bag ${Math.min(shift.step + 1, shift.total)} of ${shift.total}`}
  >
    {Array.from({ length: shift.total }, (_, i) => {
      const r = shift.reveals[i];
      const cls = r
        ? r.correct
          ? r.action === 'PASS'
            ? 'bg-clear'
            : 'bg-crimson'
          : 'bg-desk-3 ring-1 ring-manila/40'
        : i === shift.step
          ? 'bg-manila'
          : 'bg-desk-3';
      return <span key={i} className={`h-2.5 w-6 rounded-full ${cls}`} />;
    })}
  </div>
);

const RevealPanel = ({
  reveal,
  directiveId,
  firstShift,
}: {
  reveal: Reveal;
  directiveId: DirectiveId;
  firstShift: boolean;
}) => {
  const v = verdictLine(reveal);
  return (
    <div className="flex flex-col gap-3">
      <div className="text-center">
        <div
          className={`stamp-text inline-block -rotate-3 rounded-md border-4 px-3 py-1 text-2xl ${v.tone === 'good' ? 'border-clear text-clear' : 'border-crimson text-crimson'}`}
        >
          {v.title}
        </div>
        <div
          className={`mt-2 font-mono text-3xl font-bold ${reveal.officerDelta >= 0 ? 'text-phosphor' : 'text-crimson'}`}
        >
          {reveal.officerDelta >= 0 ? '+' : ''}
          {formatMoney(reveal.officerDelta)}
        </div>
        {firstShift && (
          <p className="mt-1 font-mono text-xs text-manila/70">{v.hint}</p>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {reveal.itemIds.map((id) => {
          const item = findItem(id);
          return item ? (
            <ItemCard
              key={id}
              item={item}
              size="sm"
              directiveId={directiveId}
            />
          ) : null;
        })}
      </div>
      <p className="text-center font-mono text-xs text-manila/70">
        {reveal.passport.kind === 'player'
          ? `u/${reveal.passport.username}`
          : 'This traveller'}
        {reveal.clean
          ? ' packed clean.'
          : ` carried ${formatMoney(reveal.contrabandValue)} of contraband.`}
      </p>
    </div>
  );
};

export const Booth = ({
  state,
  shift,
  reveal,
  pending,
  firstShift,
  onXray,
  onStamp,
  onNext,
}: Props) => {
  const [scanning, setScanning] = useState(false);
  const bag = shift.current;
  const shownIndex = reveal ? reveal.index : shift.step;
  const lastBag = reveal !== null && shift.step >= shift.total;

  const xray = async () => {
    setScanning(true);
    await onXray();
    setTimeout(() => setScanning(false), 450);
  };

  return (
    <div className="desk flex h-full flex-col px-4 pt-3 pb-4">
      <div className="flex shrink-0 flex-col gap-2">
        <ScreenTitle
          kicker="Phase 2 · Officer"
          title={`Bag ${Math.min(shownIndex + 1, shift.total)}/${shift.total}`}
          right={
            <div className="text-right">
              <div className="font-mono text-[11px] tracking-widest text-brass uppercase">
                Profit
              </div>
              <div
                className={`font-mono text-xl font-bold ${shift.profit >= 0 ? 'text-phosphor' : 'text-crimson'}`}
              >
                {formatMoney(shift.profit)}
              </div>
            </div>
          }
        />
        <div className="flex items-center justify-between gap-2">
          <ProgressDots shift={shift} />
          <div className="flex min-w-0 justify-end">
            <DirectiveBadge id={state.directiveId} compact />
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col justify-center gap-3 overflow-y-auto py-3">
        {reveal ? (
          <RevealPanel
            reveal={reveal}
            directiveId={state.directiveId}
            firstShift={firstShift}
          />
        ) : bag ? (
          <>
            <Passport
              passport={bag.passport}
              labelId={bag.labelId}
              weightGrams={bag.weightGrams}
            />
            <Suitcase xrayedItemIds={bag.xrayedItemIds} scanning={scanning} />
            {firstShift && shift.step === 0 && (
              <p className="text-center font-mono text-xs text-phosphor/90">
                X-ray peeks at one random item. Then stamp PASS or BUST.
              </p>
            )}
          </>
        ) : null}
      </div>

      <div className="shrink-0">
        {reveal ? (
          <BigButton onClick={onNext}>
            {lastBag ? 'Shift report' : 'Next traveller →'}
          </BigButton>
        ) : (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => void xray()}
              disabled={pending || shift.xraysLeft <= 0 || !bag}
              className={`press mx-auto flex min-h-11 cursor-pointer items-center gap-2 rounded-full border-2 border-phosphor bg-black/60 px-5 font-mono text-sm font-bold text-phosphor ${
                firstShift && shift.step === 0 && shift.xraysLeft > 0
                  ? 'hint-pulse'
                  : ''
              }`}
            >
              ☢ X-RAY{' '}
              <span className="rounded bg-phosphor/20 px-1.5">
                {shift.xraysLeft} left
              </span>
            </button>
            <div className="grid grid-cols-2 gap-3">
              <BigButton
                tone="pass"
                className="min-h-20 text-3xl"
                disabled={pending || !bag}
                onClick={() => onStamp('PASS')}
              >
                Pass
              </BigButton>
              <BigButton
                tone="bust"
                className="min-h-20 text-3xl"
                disabled={pending || !bag}
                onClick={() => onStamp('BUST')}
              >
                Bust
              </BigButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
