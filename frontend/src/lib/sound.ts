import { useSyncExternalStore } from 'react';
import { preferences } from './session';

// Sesler varsayılan KAPALI; tek düğmeyle açılır, tercih tarayıcıda saklanır.
// Ses dosyası yok: Web Audio ile kısa, yumuşak tonlar üretilir.

let enabled = preferences.get<boolean>('sound', false);
const listeners = new Set<() => void>();
let ctx: AudioContext | null = null;

export function setSoundEnabled(on: boolean) {
  enabled = on;
  preferences.set('sound', on);
  listeners.forEach((l) => l());
  if (on) play('toggle');
}

export function useSoundEnabled(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => enabled,
  );
}

type Cue = 'toggle' | 'reveal' | 'timer';

// Her ipucu için notalar (Hz) ve aralık (sn).
const CUES: Record<Cue, { notes: number[]; gap: number }> = {
  toggle: { notes: [660], gap: 0 },
  reveal: { notes: [523, 659], gap: 0.09 },
  timer: { notes: [784, 659, 523], gap: 0.22 },
};

export function play(cue: Cue) {
  if (!enabled) return;
  try {
    ctx ??= new AudioContext();
    const start = ctx.currentTime + 0.01;
    CUES[cue].notes.forEach((freq, i) => {
      const t = start + i * CUES[cue].gap;
      const osc = ctx!.createOscillator();
      const gain = ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.12, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      osc.connect(gain).connect(ctx!.destination);
      osc.start(t);
      osc.stop(t + 0.5);
    });
  } catch {
    // Ses desteklenmiyorsa sessizce geç.
  }
}
