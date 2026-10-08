import { useTranslation } from 'react-i18next';
import type { AssignmentRecord, WheelAnimation } from '../../api/types';
import styles from './Wheel.module.css';

interface Props {
  result: AssignmentRecord;
  animation: WheelAnimation;
  progress: number;
  done: boolean;
}

const COLORS = ['#0f7656', '#2f62d8', '#7b5cd6', '#e0581f', '#d49a12', '#149fb8', '#c2408a', '#4a6b2f'];
const SIZE = 260;
const R = SIZE / 2 - 6;

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

function point(angleDeg: number, radius: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: SIZE / 2 + radius * Math.cos(a), y: SIZE / 2 + radius * Math.sin(a) };
}

/**
 * Şans çarkı: eşit dilimler, ok tepede. Dönüş miktarı sunucudan gelir (tur sayısı + kazananın dilimindeki
 * durma noktası); istemci yalnızca bu açıya yavaşlayarak döner.
 */
export function Wheel({ result, animation, progress, done }: Props) {
  const { t } = useTranslation();
  const people = new Map(result.candidates.map((p) => [p.participantId, p]));
  const n = animation.slices.length;
  const slice = 360 / n;
  const target = (animation.winnerSlice + animation.offset) * slice;
  const total = animation.turns * 360 + (360 - target);
  const rotation = total * (done ? 1 : easeOutCubic(progress));
  const winnerId = result.winner.participantId;

  return (
    <div className={styles.wrap}>
      <span className={styles.pointer} aria-hidden>▼</span>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className={styles.wheel} role="img" aria-label={t('assign.wheel')}>
        <g style={{ transform: `rotate(${rotation}deg)`, transformOrigin: '50% 50%' }}>
          {animation.slices.map((id, i) => {
            const a0 = i * slice;
            const a1 = (i + 1) * slice;
            const p0 = point(a0, R);
            const p1 = point(a1, R);
            const large = slice > 180 ? 1 : 0;
            const label = point(a0 + slice / 2, R * 0.62);
            const name = people.get(id)?.nickname ?? '?';
            const highlight = done && id === winnerId;
            return (
              <g key={id}>
                <path
                  d={`M ${SIZE / 2} ${SIZE / 2} L ${p0.x} ${p0.y} A ${R} ${R} 0 ${large} 1 ${p1.x} ${p1.y} Z`}
                  fill={COLORS[i % COLORS.length]}
                  stroke={highlight ? '#ffffff' : 'rgba(255,255,255,0.85)'}
                  strokeWidth={highlight ? 4 : 1.5}
                />
                <text
                  x={label.x}
                  y={label.y}
                  className={styles.label}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${a0 + slice / 2} ${label.x} ${label.y})`}
                >
                  {name.length > 10 ? `${name.slice(0, 9)}…` : name}
                </text>
              </g>
            );
          })}
          <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="#ffffff" strokeWidth={5} />
          <circle cx={SIZE / 2} cy={SIZE / 2} r={16} fill="#17211c" stroke="#ffffff" strokeWidth={3} />
        </g>
      </svg>
    </div>
  );
}
