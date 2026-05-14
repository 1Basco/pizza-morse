import type { PressEvent } from './morse';

const FREQ = 600; // Hz, classic CW pitch
const ENVELOPE_MS = 5; // attack/release to prevent clicks

let ctx: AudioContext | null = null;

function getContext(): AudioContext {
  if (!ctx) {
    const Ctor = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** Module-level handle to the currently playing message. Starting a new playback
 *  cancels the previous one — used to keep audio and flash mutually exclusive
 *  across bubbles. */
let activeStop: (() => void) | null = null;

export function stopActivePlayback() {
  if (activeStop) {
    const s = activeStop;
    activeStop = null;
    s();
  }
}

export function setActivePlayback(stop: () => void): () => void {
  stopActivePlayback();
  activeStop = stop;
  return () => {
    if (activeStop === stop) activeStop = null;
    stop();
  };
}

/** Play the press sequence as tones. Returns a stop() that cancels remaining notes. */
export function playTones(events: PressEvent[]): () => void {
  if (events.length === 0) return () => {};
  const audio = getContext();
  const start = audio.currentTime;
  const stops: Array<() => void> = [];

  for (const [offsetMs, durationMs] of events) {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = 'sine';
    osc.frequency.value = FREQ;
    osc.connect(gain).connect(audio.destination);

    const t0 = start + offsetMs / 1000;
    const t1 = t0 + durationMs / 1000;
    const env = ENVELOPE_MS / 1000;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(0.2, t0 + env);
    gain.gain.setValueAtTime(0.2, Math.max(t0 + env, t1 - env));
    gain.gain.linearRampToValueAtTime(0, t1);

    osc.start(t0);
    osc.stop(t1 + 0.01);
    stops.push(() => {
      try { osc.stop(); } catch { /* already stopped */ }
    });
  }

  const rawStop = () => stops.forEach((s) => s());
  return setActivePlayback(rawStop);
}

/** Play a single short beep, useful as a press indicator while recording. */
export function blip(durationMs = 60) {
  const audio = getContext();
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = 'sine';
  osc.frequency.value = FREQ;
  osc.connect(gain).connect(audio.destination);
  const t0 = audio.currentTime;
  const t1 = t0 + durationMs / 1000;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(0.2, t0 + 0.005);
  gain.gain.setValueAtTime(0.2, t1 - 0.005);
  gain.gain.linearRampToValueAtTime(0, t1);
  osc.start(t0);
  osc.stop(t1 + 0.01);
}

/** Live tone — call start() on pointerdown, stop() on pointerup. */
export function liveTone() {
  const audio = getContext();
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = 'sine';
  osc.frequency.value = FREQ;
  osc.connect(gain).connect(audio.destination);
  const t0 = audio.currentTime;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(0.2, t0 + 0.005);
  osc.start(t0);
  let stopped = false;
  return () => {
    if (stopped) return;
    stopped = true;
    const tStop = audio.currentTime;
    gain.gain.cancelScheduledValues(tStop);
    gain.gain.setValueAtTime(gain.gain.value, tStop);
    gain.gain.linearRampToValueAtTime(0, tStop + 0.01);
    osc.stop(tStop + 0.02);
  };
}
