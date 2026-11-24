import { useCallback, useEffect, useRef, useState } from 'react';
import type { Reveal, StateResponse } from '../../shared/api';
import type { StampAction } from '../../shared/scoring';
import { api, ApiFailure, friendlyMessage } from '../api';

export type Game = {
  state: StateResponse | null;
  error: string | null;
  pending: boolean;
  /** The bag just stamped, shown until the player moves on. */
  reveal: Reveal | null;
  /** Item id revealed by the most recent X-ray (for the beam animation). */
  lastXray: string | null;
  refresh: () => Promise<void>;
  pack: (itemIds: string[], labelId: string) => Promise<boolean>;
  xray: () => Promise<void>;
  stamp: (action: StampAction) => Promise<void>;
  next: () => void;
  clearError: () => void;
};

// Errors that mean "the server knows better than we do": resync silently.
const RESYNC = new Set([
  'stale',
  'not-packed',
  'shift-finished',
  'already-packed',
]);

export const useGame = (): Game => {
  const [state, setState] = useState<StateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [lastXray, setLastXray] = useState<string | null>(null);
  const busy = useRef(false);

  const refresh = useCallback(async () => {
    try {
      setState(await api.state());
      setError(null);
    } catch (e) {
      setError(friendlyMessage(e));
    }
  }, []);

  // Initial load: setState only happens in the async callbacks.
  useEffect(() => {
    let live = true;
    api
      .state()
      .then((s) => live && setState(s))
      .catch((e: unknown) => live && setError(friendlyMessage(e)));
    return () => {
      live = false;
    };
  }, []);

  /** Runs one intent at a time; double taps are ignored. */
  const run = useCallback(
    async (fn: () => Promise<void>): Promise<boolean> => {
      if (busy.current) return false;
      busy.current = true;
      setPending(true);
      try {
        await fn();
        setError(null);
        return true;
      } catch (e) {
        if (e instanceof ApiFailure && RESYNC.has(e.code)) {
          setReveal(null);
          await refresh();
        } else {
          setError(friendlyMessage(e));
        }
        return false;
      } finally {
        busy.current = false;
        setPending(false);
      }
    },
    [refresh]
  );

  const pack = useCallback(
    (itemIds: string[], labelId: string) =>
      run(async () => {
        setState(await api.pack({ itemIds, labelId }));
      }),
    [run]
  );

  const step = state?.shift?.step ?? 0;

  const xray = useCallback(async () => {
    await run(async () => {
      const res = await api.xray({ step });
      setLastXray(res.itemId);
      setState((s) => (s ? { ...s, shift: res.shift } : s));
    });
  }, [run, step]);

  const stamp = useCallback(
    async (action: StampAction) => {
      await run(async () => {
        const res = await api.stamp({ action, step });
        setLastXray(null);
        setReveal(res.reveal);
        setState((s) =>
          s
            ? {
                ...s,
                shift: res.shift,
                report: res.report ?? s.report,
                phase: res.report ? 'report' : s.phase,
              }
            : s
        );
      });
    },
    [run, step]
  );

  const next = useCallback(() => setReveal(null), []);
  const clearError = useCallback(() => setError(null), []);

  return {
    state,
    error,
    pending,
    reveal,
    lastXray,
    refresh,
    pack,
    xray,
    stamp,
    next,
    clearError,
  };
};
