import type { LeaderboardEntry, ShiftReport, Verdict } from '../../shared/api';
import { Countdown } from '../components/Countdown';
import { Leaderboard } from '../components/Leaderboard';
import { formatMoney, stampEmoji } from '../../shared/share';
import { BigButton } from '../components/Buttons';
import { ScreenTitle } from '../components/Header';
import { useEffect } from 'react';
import { Money } from '../components/Money';
import { sfx } from '../fx/audio';
import { shake } from '../fx/motion';
import { shareResult } from '../share';

type Props = {
  report: ShiftReport;
  leaderboard: LeaderboardEntry[];
  me: string | null;
  verdict: Verdict | null;
  nextDayAt: number;
  onNewDay: () => void;
  onLeaderboards: () => void;
};

export const Report = ({
  report,
  leaderboard,
  me,
  verdict,
  nextDayAt,
  onNewDay,
  onLeaderboards,
}: Props) => {
  const cleared = report.outcome === 'SHIFT_CLEARED';
  useEffect(() => {
    const id = setTimeout(() => {
      shake(8);
      if (cleared) sfx.fanfare();
      else sfx.buzzer();
    }, 300);
    return () => clearTimeout(id);
  }, [cleared]);
  return (
    <div className="desk flex h-full flex-col gap-3 overflow-x-hidden overflow-y-auto px-4 pt-4 pb-4">
      <ScreenTitle kicker="Shift report" title="End of shift" />
      <div className="paper flex flex-col items-center gap-2 rounded-xl border-2 border-manila-3 p-4 shadow-[0_6px_0_rgb(0_0_0/0.35)]">
        <div
          className={`slam stamp-text rounded-md border-[5px] px-4 py-1 text-3xl ${cleared ? 'border-clear text-clear' : 'border-crimson text-crimson'}`}
        >
          {cleared ? 'Shift cleared' : 'Docked pay'}
        </div>
        <div
          className={`font-mono text-4xl font-bold ${report.profit >= 0 ? 'text-clear-dark' : 'text-crimson'}`}
        >
          <Money value={report.profit} initial={0} />
        </div>
        <div className="text-2xl tracking-widest" aria-label="Stamp results">
          {report.reveals.map((r) => stampEmoji(r)).join('')}
        </div>
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 font-mono text-xs text-ink-soft">
          {report.rank !== null && <span>#{report.rank} officer today</span>}
          <span>🔥 {report.streak}-day streak</span>
        </div>
        {report.bustedUsernames.length > 0 && (
          <p className="text-center font-mono text-xs">
            Busted: {report.bustedUsernames.map((n) => `u/${n}`).join(', ')}
          </p>
        )}
      </div>

      <BigButton onClick={() => void shareResult(report.shareText)}>
        Share result 📋
      </BigButton>
      <p className="-mt-1 text-center font-mono text-[11px] break-words text-manila/60 select-text">
        {report.shareText}
      </p>

      <div className="paper rounded-xl p-3">
        <div className="stamp-text mb-1 text-sm text-ink-soft">
          Top officers today
        </div>
        <Leaderboard
          entries={leaderboard}
          me={me}
          empty="No one else has clocked out yet."
        />
        <button
          type="button"
          onClick={onLeaderboards}
          className="press mt-2 w-full cursor-pointer rounded-md bg-ink py-2 font-mono text-xs font-bold text-manila"
        >
          Full leaderboards →
        </button>
      </div>

      {verdict && (
        <p className="text-center font-mono text-xs text-manila/80">
          Yesterday's bag: passed {verdict.passedBy}, busted {verdict.bustedBy},
          cut {formatMoney(verdict.cut)}.
        </p>
      )}
      <div className="rounded-xl border-2 border-dashed border-manila/25 p-3 text-center">
        <div className="font-mono text-[11px] tracking-widest text-brass uppercase">
          Next checkpoint opens in
        </div>
        <div className="text-2xl text-manila">
          <Countdown to={nextDayAt} onDone={onNewDay} />
        </div>
        <p className="mt-1 font-mono text-xs text-manila/70">
          Come back tomorrow for your bag's verdict.
        </p>
      </div>
    </div>
  );
};
