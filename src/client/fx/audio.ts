// Synthesised SFX with Web Audio. No audio files. Mute persists per viewer.
import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'contrabluff:muted';

const loadMuted = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

let muted = loadMuted();
let ctx: AudioContext | null = null;
const listeners = new Set<() => void>();

export const isMuted = () => muted;

export const setMuted = (value: boolean) => {
  muted = value;
  try {
    localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
  } catch {
    // Storage blocked: mute still works for this session.
  }
  listeners.forEach((l) => l());
};

export const useMuted = (): boolean =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    isMuted,
    isMuted
  );

const audio = (): AudioContext | null => {
  if (muted || typeof AudioContext === 'undefined') return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
};

type ToneOpts = {
  freq: number;
  to?: number;
  dur: number;
  type?: OscillatorType;
  gain?: number;
  at?: number;
};

const tone = (a: AudioContext, o: ToneOpts) => {
  const t0 = a.currentTime + (o.at ?? 0);
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(o.freq, t0);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + o.dur);
  g.gain.setValueAtTime(o.gain ?? 0.2, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
  osc.connect(g).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + o.dur + 0.02);
};

const noise = (
  a: AudioContext,
  dur: number,
  gain: number,
  cutoff: number,
  at = 0
) => {
  const t0 = a.currentTime + at;
  const buffer = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource();
  src.buffer = buffer;
  const filter = a.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = cutoff;
  const g = a.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter).connect(g).connect(a.destination);
  src.start(t0);
};

const play = (fn: (a: AudioContext) => void) => () => {
  const a = audio();
  if (a) fn(a);
};

export const sfx = {
  /** Rubber stamp hitting paper. */
  thunk: play((a) => {
    tone(a, { freq: 140, to: 45, dur: 0.18, gain: 0.5 });
    noise(a, 0.08, 0.35, 900);
  }),
  /** X-ray scanner warming up. */
  hum: play((a) => {
    tone(a, { freq: 58, dur: 0.6, type: 'sawtooth', gain: 0.06 });
    tone(a, { freq: 880, to: 1320, dur: 0.55, type: 'sine', gain: 0.04 });
  }),
  /** Ka-ching. */
  register: play((a) => {
    noise(a, 0.05, 0.25, 4000);
    tone(a, { freq: 1568, dur: 0.35, type: 'triangle', gain: 0.15, at: 0.05 });
    tone(a, { freq: 2093, dur: 0.5, type: 'triangle', gain: 0.12, at: 0.12 });
  }),
  /** Wrong call. */
  buzzer: play((a) => {
    tone(a, { freq: 110, dur: 0.35, type: 'square', gain: 0.09 });
    tone(a, { freq: 104, dur: 0.35, type: 'square', gain: 0.07 });
  }),
  /** Shift cleared. */
  fanfare: play((a) => {
    [523, 659, 784, 1047].forEach((f, i) =>
      tone(a, {
        freq: f,
        dur: 0.28,
        type: 'triangle',
        gain: 0.14,
        at: i * 0.11,
      })
    );
  }),
  /** UI tick. */
  click: play((a) => {
    tone(a, { freq: 1900, dur: 0.035, type: 'square', gain: 0.04 });
  }),
};
