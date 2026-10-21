import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { RetroView, RoomState } from '../../api/types';
import { Avatar } from '../Avatar';
import { Dialog } from '../Dialog';
import { Icon } from '../Icon';
import { downloadText, orderedCards, toCsv, toMarkdown, type ExportLabels } from '../../lib/retro';
import { useRoomStore } from '../../store/roomStore';
import styles from './Retro.module.css';

/** Retro bitti: sayılar, aksiyonlar ve dışa aktarma (Markdown, CSV, panoya kopyala). */
export function RetroSummary({ room, retro, isModerator }: { room: RoomState; retro: RetroView; isModerator: boolean; youId: string | null }) {
  const { t, i18n } = useTranslation();
  const { retroReopen, retroClose } = useRoomStore();
  const [copied, setCopied] = useState(false);
  const cards = orderedCards(retro);
  const actions = cards.filter((c) => c.column === 2);
  const likes = cards.reduce((n, c) => n + c.likes, 0);
  const title = `${room.name ?? t('app.name')} · ${t('retro.title')}`;
  const labels: ExportLabels = {
    title,
    columns: [t('retro.columns.well'), t('retro.columns.improve'), t('retro.columns.actions')],
    likes: (n) => t('retro.likesCount', { count: n }),
    noOwner: t('retro.noOwner'),
    from: t('retro.exportFrom'),
    date: new Date().toLocaleDateString(i18n.language),
  };
  const slug = (room.name ?? 'retro').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '') || 'retro';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(toMarkdown(retro, labels));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt(t('retro.copy'), toMarkdown(retro, labels));
    }
  };

  return (
    <Dialog title={t('retro.doneTitle')} onClose={isModerator ? retroReopen : undefined} size="wide">
      <div className={styles.sum}>
        <p className={styles.sumLead}>{t('retro.doneLead')}</p>
        <div className={styles.stats}>
          <div className={styles.stat}><b>{cards.length}</b><span>{t('retro.statCards')}</span></div>
          <div className={styles.stat}><b>{likes}</b><span>{t('retro.statLikes')}</span></div>
          <div className={styles.stat}><b>{actions.length}</b><span>{t('retro.statActions')}</span></div>
          <div className={styles.stat}><b>{room.participants.length}</b><span>{t('retro.statPeople')}</span></div>
        </div>
        <div>
          <h2 className={styles.sumTitle}>{t('retro.columns.actions')}</h2>
          {actions.length === 0 ? <p className="muted">{t('retro.noActions')}</p> : (
            <ul className={styles.actions}>
              {actions.map((a) => (
                <li key={a.id}>
                  <span className={styles.box} aria-hidden />
                  <span>{a.text}</span>
                  {a.due && <span className="muted">{a.due}</span>}
                  {a.owner ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Avatar seed={a.owner.avatar} size={22} alt="" />{a.owner.nickname}</span> : <span className="muted">{t('retro.noOwner')}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className={styles.exports}>
          <button type="button" className="btn" onClick={() => downloadText(`${slug}-retro.md`, 'text/markdown', toMarkdown(retro, labels))}>
            <Icon name="download" size={16} />{t('retro.exportMarkdown')}
          </button>
          <button type="button" className="btn" onClick={() => downloadText(`${slug}-retro.csv`, 'text/csv', toCsv(retro, { ...labels, header: [t('retro.csvColumn'), t('retro.csvText'), t('retro.csvLikes'), t('retro.csvAuthor'), t('retro.csvOwner'), t('retro.csvDue'), t('retro.csvSource')] }))}>
            <Icon name="download" size={16} />{t('retro.exportCsv')}
          </button>
          <button type="button" className="btn" onClick={copy} aria-live="polite">
            <Icon name={copied ? 'check' : 'copy'} size={16} />{copied ? t('retro.copied') : t('retro.copy')}
          </button>
        </div>
        {isModerator ? (
          <div className={styles.sumFoot}>
            <button type="button" className="btn" onClick={retroReopen}>{t('retro.reopen')}</button>
            <button type="button" className="btn btn-primary" onClick={retroClose}>{t('retro.backToTable')}</button>
          </div>
        ) : (
          <p className="muted" style={{ margin: 0 }}>{t('retro.waitDealer')}</p>
        )}
      </div>
    </Dialog>
  );
}
