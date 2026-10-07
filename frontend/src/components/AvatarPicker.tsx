import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { randomSeed } from '../lib/avatar';
import { Avatar } from './Avatar';
import styles from './AvatarPicker.module.css';

const SUGGESTIONS = 6;
const fresh = () => Array.from({ length: SUGGESTIONS }, randomSeed);

interface Props {
  value: string;
  onChange: (seed: string) => void;
}

export function AvatarPicker({ value, onChange }: Props) {
  const { t } = useTranslation();
  const [seeds, setSeeds] = useState(() => (value ? [value, ...fresh().slice(1)] : fresh()));

  const shuffle = () => {
    const next = fresh();
    setSeeds(next);
    onChange(next[0]);
  };

  return (
    <div className={styles.picker}>
      <div className={styles.grid} role="radiogroup" aria-label={t('join.avatar')}>
        {seeds.map((seed) => (
          <button
            key={seed}
            type="button"
            role="radio"
            aria-checked={seed === value}
            className={`${styles.option} ${seed === value ? styles.selected : ''}`}
            onClick={() => onChange(seed)}
          >
            <Avatar seed={seed} size={56} />
          </button>
        ))}
      </div>
      <button type="button" className="btn btn-ghost btn-small" onClick={shuffle}>
        ↻ {t('join.shuffle')}
      </button>
    </div>
  );
}
