import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { RetroColumn, RetroView } from '../../api/types';
import { RETRO_TEXT_MAX, similarCards } from '../../lib/retro';
import { useRoomStore } from '../../store/roomStore';
import { Icon } from '../Icon';
import styles from './Retro.module.css';

/** Sütunun yazma kutusu. Yazarken benzer kart varsa uyarır; oradan o kartı beğenip aynısını yazmaktan vazgeçilir. */
export function RetroComposer({ column, retro, likedIds }: { column: RetroColumn; retro: RetroView; likedIds: Set<string> }) {
  const { t } = useTranslation();
  const addRetroCard = useRoomStore((s) => s.addRetroCard);
  const likeRetroCard = useRoomStore((s) => s.likeRetroCard);
  const [text, setText] = useState('');
  const similar = similarCards(text, retro.cards, column);
  const placeholder = t(`retro.placeholder.${column}`);

  const submit = () => {
    const v = text.trim();
    if (!v) return;
    addRetroCard(column, v);
    setText('');
  };

  return (
    <>
      <div className={styles.composer}>
        <textarea
          rows={2}
          value={text}
          maxLength={RETRO_TEXT_MAX}
          placeholder={placeholder}
          aria-label={placeholder}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <div className={styles.composerRow}>
          <span>{text.length} / {RETRO_TEXT_MAX}</span>
          <button type="button" className={styles.composerAdd} disabled={!text.trim()} onClick={submit}>
            {t('retro.add')} <Icon name="plus" size={14} />
          </button>
        </div>
      </div>
      {similar.length > 0 && (
        <div className={styles.similar} role="status">
          <b><Icon name="spark" size={15} />{t('retro.similarTitle')}</b>
          {similar.map((c) => {
            const liked = likedIds.has(c.id);
            return (
              <div key={c.id} className={styles.similarRow}>
                <span>{c.text}</span>
                <button type="button" className="btn btn-small" aria-pressed={liked} onClick={() => likeRetroCard(c.id, !liked)}>
                  <Icon name="heart" size={14} />{liked ? t('retro.liked') : t('retro.likeIt')}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
