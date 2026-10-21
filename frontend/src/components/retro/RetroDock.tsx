import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { RetroView } from '../../api/types';
import { RETRO_COLUMNS, RETRO_TEXT_MAX, clock } from '../../lib/retro';
import { useRoomStore } from '../../store/roomStore';
import { Icon } from '../Icon';
import styles from './Retro.module.css';

/**
 * Konuşma çubuğu: hangi kartta olduğumuz, kartın süresi, önceki/sonraki. Krupiyede ek olarak "Aksiyon çıkar"
 * (konuşulan karttan yeni aksiyon) ve aksiyon kartında "Kim alacak?". Diğer katılımcılar yalnızca konumu görür.
 */
export function RetroDock({ retro, isModerator }: { retro: RetroView; isModerator: boolean }) {
  const { t } = useTranslation();
  const { retroStep, retroFinish, addRetroCard, startAssignment } = useRoomStore();
  const [now, setNow] = useState(() => Date.now());
  const [popOpen, setPopOpen] = useState(false);
  const [text, setText] = useState('');

  const order = retro.order ?? [];
  const byId = useMemo(() => new Map(retro.cards.map((c) => [c.id, c])), [retro.cards]);
  const focus = retro.focusId ? byId.get(retro.focusId) : undefined;
  const index = retro.focusId ? order.indexOf(retro.focusId) : -1;
  const last = index >= 0 && index === order.length - 1;

  // Kartta geçen süre: sunucunun söylediği süre, bu tarayıcının saatiyle ilerler.
  const base = useMemo(() => Date.now() - (retro.focusElapsedMs ?? 0), [retro.focusElapsedMs, retro.focusId]);
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  useEffect(() => setPopOpen(false), [retro.focusId]);
  const elapsed = Math.max(0, now - base);

  if (!focus) return null;
  const inColumn = order.filter((id) => byId.get(id)?.column === focus.column);
  const posInColumn = inColumn.indexOf(focus.id) + 1;
  const nextColumn = last ? null : byId.get(order[index + 1])?.column;
  const colName = t(`retro.columns.${RETRO_COLUMNS[focus.column].key}`);
  const sub = nextColumn !== null && nextColumn !== undefined && nextColumn !== focus.column && posInColumn === inColumn.length
    ? t('retro.dockNext', { column: t(`retro.columns.${RETRO_COLUMNS[nextColumn].key}`) })
    : t('retro.dockPos', { pos: posInColumn, total: inColumn.length });
  const label = `${t('retro.dockPos', { pos: index + 1, total: order.length })} · ${colName}`;

  const addAction = () => {
    const v = text.trim();
    if (!v) return;
    addRetroCard(2, v, focus.id);
    setText('');
    setPopOpen(false);
  };

  if (!isModerator) {
    return (
      <div className={styles.dockWrap}>
        <div className={styles.dock} role="status">
          <div className={styles.dockInfo}><b>{colName}</b><span>{label}</span></div>
          <div className={styles.ring} style={{ ['--p' as string]: Math.min(100, (elapsed / 300000) * 100) }} role="timer" aria-label={t('retro.cardTime')}><span>{clock(elapsed)}</span></div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.dockWrap}>
      {popOpen && focus.column !== 2 && (
        <form className={styles.pop} onSubmit={(e) => (e.preventDefault(), addAction())}>
          <label htmlFor="retro-action-text">{t('retro.actionFrom')}</label>
          <small>{focus.text}</small>
          <div className={styles.popRow}>
            <input id="retro-action-text" className="input" autoFocus value={text} maxLength={RETRO_TEXT_MAX} placeholder={t('retro.placeholder.2')}
              onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && setPopOpen(false)} />
            <button type="submit" className="btn btn-primary" disabled={!text.trim()}>{t('retro.add')}</button>
          </div>
        </form>
      )}
      <div className={styles.dock}>
        <button type="button" className="ib" style={{ borderRadius: 99 }} aria-label={t('retro.prev')} disabled={index <= 0} onClick={() => retroStep(-1)}>
          <Icon name="back" size={18} />
        </button>
        <div className={styles.dockInfo} aria-live="polite"><b>{colName}</b><span>{sub}</span></div>
        <div className={styles.ring} style={{ ['--p' as string]: Math.min(100, (elapsed / 300000) * 100) }} role="timer" aria-label={t('retro.cardTime')}>
          <span>{clock(elapsed)}</span>
        </div>
        {focus.column !== 2 ? (
          <button type="button" className="btn" aria-expanded={popOpen} onClick={() => setPopOpen((v) => !v)}>
            <Icon name="flag" size={16} />{t('retro.makeAction')}
          </button>
        ) : (
          <button type="button" className="btn" onClick={() => startAssignment(undefined, focus.id)}>
            <Icon name="hand" size={16} />{t('assign.title')}
          </button>
        )}
        {last ? (
          <button type="button" className="btn btn-primary" style={{ borderRadius: 99 }} onClick={retroFinish}>
            <Icon name="check" size={16} />{t('retro.finish')}
          </button>
        ) : (
          <button type="button" className="btn btn-primary" style={{ borderRadius: 99 }} onClick={() => retroStep(1)}>
            {t('retro.next')} <Icon name="arrowRight" size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
