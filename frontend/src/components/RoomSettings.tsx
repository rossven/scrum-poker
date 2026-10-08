import { useState, type FormEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { RoomState } from '../api/types';
import { useRoomStore } from '../store/roomStore';
import { DeckPicker, deckChoiceCards, deckChoiceValid, type DeckChoice } from './DeckPicker';
import { Dialog } from './Dialog';
import styles from './RoomSettings.module.css';

const VOLUNTEER_CHOICES = [10, 20, 30, 60, 0];

/** Anahtar satırı: başlık, açıklama ve sağda anahtar; tüm satır tıklanabilir. */
export function SwitchRow({ title, hint, on, onChange }: { title: string; hint: string; on: boolean; onChange: (on: boolean) => void }) {
  return (
    <button type="button" className={styles.row} role="switch" aria-checked={on} onClick={() => onChange(!on)}>
      <span className={styles.text}><b>{title}</b><span>{hint}</span></span>
      <span className={`sw ${on ? 'on' : ''}`} aria-hidden />
    </button>
  );
}

/**
 * Oda ayarları (krupiye): Otomatik aç, Dönüşümlü adalet, Gönüllü süresi, Ticket listesi, Deste, Şifre.
 * Değişiklikler "Kaydet" ile birlikte uygulanır; "Vazgeç" hiçbirini uygulamaz.
 */
export function RoomSettings({ room, onClose }: { room: RoomState; onClose: () => void }) {
  const { t } = useTranslation();
  const { setPassword, setDeck, closeRoom, setTicketsEnabled, setAutoReveal, setFairRotation, setVolunteerSeconds, toast } = useRoomStore();
  const [auto, setAuto] = useState(room.autoReveal);
  const [fair, setFair] = useState(room.fairRotation);
  const [seconds, setSeconds] = useState(room.volunteerSeconds);
  const [tickets, setTickets] = useState(room.ticketsEnabled);
  const [password, setPw] = useState('');
  const [deck, setDeckChoice] = useState<DeckChoice>({ deck: room.deck, customText: (room.customDeck ?? []).join(', ') });

  const deckChanged = deck.deck !== room.deck || (deck.deck === 'custom' && deck.customText !== (room.customDeck ?? []).join(', '));
  const valid = deckChoiceValid(deck);

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    if (deckChanged) {
      const hasVotes = room.round.state === 'VOTING' && room.round.votedIds.length > 0;
      if (hasVotes && !window.confirm(t('decks.changeConfirm'))) return;
      setDeck(deck.deck, deckChoiceCards(deck));
    }
    if (auto !== room.autoReveal) setAutoReveal(auto);
    if (fair !== room.fairRotation) setFairRotation(fair);
    if (seconds !== room.volunteerSeconds) setVolunteerSeconds(seconds);
    if (tickets !== room.ticketsEnabled) setTicketsEnabled(tickets);
    if (password) {
      setPassword(password);
      toast('room.passwordSaved');
    }
    onClose();
  };

  const close = () => {
    if (window.confirm(t('room.closeConfirm'))) closeRoom();
  };

  const group = (title: string, hint: string, control: ReactNode) => (
    <div className={styles.row} role="group" aria-label={title}>
      <span className={styles.text}><b>{title}</b><span>{hint}</span></span>
      {control}
    </div>
  );

  return (
    <Dialog title={t('room.settings')} onClose={onClose}>
      <form className={styles.form} onSubmit={save}>
        <div className={styles.rows}>
          <SwitchRow title={t('settings.autoReveal')} hint={t('settings.autoRevealHint')} on={auto} onChange={setAuto} />
          <SwitchRow title={t('assign.fairRotation')} hint={t('settings.fairHint')} on={fair} onChange={setFair} />
          {group(t('assign.volunteerTime'), t('settings.volunteerHint'), (
            <span className={styles.chips}>
              {VOLUNTEER_CHOICES.map((s) => (
                <button key={s} type="button" className={`${styles.chip} ${seconds === s ? styles.chipOn : ''}`} aria-pressed={seconds === s} onClick={() => setSeconds(s)}>
                  {s ? s : t('assign.noLimit')}
                </button>
              ))}
            </span>
          ))}
          <SwitchRow title={t('tickets.enable')} hint={tickets ? t('tickets.disableHint') : t('settings.ticketsOffHint')} on={tickets} onChange={setTickets} />
          <div className={styles.row}>
            <span className={styles.text}>
              <label htmlFor="room-password"><b>{t('settings.password')}</b></label>
              <span>{room.passwordProtected ? t('settings.passwordSet') : t('settings.passwordHint')}</span>
            </span>
            <input id="room-password" type="password" className="input" maxLength={64} autoComplete="new-password" placeholder={t('common.optional')}
              value={password} onChange={(e) => setPw(e.target.value)} />
          </div>
          <div className={`${styles.row} ${styles.deckRow}`}>
            <span className={styles.text}><label htmlFor="room-deck"><b>{t('decks.title')}</b></label><span>{t('decks.changeHint')}</span></span>
            <DeckPicker id="room-deck" value={deck} onChange={setDeckChoice} />
          </div>
          <div className={styles.row}>
            <span className={styles.text}><b>{t('room.closeRoom')}</b><span>{t('settings.closeHint')}</span></span>
            <button type="button" className="btn btn-danger btn-small" onClick={close}>{t('room.closeRoom')}</button>
          </div>
        </div>
        <div className={styles.footer}>
          <button type="button" className="btn" onClick={onClose}>{t('common.cancel')}</button>
          <button type="submit" className="btn btn-primary" disabled={!valid}>{t('common.save')}</button>
        </div>
      </form>
    </Dialog>
  );
}
