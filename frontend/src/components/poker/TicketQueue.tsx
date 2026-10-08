import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { RoomState, TicketView } from '../../api/types';
import { useRoomStore } from '../../store/roomStore';
import styles from './TicketQueue.module.css';
import { splitTicketTitle } from '../../lib/deck';
import { Icon } from '../Icon';
import { Menu, MenuItem } from '../Menu';

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

/**
 * Ticket kuyruğu: satırda yalnızca anahtar, başlık ve tahmin. Satıra tıklayınca (krupiye) masaya gelir;
 * düzenle, sil ve taşı satırın "⋯" menüsünde; sıralamak için sürükle-bırak da çalışır.
 */
export function TicketQueue({ room, isModerator, hiddenResultId }: {
  room: RoomState;
  isModerator: boolean;
  /** Oyun sürerken bu sonucun ataması henüz gösterilmez. */
  hiddenResultId?: string | null;
}) {
  const { t } = useTranslation();
  const { addTickets, moveTicket, removeTicket, selectTicket } = useRoomStore();
  const [text, setText] = useState('');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const parsed = parseTicketLines(text);

  const add = (e: FormEvent) => {
    e.preventDefault();
    if (parsed.length === 0) return;
    addTickets(parsed);
    setText('');
    setAdding(false);
  };

  const hiddenTicketId = hiddenResultId ? room.assignment?.result?.ticketId : undefined;

  return (
    <div className={styles.queue}>
      {room.tickets.length === 0 && <p className="muted">{isModerator ? t('tickets.emptyModerator') : t('tickets.empty')}</p>}

      <ol className={styles.list}>
        {room.tickets.map((tk, i) => {
          if (editing === tk.id) return <TicketEditor key={tk.id} ticket={tk} onDone={() => setEditing(null)} />;
          const { key, text: title } = splitTicketTitle(tk.title);
          const current = tk.id === room.currentTicketId;
          const done = tk.status === 'ESTIMATED';
          return (
            <li
              key={tk.id}
              className={`${styles.item} ${dragId === tk.id ? styles.dragging : ''}`}
              draggable={isModerator}
              onDragStart={() => setDragId(tk.id)}
              onDragEnd={() => setDragId(null)}
              onDragOver={(e) => isModerator && dragId && e.preventDefault()}
              onDrop={() => {
                if (dragId && dragId !== tk.id) moveTicket(dragId, i);
                setDragId(null);
              }}
            >
              <button type="button" className={`${styles.tk} ${current ? styles.cur : ''} ${done ? styles.done : ''}`}
                disabled={!isModerator || current} onClick={() => selectTicket(tk.id)}
                title={isModerator && !current ? t('tickets.bring') : undefined}>
                <span className={styles.k}>{[key, current ? t('tickets.onTable') : ''].filter(Boolean).join(' · ') || '\u00a0'}</span>
                <span className={styles.e} title={done ? t('tickets.final') : undefined}>{done ? tk.finalEstimate : '–'}</span>
                <span className={styles.t}>{title}</span>
              </button>
              {isModerator && (
                <span className={styles.rowMenu}>
                  <Menu label={t('tickets.rowMenu', { title })} triggerClassName={styles.menuBtn} align="end">
                    {!current && <MenuItem icon="play" onClick={() => selectTicket(tk.id)}>{t('tickets.bring')}</MenuItem>}
                    <MenuItem icon="pencil" onClick={() => setEditing(tk.id)}>{t('tickets.edit')}</MenuItem>
                    <MenuItem icon="arrowUp" disabled={i === 0} onClick={() => moveTicket(tk.id, i - 1)}>{t('tickets.moveUp')}</MenuItem>
                    <MenuItem icon="arrowDown" disabled={i === room.tickets.length - 1} onClick={() => moveTicket(tk.id, i + 1)}>{t('tickets.moveDown')}</MenuItem>
                    <MenuItem icon="close" danger onClick={() => window.confirm(t('tickets.removeConfirm')) && removeTicket(tk.id)}>{t('tickets.remove')}</MenuItem>
                  </Menu>
                </span>
              )}
              {(tk.link || tk.note || (tk.assignee && tk.id !== hiddenTicketId)) && (
                <div className={styles.meta}>
                  {tk.assignee && tk.id !== hiddenTicketId && (
                    <span className={styles.assignee}><Icon name="hand" size={13} /> {t('tickets.assignee', { name: tk.assignee.nickname })}</span>
                  )}
                  {tk.link && <a href={tk.link} target="_blank" rel="noopener noreferrer"><Icon name="link" size={13} /> {t('tickets.openLink')}</a>}
                  {tk.note && <span className={styles.note}>{tk.note}</span>}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {isModerator && !adding && (
        <button type="button" className={styles.addBtn} onClick={() => setAdding(true)}>
          <Icon name="plus" size={16} /> {t('tickets.addOrPaste')}
        </button>
      )}
      {isModerator && adding && (
        <form onSubmit={add} className={`field ${styles.add}`}>
          <label htmlFor="ticket-lines">{t('tickets.add')}</label>
          <textarea id="ticket-lines" className={`input ${styles.textarea}`} rows={3} value={text} autoFocus
            placeholder={t('tickets.addPlaceholder')} onChange={(e) => setText(e.target.value)} />
          <small>{t('tickets.addHint')}</small>
          <div className={styles.tools}>
            <button type="button" className="btn btn-ghost btn-small" onClick={() => { setAdding(false); setText(''); }}>{t('common.cancel')}</button>
            <button type="submit" className="btn btn-small btn-primary" disabled={parsed.length === 0}>
              {t('tickets.addButton', { count: parsed.length })}
            </button>
          </div>
        </form>
      )}
    </div>
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
    <li className={styles.editor}>
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
