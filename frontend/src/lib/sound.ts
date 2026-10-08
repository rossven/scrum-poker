import { useSyncExternalStore } from 'react';
import { preferences } from './session';

// Sesler varsayılan KAPALI; tek düğmeyle açılır, tercih tarayıcıda saklanır.
// Ses dosyası yok: Web Audio ile kısa tonlar ve gürültü patlamaları üretilir
// (kart karıştırma, fiş tıkırtısı, dürtme).

let enabled = preferences.get<boolean>('sound', false);
const listeners = new Set<() => void>();
let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;

export function setSoundEnabled(on: boolean) {
  enabled = on;
  preferences.set('sound', on);
  listeners.forEach((l) => l());
  if (on) play('chip');
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

export type Cue = 'reveal' | 'timer' | 'shuffle' | 'chip' | 'nudge' | 'pop' | 'fanfare';

function tone(c: AudioContext, freq: number, at: number, length = 0.45, volume = 0.12, type: OscillatorType = 'sine') {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(volume, at + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
  osc.connect(gain).connect(c.destination);
  osc.start(at);
  osc.stop(at + length + 0.05);
}

/** Bant geçiren filtreden kısa beyaz gürültü: kart sürtünmesi ve fiş tıkırtısı için. */
function burst(c: AudioContext, at: number, length: number, freq: number, volume: number, q = 1.2) {
  noise ??= (() => {
    const buf = c.createBuffer(1, c.sampleRate * 0.5, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  })();
  const src = c.createBufferSource();
  src.buffer = noise;
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  filter.Q.value = q;
  const gain = c.createGain();
  gain.gain.setValueAtTime(volume, at);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
  src.connect(filter).connect(gain).connect(c.destination);
  src.start(at, Math.random() * 0.3, length + 0.02);
}

const CUES: Record<Cue, (c: AudioContext, t: number) => void> = {
  // Kartlar açılınca: iki fiş tıkırtısı + yumuşak iki nota.
  reveal: (c, t) => {
    burst(c, t, 0.05, 3200, 0.25, 4);
    burst(c, t + 0.07, 0.05, 2800, 0.2, 4);
    tone(c, 523, t + 0.05);
    tone(c, 659, t + 0.14);
  },
  timer: (c, t) => [784, 659, 523].forEach((f, i) => tone(c, f, t + i * 0.22)),
  // Kart karıştırma: kısa kısa sürtünme sesleri.
  shuffle: (c, t) => {
    for (let i = 0; i < 9; i++) burst(c, t + i * 0.045 + Math.random() * 0.012, 0.04, 1800 + Math.random() * 900, 0.18);
  },
  // Fiş: masaya bırakılan tek fiş.
  chip: (c, t) => {
    burst(c, t, 0.035, 3600, 0.3, 5);
    tone(c, 2300, t, 0.08, 0.04, 'triangle');
    burst(c, t + 0.06, 0.03, 3000, 0.14, 5);
  },
  // Dürtme: iki hafif "tık tık".
  nudge: (c, t) => {
    tone(c, 220, t, 0.12, 0.2, 'triangle');
    tone(c, 220, t + 0.16, 0.12, 0.2, 'triangle');
  },
  pop: (c, t) => tone(c, 880, t, 0.12, 0.06, 'triangle'),
  // Royal Flush: kısa yükselen arpej.
  fanfare: (c, t) => [523, 659, 784, 1047].forEach((f, i) => tone(c, f, t + i * 0.09, 0.4, 0.1, 'triangle')),
};

export function play(cue: Cue) {
  if (!enabled) return;
  try {
    ctx ??= new AudioContext();
    CUES[cue](ctx, ctx.currentTime + 0.01);
  } catch {
    // Ses desteklenmiyorsa sessizce geç.
  }
}
