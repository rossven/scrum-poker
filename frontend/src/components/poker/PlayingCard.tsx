import { motion } from 'framer-motion';
import { CardBack, CardFace } from './CardFace';
import styles from './PlayingCard.module.css';

interface Props {
  /** Ön yüzde yazacak değer; kapalı kartta gösterilmez. */
  value?: string;
  /** Destedeki sırası (sembol için). */
  index?: number;
  faceUp: boolean;
  size?: 'sm' | 'md';
  highlight?: 'low' | 'high';
  dimmed?: boolean;
}

/**
 * Masadaki iskambil kartı. faceUp değişince Y ekseninde çevrilir (flip).
 * Hareketi azalt ayarında MotionConfig dönüşü anında yapar.
 */
export function PlayingCard({ value, index = 0, faceUp, size = 'sm', highlight, dimmed }: Props) {
  const classes = [styles.card, styles[size], highlight ? styles[highlight] : '', dimmed ? styles.dimmed : '']
    .filter(Boolean)
    .join(' ');
  return (
    <div className={classes}>
      <motion.div
        className={styles.inner}
        initial={false}
        animate={{ rotateY: faceUp ? 180 : 0 }}
        transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
      >
        <div className={`${styles.side} ${styles.backSide}`} aria-hidden>
          <CardBack />
        </div>
        <div className={`${styles.side} ${styles.frontSide}`}>
          {faceUp && value !== undefined && <CardFace value={value} index={index} compact={size === 'sm'} />}
        </div>
      </motion.div>
    </div>
  );
}

/** Oy vermeyenin önündeki boş yer. */
export function EmptyCardSlot({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  return <div className={`${styles.card} ${styles[size]} ${styles.empty}`} aria-hidden />;
}
