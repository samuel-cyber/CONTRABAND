import { navigateTo } from '@devvit/web/client';
import { useEffect, useState } from 'react';
import type { DayResultsResponse } from '../../shared/api';
import { dayKeyToDate } from '../../shared/day';
import { formatMoney } from '../../shared/share';
import { api, friendlyMessage } from '../api';
import { BigButton } from '../components/Buttons';
import { ScreenTitle } from '../components/Header';
import { Leaderboard } from '../components/Leaderboard';

const prettyDate = (key: string) =>
  dayKeyToDate(key).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });

export const OldPost = ({
  dayKey,
  me,
  todayPostUrl,
}: {
  dayKey: string;
  me: string | null;
  todayPostUrl: string;
}) => {
  const [data, setData] = useState<DayResultsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .day(dayKey)
      .then(setData)
      .catch((e: unknown) => setError(friendlyMessage(e)));
  }, [dayKey]);

  return (
    <div className="desk flex h-full flex-col gap-3 overflow-y-auto px-4 pt-4 pb-4">
      <ScreenTitle
        kicker={`Checkpoint · ${prettyDate(dayKey)}`}
        title="Checkpoint closed"
      />
      <div className="paper flex flex-col gap-2 rounded-xl p-3">
        {error ? (
          <p className="font-mono text-xs text-crimson">{error}</p>
        ) : !data ? (
          <p className="animate-pulse font-mono text-xs text-ink-soft">
            Pulling the old ledger…
          </p>
        ) : (
          <>
            {(data.myProfit !== null || data.myBag) && (
              <div className="rounded-md bg-manila-2 p-2 font-mono text-xs">
                {data.myProfit !== null && (
                  <div>
                    Your shift: <b>{formatMoney(data.myProfit)}</b>
                  </div>
                )}
                {data.myBag && (
                  <div>
                    Your bag: passed {data.myBag.passedBy}, busted{' '}
                    {data.myBag.bustedBy}, cut{' '}
                    <b>{formatMoney(data.myBag.cut)}</b>
                  </div>
                )}
              </div>
            )}
            <div className="stamp-text text-sm text-ink-soft">Top officers</div>
            <Leaderboard
              entries={data.officer}
              me={me}
              empty="Nobody clocked in that day."
            />
            <div className="stamp-text mt-1 text-sm text-ink-soft">
              Top smugglers
            </div>
            <Leaderboard
              entries={data.smuggler}
              me={me}
              empty="No smugglers that day."
            />
          </>
        )}
      </div>
      <div className="mt-auto">
        <BigButton onClick={() => navigateTo(todayPostUrl)}>
          Today's checkpoint →
        </BigButton>
      </div>
    </div>
  );
};
