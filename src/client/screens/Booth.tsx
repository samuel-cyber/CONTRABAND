import { useEffect, useRef, useState } from 'react';
import type {
  BagView,
  Reveal,
  ShiftView,
  StateResponse,
} from '../../shared/api';
import { findItem } from '../../shared/catalog';
import type { DirectiveId } from '../../shared/directives';
import type { StampAction } from '../../shared/scoring';
import { formatMoney } from '../../shared/share';
import { BigButton } from '../components/Buttons';
import { DirectiveBadge } from '../components/DirectiveBadge';
import { ScreenTitle } from '../components/Header';
import { ItemCard } from '../components/ItemCard';
import { Money } from '../components/Money';
import { Passport } from '../components/Passport';
import { StampFx } from '../components/StampFx';
import { Suitcase } from '../components/Suitcase';
import { sfx } from '../fx/audio';
import { shake, tilt } from '../fx/motion';
import { verdictLine } from './verdictCopy';

const STAMP_HOLD_MS = 320;

type Props = {
  state: StateResponse;
  shift: ShiftView;
  reveal: Reveal | null;
  pending: boolean;
  firstShift: boolean;
  onXray: () => Promise<void>;
  onStamp: (action: StampAction) => Promise<void>;
  onNext: () => void;
};

/** Snapshot of the bag being stamped, held on screen while the stamp lands. */
type StampMoment = {
  action: StampAction;
  rotation: number;
  bag: BagView;
  shiftBefore: ShiftView;
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
      return (
        <span
          key={i}
          className={`h-2.5 w-6 rounded-full transition-colors ${cls}`}
        />
      );
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
          className={`slam stamp-text inline-block rounded-md border-4 px-3 py-1 text-2xl ${v.tone === 'good' ? 'border-clear text-clear' : 'border-crimson text-crimson'}`}
        >
          {v.title}
        </div>
        <div
          className={`mt-2 font-mono text-3xl font-bold ${reveal.officerDelta >= 0 ? 'text-phosphor' : 'text-crimson'}`}
        >
          <Money value={reveal.officerDelta} initial={0} signed />
        </div>
        {firstShift && (
          <p className="mt-1 font-mono text-xs text-manila/70">{v.hint}</p>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {reveal.itemIds.map((id, i) => {
          const item = findItem(id);
          return item ? (
            <div
              key={id}
              className="spill"
              style={{ animationDelay: `${120 + i * 80}ms` }}
            >
              <ItemCard item={item} size="sm" directiveId={directiveId} />
            </div>
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
  const [moment, setMoment] = useState<StampMoment | null>(null);
  const [holding, setHolding] = useState(false);
  const timers = useRef<number[]>([]);
  const bag = shift.current;
  // The stamped bag stays on screen until the stamp has landed AND the
  // server has answered, so a slow response never flashes the old bag.
  const held = moment !== null && (holding || pending) ? moment : null;

  useEffect(() => {
    const list = timers.current;
    return () => list.forEach((t) => clearTimeout(t));
  }, []);

  // Result sound once the bag is open.
  const revealIndex = held ? null : (reveal?.index ?? null);
  useEffect(() => {
    if (revealIndex === null || !reveal) return;
    if (reveal.officerDelta > 0) sfx.register();
    else sfx.buzzer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealIndex]);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const xray = async () => {
    sfx.hum();
    setScanning(true);
    await onXray();
    later(() => setScanning(false), 450);
  };

  const stamp = (action: StampAction) => {
    if (!bag || pending || held) return;
    sfx.thunk();
    shake();
    setMoment({ action, rotation: tilt(8), bag, shiftBefore: shift });
    setHolding(true);
    later(() => setHolding(false), STAMP_HOLD_MS);
    void onStamp(action);
  };

  const headerShift = held ? held.shiftBefore : shift;
  const shownIndex = held ? held.bag.index : reveal ? reveal.index : shift.step;
  const lastBag = reveal !== null && shift.step >= shift.total;

  let middle = null;
  if (held) {
    middle = (
      <div key={`stamped-${held.bag.index}`} className="relative">
        <Passport
          passport={held.bag.passport}
          labelId={held.bag.labelId}
          weightGrams={held.bag.weightGrams}
        />
        <div className="mt-3">
          <Suitcase xrayedItemIds={held.bag.xrayedItemIds} />
        </div>
        <StampFx action={held.action} rotation={held.rotation} />
      </div>
    );
  } else if (reveal) {
    middle = (
      <RevealPanel
        reveal={reveal}
        directiveId={state.directiveId}
        firstShift={firstShift}
      />
    );
  } else if (bag) {
    middle = (
      <div key={`bag-${bag.index}`} className="conveyor-in flex flex-col gap-3">
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
      </div>
    );
  }

  return (
    <div className="desk flex h-full flex-col overflow-x-hidden px-4 pt-3 pb-4">
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
                className={`font-mono text-xl font-bold ${headerShift.profit >= 0 ? 'text-phosphor' : 'text-crimson'}`}
              >
                <Money value={headerShift.profit} />
              </div>
            </div>
          }
        />
        <div className="flex items-center justify-between gap-2">
          <ProgressDots shift={headerShift} />
          <div className="flex min-w-0 justify-end">
            <DirectiveBadge id={state.directiveId} compact />
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col justify-center gap-3 overflow-y-auto py-3">
        {middle}
      </div>

      <div className="shrink-0">
        {reveal && !held ? (
          <BigButton
            onClick={() => {
              sfx.click();
              onNext();
            }}
          >
            {lastBag ? 'Shift report' : 'Next traveller →'}
          </BigButton>
        ) : (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => void xray()}
              disabled={
                pending || shift.xraysLeft <= 0 || !bag || held !== null
              }
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
                disabled={pending || !bag || held !== null}
                onClick={() => stamp('PASS')}
              >
                Pass
              </BigButton>
              <BigButton
                tone="bust"
                className="min-h-20 text-3xl"
                disabled={pending || !bag || held !== null}
                onClick={() => stamp('BUST')}
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
