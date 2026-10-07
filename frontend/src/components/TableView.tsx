import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import type { ParticipantView } from '../api/types';
import { Seat } from './Seat';
import styles from './TableView.module.css';

interface Props {
  people: ParticipantView[];
  youId: string | null;
  canPromote: boolean;
  onPromote: (id: string) => void;
  center?: ReactNode;
}

/** Kalabalıkta avatarlar küçülür; 16 kişiden sonra iki sıra (iç/dış halka) kullanılır. */
function avatarSize(n: number) {
  if (n <= 8) return 60;
  if (n <= 14) return 50;
  if (n <= 24) return 42;
  return 34;
}

function seatPosition(i: number, n: number) {
  const twoRows = n > 16;
  const angle = -Math.PI / 2 + (i / n) * Math.PI * 2;
  const outer = !twoRows || i % 2 === 0;
  const rx = outer ? 47 : 36;
  const ry = outer ? 42 : 29;
  return { left: `${50 + rx * Math.cos(angle)}%`, top: `${50 + ry * Math.sin(angle)}%` };
}

/**
 * Oval masa. Geniş ekranda koltuklar masanın etrafına dizilir,
 * dar ekranda (mobil) masa üstte, koltuklar altta liste olarak görünür.
 */
export function TableView({ people, youId, canPromote, onPromote, center }: Props) {
  const size = avatarSize(people.length);
  return (
    <div className={styles.wrap}>
      <div className={styles.arena}>
        <div className={styles.table}>{center}</div>
        <ul className={styles.seats}>
          {people.map((p, i) => (
            <motion.li
              key={p.id}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className={styles.seatSlot}
              style={seatPosition(i, people.length)}
            >
              <Seat person={p} isYou={p.id === youId} size={size} canPromote={canPromote} onPromote={() => onPromote(p.id)} />
            </motion.li>
          ))}
        </ul>
      </div>
    </div>
  );
}
