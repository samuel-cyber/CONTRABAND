import './index.css';

import {
  context,
  requestExpandedMode,
  showLoginPrompt,
} from '@devvit/web/client';
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { StateResponse } from '../shared/api';
import { dayKey, dayKeyToDate } from '../shared/day';
import { DirectiveBadge } from './components/DirectiveBadge';

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
  const [state, setState] = useState<StateResponse | null>(null);

  useEffect(() => {
    fetch('/api/state')
      .then((r) => (r.ok ? r.json() : null))
      .then((s: StateResponse | null) => setState(s))
      .catch(() => setState(null));
  }, []);

  const day = state?.dayKey ?? dayKey();
  const loggedIn = isLoggedIn();
  const done = state?.phase === 'report';

  return (
    <div className="desk flex h-full flex-col items-center justify-center gap-3 overflow-hidden px-5 text-center">
      <div className="font-mono text-xs tracking-[0.3em] text-brass uppercase">
        Checkpoint · {prettyDate(day)}
      </div>
      <div className="stamp-text -rotate-3 rounded-md border-[5px] border-crimson px-4 py-1 text-4xl text-crimson sm:text-5xl">
        Contrabluff
      </div>
      {state && <DirectiveBadge id={state.directiveId} />}
      <p className="font-mono text-sm text-manila/80">
        {state
          ? `${state.bustedToday} smuggler${state.bustedToday === 1 ? '' : 's'} busted today`
          : 'Pack a bag. Inspect five strangers.'}
      </p>
      <button
        type="button"
        onClick={(e) =>
          loggedIn
            ? requestExpandedMode(e.nativeEvent, 'game')
            : showLoginPrompt()
        }
        className="press stamp-text min-h-16 w-full max-w-[280px] cursor-pointer rounded-xl bg-brass px-6 text-3xl text-desk shadow-[0_6px_0_#8a6d2c]"
      >
        {!loggedIn ? 'Log in to clock in' : done ? 'See my shift' : 'Clock in'}
      </button>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
