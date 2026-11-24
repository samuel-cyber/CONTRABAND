import { useState } from 'react';
import type { StateResponse } from '../../shared/api';
import { BAG_SIZE } from '../../shared/balance';
import { findItem, getItem, LABELS } from '../../shared/catalog';
import { createRng } from '../../shared/rng';
import { BigButton } from '../components/Buttons';
import { DirectiveBadge } from '../components/DirectiveBadge';
import { ScreenTitle } from '../components/Header';
import { ItemCard } from '../components/ItemCard';

type Props = {
  state: StateResponse;
  pending: boolean;
  firstShift: boolean;
  onSeal: (itemIds: string[], labelId: string) => void;
};

export const PackDesk = ({ state, pending, firstShift, onSeal }: Props) => {
  const [picked, setPicked] = useState<string[]>([]);
  // Start the label wheel somewhere different each day.
  const [labelIndex, setLabelIndex] = useState(() =>
    createRng(state.dayKey).int(0, LABELS.length - 1)
  );
  const label = LABELS[labelIndex] ?? LABELS[0];
  const full = picked.length === BAG_SIZE;

  const toggle = (id: string) =>
    setPicked((p) =>
      p.includes(id)
        ? p.filter((x) => x !== id)
        : p.length < BAG_SIZE
          ? [...p, id]
          : p
    );
  const cycle = (dir: 1 | -1) =>
    setLabelIndex((i) => (i + dir + LABELS.length) % LABELS.length);
  const contraband = picked.filter((id) => getItem(id).contraband).length;

  return (
    <div className="desk flex h-full flex-col gap-2.5 overflow-y-auto px-4 pt-3 pb-3">
      <ScreenTitle
        kicker="Phase 1 · Smuggler"
        title="Pack your bag"
        right={
          <span className="font-mono text-sm text-manila/70">
            {picked.length}/{BAG_SIZE}
          </span>
        }
      />
      <DirectiveBadge id={state.directiveId} />

      <div className="grid grid-cols-3 gap-2">
        {state.hand.map((id, i) => {
          const item = findItem(id);
          if (!item) return null;
          const selected = picked.includes(id);
          return (
            <ItemCard
              key={id}
              item={item}
              size="sm"
              directiveId={state.directiveId}
              selected={selected}
              dimmed={full && !selected}
              pulse={firstShift && picked.length === 0 && i === 0}
              onClick={() => toggle(id)}
            />
          );
        })}
      </div>

      <div className="rounded-xl border-4 border-leather-dark bg-leather p-2 shadow-[0_6px_0_rgb(0_0_0/0.4)]">
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: BAG_SIZE }, (_, i) => {
            const item = picked[i] ? findItem(picked[i] ?? '') : undefined;
            return (
              <div
                key={i}
                className="grid h-11 place-items-center rounded-md border-2 border-dashed border-manila/30 bg-leather-dark/60"
              >
                <span className="text-2xl">{item?.icon ?? ''}</span>
              </div>
            );
          })}
        </div>
        <p className="mt-1 text-center font-mono text-[11px] text-manila/80">
          {picked.length === 0
            ? 'Tap 3 items. Pack clean, or risk it.'
            : contraband === 0
              ? full
                ? 'Clean bag. Officers who bust you pay for it.'
                : 'Clean so far.'
              : `${contraband} contraband aboard. Hope they PASS you.`}
        </p>
      </div>

      <div>
        <div className="mb-1 font-mono text-[11px] tracking-widest text-brass uppercase">
          Your label
        </div>
        <div className="flex items-stretch gap-2">
          <button
            type="button"
            aria-label="Previous label"
            onClick={() => cycle(-1)}
            className="press w-11 shrink-0 cursor-pointer rounded-lg bg-desk-3 text-2xl text-manila"
          >
            ‹
          </button>
          <div className="paper flex min-h-11 flex-1 items-center justify-center rounded-lg px-2 text-center font-mono text-sm font-bold">
            “{label?.text}”
          </div>
          <button
            type="button"
            aria-label="Next label"
            onClick={() => cycle(1)}
            className="press w-11 shrink-0 cursor-pointer rounded-lg bg-desk-3 text-2xl text-manila"
          >
            ›
          </button>
        </div>
      </div>

      <div className="mt-auto">
        <BigButton
          disabled={!full || pending || !label}
          onClick={() => label && onSeal(picked, label.id)}
        >
          {pending
            ? 'Sealing…'
            : full
              ? 'Seal bag & clock in'
              : `Pick ${BAG_SIZE - picked.length} more`}
        </BigButton>
      </div>
    </div>
  );
};
