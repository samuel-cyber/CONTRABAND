export const prefersReducedMotion = (): boolean => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

/** 60 ms screen shake on the app root. Never blocks input. */
export const shake = (strength = 6): void => {
  if (prefersReducedMotion()) return;
  const root = document.getElementById('root');
  root?.animate(
    [
      { transform: 'translate(0, 0)' },
      { transform: `translate(${-strength}px, ${strength / 2}px)` },
      { transform: `translate(${strength}px, ${-strength / 2}px)` },
      { transform: `translate(${-strength / 2}px, 0)` },
      { transform: 'translate(0, 0)' },
    ],
    { duration: 60, easing: 'linear' }
  );
};

/** Random tilt in [-max, max] degrees. */
export const tilt = (max = 8): number =>
  Math.round((Math.random() * 2 - 1) * max);
