import './index.css';

import { StrictMode, useEffect, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { BigButton } from './components/Buttons';
import { useGame } from './state/useGame';
import { Booth } from './screens/Booth';
import { LoggedOut } from './screens/LoggedOut';
import { PackDesk } from './screens/PackDesk';
import { Leaderboards } from './screens/Leaderboards';
import { Report } from './screens/Report';
import { Verdict } from './screens/Verdict';

const Centered = ({ children }: { children: ReactNode }) => (
  <div className="desk flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
    {children}
  </div>
);

export const App = () => {
  const game = useGame();
  const [verdictSeen, setVerdictSeen] = useState(false);
  const [boards, setBoards] = useState(false);
  const { state, reveal, error } = game;
  const phase = state?.phase;
  const reportReady = phase === 'report' && reveal === null;

  // Refresh once the player reaches the report so the leaderboard includes them.
  useEffect(() => {
    if (reportReady) void game.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportReady]);

  if (!state) {
    return (
      <Centered>
        {error ? (
          <>
            <p className="font-mono text-sm text-manila/80">{error}</p>
            <div className="w-48">
              <BigButton onClick={() => void game.refresh()}>Retry</BigButton>
            </div>
          </>
        ) : (
          <p className="stamp-text animate-pulse text-2xl text-brass">
            Opening the checkpoint…
          </p>
        )}
      </Centered>
    );
  }

  const firstShift = state.me?.firstShift ?? false;
  let screen: ReactNode;
  if (phase === 'logged-out' || !state.me) {
    screen = <LoggedOut state={state} />;
  } else if (phase === 'pack' && state.verdict && !verdictSeen) {
    screen = (
      <Verdict
        verdict={state.verdict}
        onContinue={() => setVerdictSeen(true)}
      />
    );
  } else if (phase === 'pack') {
    screen = (
      <PackDesk
        state={state}
        pending={game.pending}
        firstShift={firstShift}
        onSeal={(ids, label) => void game.pack(ids, label)}
      />
    );
  } else if ((phase === 'inspect' || reveal) && state.shift) {
    screen = (
      <Booth
        state={state}
        shift={state.shift}
        reveal={reveal}
        pending={game.pending}
        firstShift={firstShift}
        onXray={game.xray}
        onStamp={(a) => void game.stamp(a)}
        onNext={game.next}
      />
    );
  } else if (state.report && boards) {
    screen = (
      <Leaderboards me={state.me.username} onBack={() => setBoards(false)} />
    );
  } else if (state.report) {
    screen = (
      <Report
        report={state.report}
        leaderboard={state.leaderboard}
        me={state.me.username}
        verdict={state.verdict}
        onLeaderboards={() => setBoards(true)}
      />
    );
  } else {
    screen = (
      <Centered>
        <p className="font-mono text-sm text-manila/80">
          Your shift is wrapping up…
        </p>
        <div className="w-48">
          <BigButton onClick={() => void game.refresh()}>Refresh</BigButton>
        </div>
      </Centered>
    );
  }

  return (
    <div className="relative mx-auto h-full max-w-[480px]">
      {screen}
      {error && (
        <div
          role="alert"
          className="absolute inset-x-3 top-3 z-20 flex items-center gap-2 rounded-lg bg-crimson px-3 py-2 text-manila shadow-lg"
        >
          <span className="flex-1 font-mono text-xs">{error}</span>
          <button
            type="button"
            className="press cursor-pointer rounded bg-black/25 px-2 py-1 font-mono text-xs font-bold"
            onClick={() => void game.refresh()}
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
