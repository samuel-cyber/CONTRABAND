import { setMuted, useMuted } from '../fx/audio';

export const MuteToggle = () => {
  const muted = useMuted();
  return (
    <button
      type="button"
      onClick={() => setMuted(!muted)}
      aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
      aria-pressed={muted}
      className="press -my-1 grid h-7 w-7 cursor-pointer place-items-center rounded-full bg-desk-3 text-xs"
    >
      {muted ? '🔇' : '🔊'}
    </button>
  );
};
