import { useEffect, useRef, useState } from 'react';
import { formatMoney } from '../../shared/share';
import { prefersReducedMotion } from '../fx/motion';

/** Counts up/down to `value` and flashes green or red on change. */
export const Money = ({
  value,
  initial,
  className = '',
  signed = false,
}: {
  value: number;
  /** Start counting from here on mount (e.g. 0 on the report). */
  initial?: number;
  className?: string;
  signed?: boolean;
}) => {
  const [shown, setShown] = useState(initial ?? value);
  const [flash, setFlash] = useState<{ dir: 'up' | 'down'; n: number } | null>(
    null
  );
  const from = useRef(initial ?? value);

  useEffect(() => {
    const start = from.current;
    from.current = value;
    if (start === value) return;
    let raf = 0;
    raf = requestAnimationFrame(() => {
      setFlash((f) => ({
        dir: value > start ? 'up' : 'down',
        n: (f?.n ?? 0) + 1,
      }));
      if (prefersReducedMotion()) {
        setShown(value);
        return;
      }
      const t0 = performance.now();
      const dur = 600;
      const step = (t: number) => {
        const p = Math.min(1, (t - t0) / dur);
        const eased = 1 - (1 - p) ** 3;
        setShown(Math.round(start + (value - start) * eased));
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return (
    <span
      key={flash?.n ?? 0}
      className={`inline-block tabular-nums ${flash ? (flash.dir === 'up' ? 'flash-up' : 'flash-down') : ''} ${className}`}
    >
      {signed && shown > 0 ? '+' : ''}
      {formatMoney(shown)}
    </span>
  );
};
