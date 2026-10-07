import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ParticipantView, RoomState } from '../api/types';
import { Avatar } from '../components/Avatar';
import { CopyLinkButton } from '../components/CopyLinkButton';
import { RoomSettings } from '../components/RoomSettings';
import { SoundToggle } from '../components/SoundToggle';
import { TableView } from '../components/TableView';
import { CardHand } from '../components/poker/CardHand';
import { EmptyCardSlot, PlayingCard } from '../components/poker/PlayingCard';
import { ResultsPanel } from '../components/poker/ResultsPanel';
import { RoundControls } from '../components/poker/RoundControls';
import { TableCenter } from '../components/poker/TableCenter';
import { TicketQueue } from '../components/poker/TicketQueue';
import { play } from '../lib/sound';
import { navigate } from '../lib/router';
import { useRoomStore } from '../store/roomStore';
import styles from './Lobby.module.css';

/** Oda ekranı: masa, kart eli, sonuçlar ve ticket kuyruğu. */
export function Lobby({ room, youId }: { room: RoomState; youId: string | null }) {
  const { t } = useTranslation();
  const { promote, leave, vote, setObserver, yourVote } = useRoomStore();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const me = room.participants.find((p) => p.id === youId);
  const isModerator = me?.moderator ?? false;
  const seated = room.participants.filter((p) => !p.observer);
  const observers = room.participants.filter((p) => p.observer);
  const round = room.round;
  const voting = round.state === 'VOTING';
  const voted = new Set(round.votedIds);
  const votesById = new Map((round.votes ?? []).map((v) => [v.participantId, v]));
  const stats = round.stats;
  // Kendi oyum yalnızca bu tura aitse geçerli (yeni turda/deste değişince sıfırlanır).
  const myCard = yourVote && yourVote.roundId === round.id ? (yourVote.card ?? null) : null;
  const iVoted = !!youId && voted.has(youId);
  const onlineVoters = seated.filter((p) => p.online);
  const allVoted = onlineVoters.length > 0 && onlineVoters.every((p) => voted.has(p.id));

  // Kartlar açılınca (ses açıksa) kısa bir ton.
  const prevState = useRef(round.state);
  useEffect(() => {
    if (prevState.current === 'VOTING' && round.state === 'REVEALED') play('reveal');
    prevState.current = round.state;
  }, [round.state]);

  const onLeave = () => {
    leave();
    navigate('/');
  };

  const renderCard = (p: ParticipantView) => {
    if (voting) return voted.has(p.id) ? <PlayingCard faceUp={false} /> : <EmptyCardSlot />;
    const v = votesById.get(p.id);
    if (!v) return <EmptyCardSlot />;
    const highlight = stats?.lowestIds.includes(p.id) ? 'low' : stats?.highestIds.includes(p.id) ? 'high' : undefined;
    return <PlayingCard faceUp value={v.card} highlight={highlight} dimmed={v.excluded} />;
  };

  const renderActions = (p: ParticipantView) => {
    if (!isModerator || p.id === youId) return null;
    const canObserve = !(voting && voted.has(p.id));
    return (
      <>
        {!p.moderator && (
          <button type="button" className="btn btn-ghost" onClick={() => promote(p.id)}>{t('room.makeModerator')}</button>
        )}
        {canObserve && (
          <button type="button" className="btn btn-ghost" onClick={() => setObserver(p.id, true)}>{t('room.makeObserver')}</button>
        )}
      </>
    );
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
            {' · '}
            {t(`decks.${room.deck}`)}
            {room.passwordProtected && <> · 🔒 {t('room.passwordProtected')}</>}
          </p>
        </div>
        <div className={styles.tools}>
          <CopyLinkButton code={room.code} />
          <SoundToggle />
          {me && (
            me.observer ? (
              <button type="button" className="btn btn-small" onClick={() => setObserver(null, false)}>{t('room.becomeParticipant')}</button>
            ) : (
              <button type="button" className="btn btn-ghost btn-small" disabled={voting && iVoted}
                title={voting && iVoted ? t('errors.ALREADY_VOTED') : undefined}
                onClick={() => setObserver(null, true)}>
                {t('room.becomeObserver')}
              </button>
            )
          )}
          {isModerator && (
            <button type="button" className="btn btn-small" onClick={() => setSettingsOpen((v) => !v)}>
              ⚙ {t('room.settings')}
            </button>
          )}
          <button type="button" className="btn btn-ghost btn-small" onClick={onLeave}>{t('room.leave')}</button>
        </div>
      </div>

      {settingsOpen && isModerator && <RoomSettings room={room} onClose={() => setSettingsOpen(false)} />}

      <div className={styles.layout}>
        <div className={styles.main}>
          {isModerator && <RoundControls room={room} allVoted={allVoted} />}

          <TableView
            people={seated}
            youId={youId}
            renderCard={renderCard}
            renderActions={renderActions}
            center={<TableCenter room={room} seatedCount={seated.length} allVoted={allVoted} />}
          />

          {!voting && stats && <ResultsPanel room={room} round={round} isModerator={isModerator} />}

          {me && !me.observer && (
            <CardHand cards={room.deckCards} selected={myCard} disabled={!voting} onVote={vote} />
          )}
          {me?.observer && <p className={`muted ${styles.observerNote}`}>{t('poker.observerNote')}</p>}
        </div>

        <aside className={styles.side}>
          <TicketQueue room={room} isModerator={isModerator} />
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
                    {isModerator && o.id !== youId && (
                      <span className={styles.observerTools}>
                        {!o.moderator && (
                          <button type="button" className="btn btn-ghost btn-small" onClick={() => promote(o.id)}>
                            {t('room.makeModerator')}
                          </button>
                        )}
                        <button type="button" className="btn btn-ghost btn-small" onClick={() => setObserver(o.id, false)}>
                          {t('room.makeParticipant')}
                        </button>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
