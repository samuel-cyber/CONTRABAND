import { useEffect, useState } from 'react';

const pad = (n: number) => String(n).padStart(2, '0');

const formatCountdown = (ms: number): string => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
};

/** Ticks once a second until `to`, then calls onDone once. */
export const Countdown = ({
  to,
  onDone,
}: {
  to: number;
  onDone?: () => void;
}) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const left = to - now;
  useEffect(() => {
    if (left <= 0) onDone?.();
  }, [left <= 0]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <span className="font-mono tabular-nums">{formatCountdown(left)}</span>
  );
};
