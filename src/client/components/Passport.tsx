import type { Passport as PassportData } from '../../shared/api';
import { findLabel, findNpc } from '../../shared/catalog';
import { Avatar } from './Avatar';

const travellerName = (p: PassportData): string =>
  p.kind === 'player'
    ? `u/${p.username}`
    : (findNpc(p.npcId)?.name ?? 'Traveller');

export const HonestyPill = ({ passport }: { passport: PassportData }) => {
  const h = passport.honesty;
  const tone =
    h.kind === 'new'
      ? 'bg-ink/10 text-ink'
      : h.percent >= 60
        ? 'bg-clear/15 text-clear-dark'
        : h.percent >= 35
          ? 'bg-brass/25 text-ink'
          : 'bg-crimson/15 text-crimson-dark';
  return (
    <span
      className={`rounded-full px-2 py-0.5 font-mono text-[11px] font-bold ${tone}`}
    >
      {h.text}
    </span>
  );
};

type Props = {
  passport: PassportData;
  labelId: string;
  weightGrams?: number | null;
};

export const Passport = ({ passport, labelId, weightGrams = null }: Props) => {
  const npc = passport.kind === 'npc' ? findNpc(passport.npcId) : undefined;
  const label = findLabel(labelId)?.text ?? '…';
  return (
    <div className="paper relative w-full rounded-xl border-2 border-manila-3 p-3 shadow-[0_6px_0_rgb(0_0_0/0.35)]">
      <div className="mb-2 flex items-center justify-between border-b border-dashed border-ink/25 pb-1">
        <span className="stamp-text text-[11px] text-ink-soft">
          Travel document
        </span>
        <span className="font-mono text-[10px] text-ink-soft">CONTRABLUFF</span>
      </div>
      <div className="flex gap-3">
        <Avatar passport={passport} size={64} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-lg leading-tight font-bold">
              {travellerName(passport)}
            </span>
            {npc && (
              <span className="shrink-0 rounded bg-ink px-1 text-[10px] font-bold text-manila">
                NPC
              </span>
            )}
          </div>
          {npc && (
            <div className="truncate text-xs text-ink-soft">{npc.title}</div>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <HonestyPill passport={passport} />
            {weightGrams !== null && (
              <span className="rounded-full bg-ink px-2 py-0.5 font-mono text-[11px] font-bold text-manila">
                ⚖️ {weightGrams.toLocaleString('en-US')} g
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="mt-2 rounded-md bg-manila-2/70 px-2 py-1.5">
        <span className="stamp-text text-[10px] text-ink-soft">Declared:</span>{' '}
        <span className="font-mono text-sm font-bold">“{label}”</span>
      </div>
    </div>
  );
};
