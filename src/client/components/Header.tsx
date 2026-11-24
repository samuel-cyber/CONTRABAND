import type { ReactNode } from 'react';

export const ScreenTitle = ({
  kicker,
  title,
  right,
}: {
  kicker: string;
  title: string;
  right?: ReactNode;
}) => (
  <div className="flex items-end justify-between gap-2">
    <div className="min-w-0">
      <div className="font-mono text-[11px] tracking-widest text-brass uppercase">
        {kicker}
      </div>
      <h1 className="stamp-text truncate text-2xl leading-none text-manila">
        {title}
      </h1>
    </div>
    {right}
  </div>
);
