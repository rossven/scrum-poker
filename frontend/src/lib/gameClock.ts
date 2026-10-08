import { useEffect, useState } from 'react';
import type { AssignmentView } from '../api/types';

// Oyunun başlangıç anı, sunucunun gönderdiği "başlamaya kalan süre"den bu tarayıcının saatiyle hesaplanır
// (cihaz saatleri farklı olsa da herkes aynı anda başlatır). Aynı oyun için ilk görülen değer saklanır;
// sonraki room.state mesajları (başka bir değişiklik yüzünden gelenler) başlangıcı oynatmaz.
const startTimes = new Map<string, number>();

export type GameStage = 'none' | 'waiting' | 'running' | 'done';

export interface GameTiming {
  stage: GameStage;
  /** 0..1 */
  progress: number;
  startAt: number;
}

export function gameStartAt(resultId: string, startsInMs: number) {
  let at = startTimes.get(resultId);
  if (at === undefined) {
    at = Date.now() + startsInMs;
    startTimes.set(resultId, at);
  }
  return at;
}

/** Süren oyunun aşaması; çalışırken her karede yenilenir. */
export function useGameTiming(assignment: AssignmentView | undefined): GameTiming {
  const game = assignment?.phase === 'RESULT' ? assignment.game : undefined;
  const resultId = assignment?.result?.id;
  const startAt = game && resultId ? gameStartAt(resultId, game.startsInMs) : 0;
  const [now, setNow] = useState(() => Date.now());

  const end = game ? startAt + game.durationMs : 0;
  const finished = !game || now >= end;
  useEffect(() => {
    if (finished) return;
    let frame = requestAnimationFrame(function tick() {
      setNow(Date.now());
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [finished, resultId]);

  if (!game) return { stage: 'none', progress: 1, startAt: 0 };
  if (now < startAt) return { stage: 'waiting', progress: 0, startAt };
  if (now < end) return { stage: 'running', progress: (now - startAt) / game.durationMs, startAt };
  return { stage: 'done', progress: 1, startAt };
}
