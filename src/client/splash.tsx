import './index.css';

import {
  context,
  navigateTo,
  requestExpandedMode,
  showLoginPrompt,
} from '@devvit/web/client';
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { SplashResponse } from '../shared/api';
import { dayKey, dayKeyToDate } from '../shared/day';
import { DirectiveBadge } from './components/DirectiveBadge';
import { isOldPost, postDayKey } from './postDay';

const prettyDate = (key: string) =>
  dayKeyToDate(key).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });

const isLoggedIn = (): boolean => {
  try {
    return Boolean(context.userId);
  } catch {
    return true; // let the game screen handle it
  }
};

export const Splash = () => {
  const [state, setState] = useState<SplashResponse | null>(null);

  useEffect(() => {
    fetch('/api/splash')
      .then((r) => (r.ok ? r.json() : null))
      .then((s: SplashResponse | null) => setState(s))
      .catch(() => setState(null));
  }, []);

  const closed = state !== null && isOldPost(state.dayKey, state.todayPostUrl);
  const day = closed ? (postDayKey() ?? dayKey()) : (state?.dayKey ?? dayKey());
  const loggedIn = isLoggedIn();
  const done = state?.playedToday ?? false;

  return (
    <div className="desk flex h-full flex-col items-center justify-center gap-3 overflow-hidden px-5 text-center">
      <div className="font-mono text-xs tracking-[0.3em] text-brass uppercase">
        Checkpoint · {prettyDate(day)}
      </div>
      <div className="stamp-text -rotate-3 rounded-md border-[5px] border-crimson px-4 py-1 text-4xl text-crimson sm:text-5xl">
        Contrabluff
      </div>
      {state && !closed && <DirectiveBadge id={state.directiveId} />}
      {closed && (
        <div className="stamp-text rounded border-2 border-manila/40 px-2 py-0.5 text-sm text-manila/80">
          Checkpoint closed
        </div>
      )}
      <p className="font-mono text-sm text-manila/80">
        {closed
          ? "See how this day ended, then head to today's checkpoint."
          : state
            ? `${state.bustedToday} smuggler${state.bustedToday === 1 ? '' : 's'} busted today`
            : 'Pack a bag. Inspect five strangers.'}
      </p>
      <button
        type="button"
        onClick={(e) =>
          loggedIn || closed
            ? requestExpandedMode(e.nativeEvent, 'game')
            : showLoginPrompt()
        }
        className="press stamp-text min-h-16 w-full max-w-[280px] cursor-pointer rounded-xl bg-brass px-6 text-3xl text-desk shadow-[0_6px_0_#8a6d2c]"
      >
        {closed
          ? 'See results'
          : !loggedIn
            ? 'Log in to clock in'
            : done
              ? 'See my shift'
              : 'Clock in'}
      </button>
      {closed && state?.todayPostUrl && (
        <button
          type="button"
          onClick={() => state.todayPostUrl && navigateTo(state.todayPostUrl)}
          className="press min-h-11 cursor-pointer font-mono text-sm text-brass underline underline-offset-4"
        >
          Go to today&apos;s checkpoint →
        </button>
      )}
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
