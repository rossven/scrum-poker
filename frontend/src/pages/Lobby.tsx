import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { RoomState } from '../api/types';
import { CopyLinkButton } from '../components/CopyLinkButton';
import { RoomSettings } from '../components/RoomSettings';
import { Avatar } from '../components/Avatar';
import { TableView } from '../components/TableView';
import { navigate } from '../lib/router';
import { useRoomStore } from '../store/roomStore';
import styles from './Lobby.module.css';

export function Lobby({ room, youId }: { room: RoomState; youId: string | null }) {
  const { t } = useTranslation();
  const promote = useRoomStore((s) => s.promote);
  const leave = useRoomStore((s) => s.leave);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const me = room.participants.find((p) => p.id === youId);
  const isModerator = me?.moderator ?? false;
  const seated = room.participants.filter((p) => !p.observer);
  const observers = room.participants.filter((p) => p.observer);

  const onLeave = () => {
    leave();
    navigate('/');
  };

  return (
    <div className={styles.lobby}>
      <div className={styles.topbar}>
        <div>
          <h1 className={styles.title}>{room.name ?? t('app.name')}</h1>
          <p className={styles.meta}>
            {t('room.code')}: <strong className={styles.code}>{room.code}</strong>
            {' · '}
            {t('room.count', { count: room.participants.length })}
            {room.passwordProtected && <> · 🔒 {t('room.passwordProtected')}</>}
          </p>
        </div>
        <div className={styles.tools}>
          <CopyLinkButton code={room.code} />
          {isModerator && (
            <button type="button" className="btn btn-small" onClick={() => setSettingsOpen((v) => !v)}>
              ⚙ {t('room.settings')}
            </button>
          )}
          <button type="button" className="btn btn-ghost btn-small" onClick={onLeave}>{t('room.leave')}</button>
        </div>
      </div>

      {settingsOpen && isModerator && <RoomSettings onClose={() => setSettingsOpen(false)} />}

      <TableView
        people={seated}
        youId={youId}
        canPromote={isModerator}
        onPromote={promote}
        center={
          <div className={styles.waiting}>
            <strong>{t('room.waitingTitle')}</strong>
            <span>{t('room.waitingBody')}</span>
          </div>
        }
      />

      {observers.length > 0 && (
        <section className={styles.observers} aria-label={t('room.observers')}>
          <h2 className={styles.sectionTitle}>{t('room.observers')}</h2>
          <ul>
            {observers.map((o) => (
              <li key={o.id} className={o.online ? '' : styles.away}>
                <Avatar seed={o.avatar} size={28} online={o.online} alt="" />
                <span>
                  {o.nickname}
                  {o.id === youId && <span className="muted"> ({t('room.you')})</span>}
                  {o.moderator && <span className="muted"> · ★</span>}
                </span>
                {isModerator && !o.moderator && (
                  <button type="button" className="btn btn-ghost btn-small" onClick={() => promote(o.id)}>
                    {t('room.makeModerator')}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
