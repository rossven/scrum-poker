import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { RoomState, TicketView } from '../../api/types';
import { useRoomStore } from '../../store/roomStore';
import styles from './TicketQueue.module.css';
import { Icon } from '../Icon';

const URL_IN_LINE = /(https?:\/\/\S+)/i;

/**
 * Toplu yapıştırma: her satır bir ticket. Satırda bir link varsa ticket'ın linki olur,
 * geri kalanı başlık ("ABC-12 Giriş sayfası https://jira/...").
 */
export function parseTicketLines(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const link = URL_IN_LINE.exec(line)?.[1];
      const title = (link ? line.replace(link, '') : line).replace(/\s+[-|–]\s*$/, '').trim();
      return { title: title || link || line, link };
    })
    .map((t) => ({ title: t.title.slice(0, 120), link: t.link }));
}

/** Ticket kuyruğu: herkes görür, moderatör ekler/sıralar/siler/masaya getirir. */
export function TicketQueue({ room, isModerator, hiddenResultId }: {
  room: RoomState;
  isModerator: boolean;
  /** Oyun sürerken bu sonucun ataması henüz gösterilmez. */
  hiddenResultId?: string | null;
}) {
  const { t } = useTranslation();
  const { addTickets, moveTicket, removeTicket, selectTicket } = useRoomStore();
  const [text, setText] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const parsed = parseTicketLines(text);

  const add = (e: FormEvent) => {
    e.preventDefault();
    if (parsed.length === 0) return;
    addTickets(parsed);
    setText('');
  };

  const estimated = room.tickets.filter((tk) => tk.status === 'ESTIMATED').length;
  const hiddenTicketId = hiddenResultId ? room.assignment?.result?.ticketId : undefined;

  return (
    <section className={`card ${styles.panel}`} aria-label={t('tickets.title')}>
      <div className={styles.head}>
        <h2 className={`panel-title ${styles.title}`}><Icon name="ticket" size={18} />{t('tickets.title')}</h2>
        {room.tickets.length > 0 && (
          <span className="muted">{t('tickets.progress', { done: estimated, total: room.tickets.length })}</span>
        )}
      </div>

      {room.tickets.length === 0 && <p className="muted">{isModerator ? t('tickets.emptyModerator') : t('tickets.empty')}</p>}

      <ol className={styles.list}>
        {room.tickets.map((tk, i) =>
          editing === tk.id ? (
            <TicketEditor key={tk.id} ticket={tk} onDone={() => setEditing(null)} />
          ) : (
            <li key={tk.id} className={`${styles.item} ${tk.id === room.currentTicketId ? styles.current : ''}`}>
              <div className={styles.row}>
                <span className={styles.ticketTitle}>
                  {tk.link ? (
                    <a href={tk.link} target="_blank" rel="noopener noreferrer">{tk.title}</a>
                  ) : (
                    tk.title
                  )}
                </span>
                {tk.status === 'ESTIMATED' && <span className={styles.final} title={t('tickets.final')}>{tk.finalEstimate}</span>}
                {tk.id === room.currentTicketId && <span className={styles.nowBadge}>{t('tickets.onTable')}</span>}
              </div>
              {tk.assignee && tk.id !== hiddenTicketId && (
                <p className={styles.assignee}><Icon name="hand" size={14} /> {t('tickets.assignee', { name: tk.assignee.nickname })}</p>
              )}
              {tk.note && <p className={styles.note}>{tk.note}</p>}
              {tk.history.length > 0 && (
                <details className={styles.history}>
                  <summary>{t('tickets.history', { count: tk.history.length })}</summary>
                  <ul>
                    {tk.history.map((r, idx) => (
                      <li key={idx}>
                        <strong>{t('poker.roundN', { n: r.number })}</strong>
                        {r.finalEstimate && <> · <Icon name="check" size={13} /> {r.finalEstimate}</>}
                        {' · '}
                        {r.votes.map((v) => `${v.nickname}: ${v.card}`).join(', ') || t('tickets.noVotes')}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              {isModerator && (
                <div className={styles.tools}>
                  {tk.id !== room.currentTicketId && (
                    <button type="button" className="btn btn-small" onClick={() => selectTicket(tk.id)}>
                      {t('tickets.bring')}
                    </button>
                  )}
                  <button type="button" className="btn btn-ghost btn-small" disabled={i === 0}
                    onClick={() => moveTicket(tk.id, i - 1)} aria-label={t('tickets.moveUp')}><Icon name="arrowUp" size={14} /></button>
                  <button type="button" className="btn btn-ghost btn-small" disabled={i === room.tickets.length - 1}
                    onClick={() => moveTicket(tk.id, i + 1)} aria-label={t('tickets.moveDown')}><Icon name="arrowDown" size={14} /></button>
                  <button type="button" className="btn btn-ghost btn-small" onClick={() => setEditing(tk.id)}>
                    {t('tickets.edit')}
                  </button>
                  <button type="button" className="btn btn-ghost btn-small btn-danger"
                    onClick={() => window.confirm(t('tickets.removeConfirm')) && removeTicket(tk.id)}>
                    {t('tickets.remove')}
                  </button>
                </div>
              )}
            </li>
          ),
        )}
      </ol>

      {isModerator && (
        <form onSubmit={add} className={`field ${styles.add}`}>
          <label htmlFor="ticket-lines">{t('tickets.add')}</label>
          <textarea id="ticket-lines" className={`input ${styles.textarea}`} rows={3} value={text}
            placeholder={t('tickets.addPlaceholder')} onChange={(e) => setText(e.target.value)} />
          <small>{t('tickets.addHint')}</small>
          <button type="submit" className="btn" disabled={parsed.length === 0}>
            {t('tickets.addButton', { count: parsed.length })}
          </button>
        </form>
      )}
    </section>
  );
}

function TicketEditor({ ticket, onDone }: { ticket: TicketView; onDone: () => void }) {
  const { t } = useTranslation();
  const updateTicket = useRoomStore((s) => s.updateTicket);
  const [title, setTitle] = useState(ticket.title);
  const [link, setLink] = useState(ticket.link ?? '');
  const [note, setNote] = useState(ticket.note ?? '');

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    updateTicket(ticket.id, { title: title.trim(), link: link.trim() || undefined, note: note.trim() || undefined });
    onDone();
  };

  return (
    <li className={`${styles.item} ${styles.editor}`}>
      <form onSubmit={save} className={styles.editForm}>
        <input className="input" aria-label={t('tickets.fieldTitle')} placeholder={t('tickets.fieldTitle')} maxLength={120}
          value={title} onChange={(e) => setTitle(e.target.value)} required />
        <input className="input" aria-label={t('tickets.fieldLink')} placeholder="https://…" maxLength={500} type="url"
          value={link} onChange={(e) => setLink(e.target.value)} />
        <textarea className={`input ${styles.textarea}`} aria-label={t('tickets.fieldNote')} placeholder={t('tickets.fieldNote')}
          maxLength={500} rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        <div className={styles.tools}>
          <button type="button" className="btn btn-ghost btn-small" onClick={onDone}>{t('common.cancel')}</button>
          <button type="submit" className="btn btn-small btn-primary">{t('common.save')}</button>
        </div>
      </form>
    </li>
  );
}
