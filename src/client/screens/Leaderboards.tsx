import { useEffect, useState } from 'react';
import type { LeaderboardEntry, LeaderboardResponse } from '../../shared/api';
import { api, friendlyMessage } from '../api';
import { BigButton } from '../components/Buttons';
import { ScreenTitle } from '../components/Header';
import { Leaderboard } from '../components/Leaderboard';
import { formatMoney } from '../../shared/share';

type Tab = 'officer' | 'smuggler';

const MyRow = ({
  entry,
  inTop,
}: {
  entry: LeaderboardEntry | null;
  inTop: boolean;
}) =>
  entry && !inTop ? (
    <div className="mt-2 flex justify-between rounded border-t border-dashed border-ink/30 bg-brass/30 px-1 pt-1 font-mono text-sm font-bold">
      <span>
        {entry.rank}. u/{entry.username}
      </span>
      <span>{formatMoney(entry.score)}</span>
    </div>
  ) : null;

export const Leaderboards = ({
  me,
  onBack,
}: {
  me: string;
  onBack: () => void;
}) => {
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('officer');

  useEffect(() => {
    api
      .leaderboard()
      .then(setData)
      .catch((e: unknown) => setError(friendlyMessage(e)));
  }, []);

  const entries = data ? data[tab] : [];
  const mine = data
    ? tab === 'officer'
      ? data.myOfficer
      : data.mySmuggler
    : null;

  return (
    <div className="desk flex h-full flex-col gap-3 overflow-y-auto px-4 pt-4 pb-4">
      <ScreenTitle kicker="Today" title="Leaderboards" />
      <div className="grid grid-cols-2 gap-2" role="tablist">
        {(['officer', 'smuggler'] as const).map((t) => (
          <button
            key={t}
            role="tab"
            type="button"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`press stamp-text min-h-11 cursor-pointer rounded-lg text-sm ${tab === t ? 'bg-manila text-ink' : 'bg-desk-3 text-manila/80'}`}
          >
            {t === 'officer' ? '🛃 Officers' : '📦 Smugglers'}
          </button>
        ))}
      </div>
      <div className="paper rounded-xl p-3">
        <p className="mb-2 font-mono text-[11px] text-ink-soft">
          {tab === 'officer'
            ? "Ranked by today's shift profit."
            : "Ranked by Smuggler's Cut on bags packed today."}
        </p>
        {error ? (
          <p className="font-mono text-xs text-crimson">{error}</p>
        ) : !data ? (
          <p className="animate-pulse font-mono text-xs text-ink-soft">
            Fetching the ledger…
          </p>
        ) : (
          <>
            <Leaderboard
              entries={entries}
              me={me}
              empty="Nobody on the board yet. Be the first."
            />
            <MyRow
              entry={mine}
              inTop={entries.some((e) => e.username === me)}
            />
          </>
        )}
      </div>
      <div className="mt-auto">
        <BigButton tone="ghost" onClick={onBack}>
          ← Back to report
        </BigButton>
      </div>
    </div>
  );
};
