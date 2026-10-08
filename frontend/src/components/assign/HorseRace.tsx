import { useTranslation } from 'react-i18next';
import type { AssignmentRecord, HorseAnimation } from '../../api/types';
import { Avatar } from '../Avatar';
import styles from './HorseRace.module.css';

interface Props {
  result: AssignmentRecord;
  animation: HorseAnimation;
  /** 0..1, yarışın ne kadarının geçtiği */
  progress: number;
  done: boolean;
}

/** Ara noktalar eşit aralıklı; aralarında yumuşak geçiş (başlangıç 0). */
function positionAt(points: number[], t: number) {
  const all = [0, ...points];
  const x = Math.min(1, Math.max(0, t)) * points.length;
  const i = Math.min(points.length - 1, Math.floor(x));
  const f = x - i;
  const ease = f * f * (3 - 2 * f);
  return all[i] + (all[i + 1] - all[i]) * ease;
}

/**
 * At yarışı. Atların hareketi tamamen sunucunun gönderdiği ara noktalardan gelir: istemci yalnızca çizer,
 * sonucu bilmeden "tahmin" etmez. Şeritler aday sırasında; bitince sıralama numaraları görünür.
 */
export function HorseRace({ result, animation, progress, done }: Props) {
  const { t } = useTranslation();
  const place = new Map(result.ranking.map((p, i) => [p.participantId, i + 1]));
  return (
    <div className={styles.track} role="img" aria-label={t('assign.horseRace')}>
      {result.candidates.map((p) => {
        const points = animation.tracks[p.participantId] ?? [1];
        const x = done ? points[points.length - 1] : positionAt(points, progress);
        const rank = place.get(p.participantId);
        return (
          <div key={p.participantId} className={`${styles.lane} ${done && rank === 1 ? styles.winner : ''}`}>
            <span className={styles.name}>{p.nickname}</span>
            <div className={styles.road}>
              <span className={styles.runner} style={{ left: `${x * 100}%` }}>
                <span className={styles.horse} aria-hidden>🏇</span>
                <Avatar seed={p.avatar} size={28} alt="" />
              </span>
            </div>
            <span className={styles.place}>{done && rank ? `${rank}.` : ''}</span>
          </div>
        );
      })}
    </div>
  );
}
