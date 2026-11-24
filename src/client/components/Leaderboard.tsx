import type { LeaderboardEntry } from '../../shared/api';
import { formatMoney } from '../../shared/share';

export const Leaderboard = ({
  entries,
  me,
  empty,
}: {
  entries: LeaderboardEntry[];
  me: string | null;
  empty: string;
}) =>
  entries.length === 0 ? (
    <p className="font-mono text-xs text-ink-soft">{empty}</p>
  ) : (
    <ol className="flex flex-col gap-0.5 font-mono text-sm">
      {entries.map((e) => (
        <li
          key={`${e.rank}-${e.username}`}
          className={`flex justify-between gap-2 rounded px-1 ${e.username === me ? 'bg-brass/30 font-bold' : ''}`}
        >
          <span className="truncate">
            {e.rank}. u/{e.username}
          </span>
          <span className="shrink-0">{formatMoney(e.score)}</span>
        </li>
      ))}
    </ol>
  );
