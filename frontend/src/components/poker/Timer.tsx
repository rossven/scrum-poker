import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TimerView } from '../../api/types';
import { play } from '../../lib/sound';
import styles from './Timer.module.css';

/**
 * Tartışma geri sayımı. Sunucu kalan süreyi gönderir; bitiş anı bu tarayıcının saatine göre
 * hesaplanır (cihaz saatleri farklı olsa da herkeste aynı kalır). Süre bitince yumuşak uyarı.
 */
export function Timer({ timer }: { timer: TimerView }) {
  const { t } = useTranslation();
  // Her yeni durum mesajında bitiş anı yeniden hesaplanır.
  const endsAt = useMemo(() => Date.now() + timer.remainingMs, [timer]);
  const [now, setNow] = useState(() => Date.now());
  const chimed = useRef(timer.remainingMs <= 0);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  const left = Math.max(0, endsAt - now);
  const done = left <= 0;
  useEffect(() => {
    if (done && !chimed.current) {
      chimed.current = true;
      play('timer');
    }
    if (!done) chimed.current = false;
  }, [done]);

  const secs = Math.ceil(left / 1000);
  const text = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  return (
    <span className={`${styles.timer} ${done ? styles.done : ''}`} role="timer" aria-live={done ? 'polite' : 'off'}>
      ⏱ {done ? t('poker.timerDone') : text}
    </span>
  );
}
