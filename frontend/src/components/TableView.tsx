import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import type { ParticipantView } from '../api/types';
import { Seat } from './Seat';
import styles from './TableView.module.css';

interface Props {
  people: ParticipantView[];
  youId: string | null;
  renderCard?: (p: ParticipantView) => ReactNode;
  renderActions?: (p: ParticipantView) => ReactNode;
  center?: ReactNode;
}

/** Kalabalıkta avatarlar küçülür; 16 kişiden sonra iki sıra (iç/dış halka) kullanılır. */
function avatarSize(n: number) {
  if (n <= 8) return 56;
  if (n <= 14) return 46;
  if (n <= 24) return 38;
  return 32;
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
 * dar ekranda (mobil) masa üstte, koltuklar altta ızgara olarak görünür.
 */
export function TableView({ people, youId, renderCard, renderActions, center }: Props) {
  const size = avatarSize(people.length);
  return (
    <div className={styles.wrap}>
      <div className={styles.arena}>
        <div className={styles.table}>{center}</div>
        <ul className={styles.seats}>
          {people.map((p, i) => (
            // Konum düz <li> üzerinde: framer-motion'ın transform'u ortalama için gereken translate'i ezmesin.
            <li key={p.id} className={styles.seatSlot} style={seatPosition(i, people.length)}>
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
                <Seat person={p} isYou={p.id === youId} size={size} card={renderCard?.(p)} actions={renderActions?.(p)} />
              </motion.div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
