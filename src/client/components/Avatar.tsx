import { useState } from 'react';
import type { Passport } from '../../shared/api';
import { findNpc } from '../../shared/catalog';

export const Avatar = ({
  passport,
  size = 64,
}: {
  passport: Passport;
  size?: number;
}) => {
  const [broken, setBroken] = useState(false);
  const style = { width: size, height: size };
  if (passport.kind === 'npc') {
    const npc = findNpc(passport.npcId);
    return (
      <div
        style={style}
        className="grid shrink-0 place-items-center rounded-md border-2 border-ink/30 bg-manila-2"
      >
        <span aria-hidden style={{ fontSize: size * 0.55 }}>
          {npc?.icon ?? '🧳'}
        </span>
      </div>
    );
  }
  if (passport.snoovatarUrl && !broken) {
    return (
      <img
        src={passport.snoovatarUrl}
        alt=""
        style={style}
        onError={() => setBroken(true)}
        className="shrink-0 rounded-md border-2 border-ink/30 bg-manila-2 object-contain"
      />
    );
  }
  return (
    <div
      style={style}
      className="grid shrink-0 place-items-center rounded-md border-2 border-ink/30 bg-leather text-manila"
    >
      <span className="stamp-text" style={{ fontSize: size * 0.4 }}>
        {passport.username.slice(0, 1)}
      </span>
    </div>
  );
};
