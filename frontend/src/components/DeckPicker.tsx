import { useTranslation } from 'react-i18next';
import { PRESET_DECKS, type DeckId } from '../api/types';
import { cardTone, parseCustomDeck, toneColor } from '../lib/deck';
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

/** Önizleme kartı: odadaki kartla aynı renk ölçeği (küçük hâli). */
function MiniCards({ cards, label }: { cards: string[]; label: string }) {
  return (
    <ul className={styles.preview} aria-label={label}>
      {cards.map((c, i) => {
        const color = toneColor(cardTone(cards, c)) ?? '#77837d';
        return (
          <li key={`${c}-${i}`} style={{ ['--t' as string]: color }}>{c}</li>
        );
      })}
    </ul>
  );
}

/** Deste seçimi: önizlemeli seçim kartları + özel deste girişi. */
export function DeckPicker({ id, value, onChange }: { id: string; value: DeckChoice; onChange: (v: DeckChoice) => void }) {
  const { t } = useTranslation();
  const custom = parseCustomDeck(value.customText);
  const choices: DeckId[] = [...PRESET_DECKS, 'custom'];

  return (
    <div className={styles.picker} id={id} role="radiogroup" aria-label={t('decks.title')}>
      {choices.map((d) => {
        const on = value.deck === d;
        const cards = d === 'custom' ? custom.cards : PRESET_PREVIEW[d];
        return (
          <div key={d} className={`${styles.option} ${on ? styles.on : ''}`}>
            <button type="button" role="radio" aria-checked={on} className={styles.optionButton} onClick={() => onChange({ ...value, deck: d })}>
              <span className={styles.radio} aria-hidden />
              <span className={styles.name}>{t(`decks.${d}`)}</span>
              {d !== 'custom' && <MiniCards cards={cards} label={t('decks.preview')} />}
              {d === 'custom' && cards.length > 0 && !on && <MiniCards cards={cards} label={t('decks.preview')} />}
            </button>
            {d === 'custom' && on && (
              <div className={styles.custom}>
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
                {cards.length > 0 && <MiniCards cards={cards} label={t('decks.preview')} />}
              </div>
            )}
          </div>
        );
      })}
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
