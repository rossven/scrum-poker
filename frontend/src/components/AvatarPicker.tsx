import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BEARDS, formatAvatar, GLASSES, HATS, OUTFITS, parseAvatar, randomAvatar, randomSeed, type AvatarSpec } from '../lib/avatar';
import { Avatar } from './Avatar';
import styles from './AvatarPicker.module.css';

const SUGGESTIONS = 6;
const fresh = () => Array.from({ length: SUGGESTIONS }, randomAvatar);

type Part = 'hat' | 'glasses' | 'beard' | 'outfit';
const PARTS: { key: Part; count: number; names: readonly string[] }[] = [
  { key: 'hat', count: HATS.length, names: HATS },
  { key: 'glasses', count: GLASSES.length, names: GLASSES },
  { key: 'beard', count: BEARDS.length, names: BEARDS },
  { key: 'outfit', count: OUTFITS.length, names: OUTFITS.map((_, i) => String(i)) },
];

interface Props {
  value: string;
  onChange: (avatar: string) => void;
}

/** Karakter seçimi: rastgele öneriler + yenile + her aksesuar için önceki/sonraki. */
export function AvatarPicker({ value, onChange }: Props) {
  const { t } = useTranslation();
  const [options, setOptions] = useState(() => (value ? [value, ...fresh().slice(1)] : fresh()));
  const spec = parseAvatar(value);

  const shuffle = () => {
    const next = fresh();
    setOptions(next);
    onChange(next[0]);
  };

  const change = (patch: Partial<AvatarSpec>) => onChange(formatAvatar({ ...spec, ...patch }));
  const step = (part: Part, count: number, delta: number) => change({ [part]: (spec[part] + delta + count) % count });

  return (
    <div className={styles.picker}>
      <div className={styles.grid} role="radiogroup" aria-label={t('join.avatar')}>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={option === value}
            className={`${styles.option} ${option === value ? styles.selected : ''}`}
            onClick={() => onChange(option)}
          >
            <Avatar seed={option} size={56} />
          </button>
        ))}
      </div>
      <div className={styles.row}>
        <button type="button" className="btn btn-ghost btn-small" onClick={shuffle}>↻ {t('join.shuffle')}</button>
        <button type="button" className="btn btn-ghost btn-small" onClick={() => change({ seed: randomSeed() })}>
          ☺ {t('avatar.newFace')}
        </button>
      </div>
      <div className={styles.custom}>
        <Avatar seed={value} size={96} alt={t('avatar.preview')} />
        <dl className={styles.parts}>
          {PARTS.map(({ key, count, names }) => (
            <div key={key} className={styles.part}>
              <dt>{t(`avatar.${key}`)}</dt>
              <dd>
                <button type="button" className="btn btn-ghost btn-small" aria-label={t('avatar.prev', { part: t(`avatar.${key}`) })}
                  onClick={() => step(key, count, -1)}>‹</button>
                <span className={styles.partValue} aria-live="polite">
                  {key === 'outfit' ? (
                    <span className={styles.swatch} style={{ background: OUTFITS[spec.outfit] }} />
                  ) : null}
                  {t(`avatar.${key}Options.${names[spec[key]]}`)}
                </span>
                <button type="button" className="btn btn-ghost btn-small" aria-label={t('avatar.next', { part: t(`avatar.${key}`) })}
                  onClick={() => step(key, count, 1)}>›</button>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
