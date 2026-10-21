import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import type { RetroCardView, RetroView, RoomState } from '../../api/types';
import { RETRO_DUE_MAX, RETRO_TEXT_MAX } from '../../lib/retro';
import { useRoomStore } from '../../store/roomStore';
import { Avatar } from '../Avatar';
import { Icon } from '../Icon';
import { Menu, MenuItem } from '../Menu';
import styles from './Retro.module.css';

export type CardState = 'normal' | 'done' | 'focus' | 'upcoming';

export const tone = (column: number): CSSProperties => ({ ['--t' as string]: `var(--t${column + 1})` });

interface Props {
  card: RetroCardView;
  retro: RetroView;
  room: RoomState;
  mine: boolean;
  liked: boolean;
  state: CardState;
  isModerator: boolean;
}

/** Yapışkan not: metin, yazar (anonim değilse), beğeni; kendi kartında düzenle/sil; aksiyonda sahip ve tarih. */
export function RetroSticky({ card, retro, room, mine, liked, state, isModerator }: Props) {
  const { t } = useTranslation();
  const { editRetroCard, deleteRetroCard, likeRetroCard, retroSetAction, retroFocus } = useRoomStore();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(card.text);
  const ref = useRef<HTMLDivElement>(null);
  const writing = retro.phase === 'WRITING';
  const discussing = retro.phase === 'DISCUSSING';
  const isAction = card.column === 2;

  // Odaktaki kart görünür kalsın (telefonda ve uzun sütunlarda).
  useEffect(() => {
    if (state === 'focus') ref.current?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
  }, [state]);

  const save = () => {
    const text = draft.trim();
    if (text && text !== card.text) editRetroCard(card.id, text);
    setEditing(false);
  };

  const remove = () => {
    if (window.confirm(t('retro.deleteConfirm'))) deleteRetroCard(card.id);
  };

  // Konuşulmuş kart: tek satır, soluk. Krupiye tıklayınca odağı geri alabilir.
  if (state === 'done') {
    const body = (
      <>
        <span className={styles.tick}><Icon name="check" size={15} /></span>
        <span className={styles.doneText}>{card.text}</span>
        {!isAction && <span className={styles.doneLikes}><Icon name="heart" size={12} />{card.likes}</span>}
      </>
    );
    return isModerator ? (
      <button type="button" className={`${styles.sticky} ${styles.done}`} style={tone(card.column)} onClick={() => retroFocus(card.id)}
        title={t('retro.focusCard')}>{body}</button>
    ) : (
      <div className={`${styles.sticky} ${styles.done}`} style={tone(card.column)}>{body}</div>
    );
  }

  if (editing) {
    return (
      <div className={styles.sticky} style={tone(card.column)}>
        <div className={styles.edit}>
          <textarea
            autoFocus
            value={draft}
            maxLength={RETRO_TEXT_MAX}
            aria-label={t('retro.editCard')}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                save();
              }
              if (e.key === 'Escape') {
                e.stopPropagation();
                setEditing(false);
              }
            }}
          />
          <div className={styles.editRow}>
            <button type="button" className="btn btn-small" onClick={() => setEditing(false)}>{t('common.cancel')}</button>
            <button type="button" className="btn btn-small btn-primary" disabled={!draft.trim()} onClick={save}>{t('common.save')}</button>
          </div>
        </div>
      </div>
    );
  }

  const canTapFocus = isModerator && discussing && state === 'upcoming';
  const onTap = canTapFocus ? () => retroFocus(card.id) : undefined;
  const editableActionMeta = isAction && isModerator && discussing;

  const owner = card.owner;
  const ownerChip = owner ? (
    <>
      <Avatar seed={owner.avatar} size={22} alt="" />
      <span>{owner.nickname}</span>
    </>
  ) : (
    <span className={styles.noOwner}><Icon name="hand" size={14} /> {t('retro.pickOwner')}</span>
  );

  return (
    <div ref={ref} className={`${styles.sticky} ${state === 'focus' ? styles.focus : ''} ${state === 'upcoming' ? styles.upcoming : ''}`}
      style={tone(card.column)} aria-current={state === 'focus' ? 'true' : undefined} data-card-id={card.id}
      onClick={onTap} role={onTap ? 'button' : undefined} tabIndex={onTap ? 0 : undefined}
      onKeyDown={onTap ? (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onTap()) : undefined}>
      {state === 'focus' && <span className={styles.focusTag}>{t('retro.nowDiscussing')}</span>}
      <p className={styles.text}>{card.text}</p>
      {isAction && card.sourceText && (
        <div className={styles.source}><Icon name="arrowRight" size={13} /><span>{card.sourceText}</span></div>
      )}
      {isAction && (
        <div className={styles.actionRow} onClick={(e) => e.stopPropagation()}>
          {editableActionMeta ? (
            <Menu label={t('retro.pickOwner')} trigger={ownerChip} triggerClassName={styles.owner} align="start" portal>
              {room.participants.map((p) => (
                <MenuItem key={p.id} onClick={() => retroSetAction(card.id, p.id, card.due ?? '')}>{p.nickname}</MenuItem>
              ))}
              {owner && <MenuItem icon="undo" onClick={() => retroSetAction(card.id, null, card.due ?? '')}>{t('retro.noOwner')}</MenuItem>}
            </Menu>
          ) : (
            <span className={styles.owner}>{ownerChip}</span>
          )}
          {editableActionMeta ? (
            <input key={card.due ?? ''} className={styles.dueInput} defaultValue={card.due ?? ''} maxLength={RETRO_DUE_MAX}
              placeholder={t('retro.duePlaceholder')} aria-label={t('retro.due')}
              onBlur={(e) => e.target.value.trim() !== (card.due ?? '') && retroSetAction(card.id, owner?.participantId ?? null, e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />
          ) : (
            card.due && <span className={styles.due}><Icon name="timer" size={13} />{card.due}</span>
          )}
        </div>
      )}
      <div className={styles.foot}>
        {mine ? (
          <span className={`${styles.by} ${styles.byMe}`}>{t('retro.you')}</span>
        ) : card.author ? (
          <span className={styles.by}><Avatar seed={card.author.avatar} size={20} alt="" />{card.author.nickname}</span>
        ) : null}
        {writing ? (
          <button type="button" className={`${styles.heart} ${liked ? styles.heartOn : ''}`} aria-pressed={liked}
            aria-label={`${t('retro.like')} (${card.likes})`} onClick={(e) => (e.stopPropagation(), likeRetroCard(card.id, !liked))}>
            <Icon name="heart" size={15} />{card.likes}
          </button>
        ) : !isAction ? (
          <span className={`${styles.heart} ${styles.heartStatic} ${state === 'focus' ? styles.heartOn : ''}`} aria-label={t('retro.likesCount', { count: card.likes })}>
            <Icon name="heart" size={15} />{card.likes}
          </span>
        ) : <span style={{ marginLeft: 'auto' }} />}
        {mine && retro.phase !== 'DONE' && (
          <span onClick={(e) => e.stopPropagation()}>
            <Menu label={t('retro.cardMenu')} portal triggerClassName={styles.mn}>
              <MenuItem icon="pencil" onClick={() => { setDraft(card.text); setEditing(true); }}>{t('retro.edit')}</MenuItem>
              <MenuItem icon="trash" danger onClick={remove}>{t('retro.delete')}</MenuItem>
            </Menu>
          </span>
        )}
      </div>
    </div>
  );
}
