import type { StampAction } from '../../shared/scoring';

const BLOTS = [
  { cx: 18, cy: 22, r: 7 },
  { cx: 84, cy: 16, r: 5 },
  { cx: 92, cy: 70, r: 8 },
  { cx: 10, cy: 78, r: 4 },
  { cx: 52, cy: 92, r: 5 },
  { cx: 70, cy: 8, r: 3 },
];

/** The rubber stamp that slams onto the passport, with ink splatter. */
export const StampFx = ({
  action,
  rotation,
}: {
  action: StampAction;
  rotation: number;
}) => {
  const color = action === 'PASS' ? '#2d8a56' : '#d93829';
  return (
    <div
      className="pointer-events-none absolute inset-0 z-10 grid place-items-center"
      aria-hidden
    >
      <svg
        viewBox="0 0 100 100"
        className="ink-splat absolute h-56 w-56 opacity-70"
      >
        {BLOTS.map((b, i) => (
          <circle key={i} cx={b.cx} cy={b.cy} r={b.r} fill={color} />
        ))}
      </svg>
      <div style={{ transform: `rotate(${rotation}deg)` }}>
        <div
          className="stamp-drop stamp-text rounded-lg border-[6px] px-5 py-1 text-6xl"
          style={{ color, borderColor: color }}
        >
          {action === 'PASS' ? 'Passed' : 'Busted'}
        </div>
      </div>
    </div>
  );
};
