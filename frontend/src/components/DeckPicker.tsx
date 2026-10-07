import { useTranslation } from 'react-i18next';
import { PRESET_DECKS, type DeckId } from '../api/types';
import { parseCustomDeck } from '../lib/deck';
import styles from './DeckPicker.module.css';

export interface DeckChoice {
  deck: DeckId;
  /** Özel deste için virgülle ayrılmış metin. */
  customText: string;
}

const PRESET_PREVIEW: Record<Exclude<DeckId, 'custom'>, string[]> = {
  'modified-fibonacci': ['0', '½', '1', '2', '3', '5', '8', '13', '21', '34', '55', '?', '☕'],
  fibonacci: ['0', '1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '?', '☕'],
  tshirt: ['XS', 'S', 'M', 'L', 'XL', '?', '☕'],
};

/** Deste seçimi + özel deste girişi ve canlı önizleme. */
export function DeckPicker({ id, value, onChange }: { id: string; value: DeckChoice; onChange: (v: DeckChoice) => void }) {
  const { t } = useTranslation();
  const custom = parseCustomDeck(value.customText);
  const preview = value.deck === 'custom' ? custom.cards : PRESET_PREVIEW[value.deck];

  return (
    <div className={styles.picker}>
      <select id={id} className="input" value={value.deck} onChange={(e) => onChange({ ...value, deck: e.target.value as DeckId })}>
        {PRESET_DECKS.map((d) => (
          <option key={d} value={d}>{t(`decks.${d}`)}</option>
        ))}
        <option value="custom">{t('decks.custom')}</option>
      </select>
      {value.deck === 'custom' && (
        <>
          <input
            className="input"
            aria-label={t('decks.customLabel')}
            placeholder={t('decks.customPlaceholder')}
            value={value.customText}
            onChange={(e) => onChange({ ...value, customText: e.target.value })}
          />
          <small className={custom.error ? 'error-text' : 'muted'}>
            {custom.error ? t(`decks.error.${custom.error}`, { card: custom.offending }) : t('decks.customHint')}
          </small>
        </>
      )}
      {preview.length > 0 && (
        <ul className={styles.preview} aria-label={t('decks.preview')}>
          {preview.map((c, i) => (
            <li key={`${c}-${i}`}>{c}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Seçim gönderilebilir mi (özel destede kurallara uyuyor mu)? */
export function deckChoiceValid(v: DeckChoice) {
  return v.deck !== 'custom' || !parseCustomDeck(v.customText).error;
}

export function deckChoiceCards(v: DeckChoice) {
  return v.deck === 'custom' ? parseCustomDeck(v.customText).cards : undefined;
}
