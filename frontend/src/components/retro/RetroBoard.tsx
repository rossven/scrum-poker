import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { RetroCardView, RetroView, RoomState } from '../../api/types';
import { RETRO_COLUMNS } from '../../lib/retro';
import { useRoomStore } from '../../store/roomStore';
import { Icon } from '../Icon';
import { Timer } from '../poker/Timer';
import { RetroComposer } from './RetroComposer';
import { RetroDock } from './RetroDock';
import { RetroSticky, tone, type CardState } from './RetroSticky';
import { RetroSummary } from './RetroSummary';
import styles from './Retro.module.css';

interface Props {
  room: RoomState;
  retro: RetroView;
  youId: string | null;
  isModerator: boolean;
}

/**
 * Retro panosu. Yaz ve beğen: herkes her sütuna yazar, kartlar herkese açıktır, herkes beğenir.
 * Konuş: sütunlar soldan sağa, her sütun beğeniye göre; krupiye kartları sırayla gezdirir ve aksiyon çıkarır.
 * Bitir: özet ve dışa aktarma penceresi.
 */
export function RetroBoard({ room, retro, youId, isModerator }: Props) {
  const { t } = useTranslation();
  const yourRetro = useRoomStore((s) => s.yourRetro);
  const { retroStartDiscussion, retroBackToWriting, retroFinish } = useRoomStore();
  const [tab, setTab] = useState(0);

  const writing = retro.phase === 'WRITING';
  const discussing = retro.phase === 'DISCUSSING';
  const mine = yourRetro && yourRetro.retroId === retro.id ? yourRetro : null;
  const mineIds = useMemo(() => new Set(mine?.cardIds ?? []), [mine]);
  const likedIds = useMemo(() => new Set(mine?.likedIds ?? []), [mine]);

  const order = retro.order ?? [];
  const focusIndex = retro.focusId ? order.indexOf(retro.focusId) : -1;
  const rank = useMemo(() => new Map(order.map((id, i) => [id, i])), [order]);
  const focusCard = retro.cards.find((c) => c.id === retro.focusId);

  // Konuşurken telefonda sekme odaktaki kartın sütununa geçer.
  useEffect(() => {
    if (discussing && focusCard) setTab(focusCard.column);
  }, [discussing, focusCard?.column, retro.focusId]);

  const cardsOf = (column: number): RetroCardView[] => {
    const list = retro.cards.filter((c) => c.column === column);
    // Yazarken en yeni üstte; konuşurken konuşma sırasında.
    return writing ? [...list].reverse() : list.sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));
  };

  const stateOf = (card: RetroCardView): CardState => {
    if (!discussing) return 'normal';
    const i = rank.get(card.id) ?? 0;
    return i < focusIndex ? 'done' : i === focusIndex ? 'focus' : 'upcoming';
  };

  const focusInActions = discussing && focusCard?.column === 2;
  const empty = retro.cards.length === 0;

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <div className={styles.steps} aria-label={t('retro.phases')}>
          <span className={`${styles.step} ${writing ? styles.stepOn : styles.stepOk}`} aria-current={writing ? 'step' : undefined}>
            <b>{writing ? '1' : <Icon name="check" size={12} />}</b>{t('retro.stepWrite')}
          </span>
          <span className={`${styles.step} ${!writing ? styles.stepOn : ''}`} aria-current={!writing ? 'step' : undefined}>
            <b>2</b>{t('retro.stepDiscuss')}
          </span>
        </div>
        <span className={styles.note}>
          {writing && <><Icon name={retro.anonymous ? 'eyeOff' : 'eye'} size={15} />{retro.anonymous ? t('retro.noteAnonymous') : t('retro.noteNamed')}</>}
          {discussing && t('retro.noteDiscuss')}
        </span>
        <span className={styles.grow} />
        {writing && retro.timer && <Timer timer={retro.timer} />}
        {isModerator && writing && (
          <button type="button" className="btn btn-primary" disabled={empty} onClick={retroStartDiscussion}>
            {t('retro.startDiscussion')} <Icon name="arrowRight" size={16} />
          </button>
        )}
        {isModerator && discussing && (
          <>
            <button type="button" className="btn" onClick={retroBackToWriting}>{t('retro.backToWriting')}</button>
            <button type="button" className="btn btn-primary" onClick={retroFinish}><Icon name="check" size={16} />{t('retro.finish')}</button>
          </>
        )}
      </div>

      <div className={styles.tabs} role="tablist" aria-label={t('retro.columnsLabel')}>
        {RETRO_COLUMNS.map((c) => (
          <button key={c.id} type="button" role="tab" aria-selected={tab === c.id} style={tone(c.id)}
            className={`${styles.tab} ${tab === c.id ? styles.tabOn : ''}`} onClick={() => setTab(c.id)}>
            <Icon name={c.icon} size={16} />{t(`retro.columnsShort.${c.key}`)}
            <span className={styles.tabCount}>{cardsOf(c.id).length}</span>
          </button>
        ))}
      </div>

      <div className={styles.cols}>
        {RETRO_COLUMNS.map((c) => {
          const cards = cardsOf(c.id);
          const doneCount = cards.filter((x) => stateOf(x) === 'done').length;
          const count = discussing ? `${doneCount} / ${cards.length}` : String(cards.length);
          const size = focusInActions ? (c.id === 2 ? styles.colWide : styles.colNarrow) : '';
          return (
            <section key={c.id} className={`${styles.col} ${size} ${tab === c.id ? styles.colActive : ''}`} style={tone(c.id)}
              aria-label={t(`retro.columns.${c.key}`)}>
              <div className={styles.colHead}>
                <span className={styles.colIcon}><Icon name={c.icon} size={20} /></span>
                <div className={styles.colTitle}><b>{t(`retro.columns.${c.key}`)}</b><span>{t(`retro.prompts.${c.key}`)}</span></div>
                <span className={styles.colCount}>{count}</span>
              </div>
              {writing && <RetroComposer column={c.id} retro={retro} likedIds={likedIds} />}
              <div className={styles.colBody}>
                {cards.length === 0 && !writing && <p className={styles.empty}>{t('retro.emptyColumn')}</p>}
                {cards.map((card) => (
                  <RetroSticky key={card.id} card={card} retro={retro} room={room} mine={mineIds.has(card.id)}
                    liked={likedIds.has(card.id)} state={stateOf(card)} isModerator={isModerator} />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {discussing && (empty
        ? <p className={styles.empty}>{t('retro.emptyDiscussion')}</p>
        : <RetroDock retro={retro} isModerator={isModerator} />)}
      {retro.phase === 'DONE' && <RetroSummary room={room} retro={retro} isModerator={isModerator} youId={youId} />}
    </div>
  );
}
