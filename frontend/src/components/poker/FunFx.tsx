import { motion, useReducedMotion } from 'framer-motion';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { VoteStats } from '../../api/types';
import { isSpecialCard } from '../../lib/deck';
import styles from './FunFx.module.css';

/** Herkes (en az iki kişi) aynı, sayılabilir kartı seçti. */
export function isRoyalFlush(stats?: VoteStats) {
  return !!stats && stats.voteCount >= 2 && stats.distribution.length === 1 && !isSpecialCard(stats.distribution[0].card);
}

/** Oyların çoğu (yarıdan fazlası) ☕. */
export function isBreakTime(stats?: VoteStats) {
  const coffee = stats?.distribution.find((b) => b.card === '☕')?.count ?? 0;
  return !!stats && stats.voteCount > 0 && coffee * 2 > stats.voteCount;
}

const COLORS = ['#c9a24a', '#e6cf8a', '#1d6a47', '#2b8a5b', '#b3202e', '#fffdf7', '#7a1f2b'];

/**
 * Royal Flush kutlaması: ekranın üstünden düşen konfeti ve ortada büyük yazı.
 * "Hareketi azalt" açıkken hiç çizilmez (sonuç panelindeki yazı yine görünür).
 */
export function RoyalFlushCelebration() {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const pieces = useMemo(
    () =>
      Array.from({ length: 90 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 1.8 + Math.random() * 1.4,
        drift: (Math.random() - 0.5) * 160,
        spin: (Math.random() - 0.5) * 900,
        color: COLORS[i % COLORS.length],
        w: 6 + Math.random() * 6,
        round: i % 4 === 0,
      })),
    [],
  );
  if (reduceMotion) return null;
  return (
    <div className={styles.overlay} aria-hidden>
      {pieces.map((p, i) => (
        <motion.span
          key={i}
          className={styles.piece}
          style={{ left: `${p.left}%`, width: p.w, height: p.round ? p.w : p.w * 1.6, background: p.color, borderRadius: p.round ? '50%' : 2 }}
          initial={{ y: -40, x: 0, rotate: 0, opacity: 1 }}
          animate={{ y: '105vh', x: p.drift, rotate: p.spin, opacity: [1, 1, 0.8] }}
          transition={{ delay: p.delay, duration: p.duration, ease: 'easeIn' }}
        />
      ))}
      <motion.div
        className={styles.banner}
        initial={{ scale: 0.4, opacity: 0, rotate: -6 }}
        animate={{ scale: [0.4, 1.15, 1], opacity: [0, 1, 1, 0], rotate: [-6, 2, 0] }}
        transition={{ duration: 2.4, times: [0, 0.25, 0.4, 1] }}
      >
        {t('poker.royalFlush')}
      </motion.div>
    </div>
  );
}
