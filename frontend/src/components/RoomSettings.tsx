import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { RoomState } from '../api/types';
import { useRoomStore } from '../store/roomStore';
import { DeckPicker, deckChoiceCards, deckChoiceValid, type DeckChoice } from './DeckPicker';
import styles from './RoomSettings.module.css';
import { Icon } from './Icon';

/** Krupiye paneli: ticket listesi aç/kapa, deste, şifre değiştir/kaldır, odayı kapat. */
export function RoomSettings({ room, onClose }: { room: RoomState; onClose: () => void }) {
  const { t } = useTranslation();
  const setPassword = useRoomStore((s) => s.setPassword);
  const setDeck = useRoomStore((s) => s.setDeck);
  const closeRoom = useRoomStore((s) => s.closeRoom);
  const setTicketsEnabled = useRoomStore((s) => s.setTicketsEnabled);
  const toast = useRoomStore((s) => s.toast);
  const [password, setPw] = useState('');
  const [deck, setDeckChoice] = useState<DeckChoice>({ deck: room.deck, customText: (room.customDeck ?? []).join(', ') });

  const save = (e: FormEvent) => {
    e.preventDefault();
    setPassword(password);
    setPw('');
    toast('room.passwordSaved');
    onClose();
  };

  const applyDeck = (e: FormEvent) => {
    e.preventDefault();
    if (!deckChoiceValid(deck)) return;
    const hasVotes = room.round.state === 'VOTING' && room.round.votedIds.length > 0;
    if (hasVotes && !window.confirm(t('decks.changeConfirm'))) return;
    setDeck(deck.deck, deckChoiceCards(deck));
    onClose();
  };

  const close = () => {
    if (window.confirm(t('room.closeConfirm'))) closeRoom();
  };

  return (
    <div className={`card ${styles.panel}`}>
      <h2 className={`panel-title ${styles.title}`}><Icon name="gear" size={18} />{t('room.settings')}</h2>
      <div className="field">
        <label className={styles.toggle}>
          <input type="checkbox" checked={room.ticketsEnabled} onChange={(e) => setTicketsEnabled(e.target.checked)} />
          <span>{t('tickets.enable')}</span>
        </label>
        <small>{room.ticketsEnabled ? t('tickets.disableHint') : t('tickets.enableHint')}</small>
      </div>
      <form onSubmit={applyDeck} className="field">
        <label htmlFor="room-deck">{t('decks.title')}</label>
        <DeckPicker id="room-deck" value={deck} onChange={setDeckChoice} />
        <small>{t('decks.changeHint')}</small>
        <div>
          <button type="submit" className="btn" disabled={!deckChoiceValid(deck)}>{t('decks.apply')}</button>
        </div>
      </form>
      <form onSubmit={save} className="field">
        <label htmlFor="new-password">{t('room.newPassword')}</label>
        <div className={styles.row}>
          <input id="new-password" type="password" className="input" maxLength={64} autoComplete="new-password"
            value={password} onChange={(e) => setPw(e.target.value)} />
          <button type="submit" className="btn">{t('common.save')}</button>
        </div>
      </form>
      <div className={styles.footer}>
        <button type="button" className="btn btn-ghost" onClick={onClose}>{t('common.cancel')}</button>
        <button type="button" className="btn btn-danger" onClick={close}>{t('room.closeRoom')}</button>
      </div>
    </div>
  );
}
