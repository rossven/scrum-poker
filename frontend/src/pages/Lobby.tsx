import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ParticipantView, RoomState } from '../api/types';
import { Avatar } from '../components/Avatar';
import { Dialog } from '../components/Dialog';
import { RoomHeader } from '../components/RoomHeader';
import { Sidebar } from '../components/Sidebar';
import { Icon } from '../components/Icon';
import { RoomSettings } from '../components/RoomSettings';
import { TableView } from '../components/TableView';
import { AssignmentPanel } from '../components/assign/AssignmentPanel';
import { CardHand } from '../components/poker/CardHand';
import { EmojiBar } from '../components/poker/EmojiBar';
import { isRoyalFlush, RoyalFlushCelebration } from '../components/poker/FunFx';
import { TopicField } from '../components/poker/TopicField';
import { Timer } from '../components/poker/Timer';
import { EmptyCardSlot, PlayingCard } from '../components/poker/PlayingCard';
import { ResultsPanel } from '../components/poker/ResultsPanel';
import { RoundControls } from '../components/poker/RoundControls';
import { TableCenter } from '../components/poker/TableCenter';
import { cardTone, splitTicketTitle } from '../lib/deck';
import { useGameTiming } from '../lib/gameClock';
import { play } from '../lib/sound';
import { navigate } from '../lib/router';
import { useRoomStore } from '../store/roomStore';
import styles from './Lobby.module.css';

/** Oda ekranı: masa, kart eli, sonuçlar; ticket listesi açıksa yanda kuyruk. */
export function Lobby({ room, youId }: { room: RoomState; youId: string | null }) {
  const { t } = useTranslation();
  const { promote, leave, vote, setObserver, nudge, kick, reveal, newRound, yourVote, flyingEmojis, nudges } = useRoomStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [celebrate, setCelebrate] = useState(0);

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
  const ticket = round.ticketId ? room.tickets.find((tk) => tk.id === round.ticketId) : undefined;
  const hasPending = room.ticketsEnabled && room.tickets.some((tk) => tk.status === 'PENDING' && tk.id !== round.ticketId);
  const onlineVoters = seated.filter((p) => p.online);
  const allVoted = onlineVoters.length > 0 && onlineVoters.every((p) => voted.has(p.id));
  // "Kim alacak?" oyunu sürerken sonuç ticket listesinde ve geçmişte görünmez (sürprizi bozmasın).
  const assignment = room.assignment;
  const timing = useGameTiming(assignment);
  const hiddenResultId = timing.stage === 'waiting' || timing.stage === 'running' ? assignment?.result?.id ?? null : null;

  // Masadan at: yanlış tıklamaya karşı yalnızca krupiyenin ekranında onay.
  const confirmKick = (p: ParticipantView) => {
    if (window.confirm(t('room.kickConfirm', { name: p.nickname }))) kick(p.id);
  };

  // Kartlar açılınca (ses açıksa) fiş sesi; herkes aynı kartı seçtiyse Royal Flush kutlaması.
  // Yeni turda kartlar dağıtılırken karıştırma sesi.
  const prevState = useRef(round.state);
  const prevRound = useRef(round.id);
  useEffect(() => {
    if (prevState.current === 'VOTING' && round.state === 'REVEALED') {
      play('reveal');
      if (isRoyalFlush(round.stats)) {
        play('fanfare');
        setCelebrate((n) => n + 1);
      }
    }
    if (prevRound.current !== round.id && round.state === 'VOTING') play('shuffle');
    prevState.current = round.state;
    prevRound.current = round.id;
  }, [round.state, round.id, round.stats]);
  useEffect(() => {
    if (!celebrate) return;
    const timer = setTimeout(() => setCelebrate(0), 3200);
    return () => clearTimeout(timer);
  }, [celebrate]);

  const onLeave = () => {
    leave();
    navigate('/');
  };

  const renderCard = (p: ParticipantView) => {
    if (voting) return voted.has(p.id) ? <PlayingCard faceUp={false} /> : <EmptyCardSlot />;
    const v = votesById.get(p.id);
    if (!v) return <EmptyCardSlot />;
    const highlight = stats?.lowestIds.includes(p.id) ? 'low' : stats?.highestIds.includes(p.id) ? 'high' : undefined;
    return <PlayingCard faceUp size="md" value={v.card} tone={cardTone(room.deckCards, v.card)} highlight={highlight} dimmed={v.excluded} />;
  };

  const renderActions = (p: ParticipantView) => {
    if (!isModerator || p.id === youId) return null;
    const canObserve = !(voting && voted.has(p.id));
    const canNudge = voting && !voted.has(p.id) && p.online;
    return (
      <>
        {canNudge && (
          <button type="button" className="btn btn-ghost" onClick={() => nudge(p.id)}><Icon name="nudge" size={14} /> {t('poker.nudge')}</button>
        )}
        {!p.moderator && (
          <button type="button" className="btn btn-ghost" onClick={() => promote(p.id)}><Icon name="crown" size={14} /> {t('room.makeModerator')}</button>
        )}
        {canObserve && (
          <button type="button" className="btn btn-ghost" onClick={() => setObserver(p.id, true)}><Icon name="eye" size={14} /> {t('room.makeObserver')}</button>
        )}
        <button type="button" className="btn btn-ghost btn-danger" onClick={() => confirmKick(p)}><Icon name="kick" size={14} /> {t('room.kick')}</button>
      </>
    );
  };

  // 'R': krupiye için kartları aç / yeni tur (yazı alanındayken çalışmaz).
  useEffect(() => {
    if (!isModerator) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'r' || e.ctrlKey || e.metaKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      if (settingsOpen || assignment) return;
      if (voting) {
        if (round.votedIds.length > 0) reveal();
      } else {
        newRound();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isModerator, voting, round.votedIds.length, settingsOpen, assignment, reveal, newRound]);

  // Ekran okuyucu: oylama ve açılış duyuruları.
  useEffect(() => {
    if (voting) setAnnouncement(t('a11y.votes', { voted: round.votedIds.length, total: seated.length }));
    else setAnnouncement(stats ? t('a11y.revealed') : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round.votedIds.length, round.state, round.id]);

  const observerList = observers.length > 0 && (
    <section className={styles.observers} aria-label={t('room.observers')}>
      <h2 className={styles.sectionTitle}><Icon name="eye" size={14} />{t('room.observers')}</h2>
      <ul>
        {observers.map((o) => (
          <li key={o.id} className={o.online ? '' : styles.away}>
            <Avatar seed={o.avatar} size={28} online={o.online} alt="" />
            <span>
              {o.nickname}
              {o.id === youId && <span className="muted"> ({t('room.you')})</span>}
              {o.moderator && <span className="muted"> · {t('room.moderator')}</span>}
            </span>
            {isModerator && o.id !== youId && (
              <span className={styles.observerTools}>
                {!o.moderator && (
                  <button type="button" className="btn btn-ghost btn-small" onClick={() => promote(o.id)}>{t('room.makeModerator')}</button>
                )}
                <button type="button" className="btn btn-ghost btn-small" onClick={() => setObserver(o.id, false)}>{t('room.makeParticipant')}</button>
                <button type="button" className="btn btn-ghost btn-small btn-danger" onClick={() => confirmKick(o)}>{t('room.kick')}</button>
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );

  const renderStatus = (p: ParticipantView) => {
    if (!voting) return null;
    return voted.has(p.id) ? t('seat.voted') : t('seat.thinking');
  };

  const sidebar = (
    <Sidebar room={room} isModerator={isModerator} hiddenResultId={hiddenResultId} observers={observerList || null} />
  );
  const hasSidebar = true;
  const parts = ticket ? splitTicketTitle(ticket.title) : null;
  const queueLabel = room.ticketsEnabled
    ? t('tickets.progress', { done: room.tickets.filter((tk) => tk.status === 'ESTIMATED').length, total: room.tickets.length })
    : t('sidebar.history');

  return (
    <div className={styles.room}>
      <RoomHeader
        room={room}
        me={me}
        isModerator={isModerator}
        waiting={seated.filter((p) => !voted.has(p.id)).length}
        voting={voting}
        hasSidebar={hasSidebar}
        onSettings={() => setSettingsOpen(true)}
        onSidebar={() => setSheetOpen(true)}
        onLeave={onLeave}
        onObserver={(o) => setObserver(null, o)}
        observerLocked={voting && iVoted}
      />

      <div className={styles.body}>
        <main className={styles.stage}>
          <div className={styles.heading}>
            {parts ? (
              <h2 className={styles.ticket}>
                {parts.key && <span className={styles.key}>{parts.key}</span>}
                <span>{parts.text}</span>
              </h2>
            ) : isModerator && voting ? (
              <TopicField topic={round.topic} />
            ) : (
              <h2 className={styles.ticket}>{round.topic ? <span>{round.topic}</span> : <span className={styles.free}>{t('poker.freeRound')}</span>}</h2>
            )}
            <div className={styles.headingTools}>
              {room.timer && <Timer timer={room.timer} />}
              <button type="button" className={`btn btn-small ${styles.phoneOnly}`} onClick={() => setSheetOpen(true)}>
                <Icon name="ticket" size={16} />{queueLabel}
              </button>
            </div>
          </div>

          <TableView
            people={seated}
            youId={youId}
            renderCard={renderCard}
            renderActions={renderActions}
            renderStatus={renderStatus}
            roomName={room.name ?? undefined}
            center={<TableCenter room={room} seatedCount={seated.length} allVoted={allVoted} isModerator={isModerator} />}
            dealKey={round.id}
            revealKey={voting ? null : round.id}
            emojis={flyingEmojis}
            nudges={nudges}
          />

          <div className={styles.toolbar}>
            {isModerator && <RoundControls room={room} youId={youId} hasPending={hasPending} />}
            {me && <EmojiBar />}
          </div>

          <div className={`${styles.dock} ${!voting && stats ? '' : styles.dockHand}`}>
            {!voting && stats ? (
              <ResultsPanel room={room} round={round} isModerator={isModerator} hasPending={hasPending} />
            ) : me && !me.observer ? (
              <CardHand cards={room.deckCards} selected={myCard} disabled={!voting} onVote={vote} dealKey={round.id} />
            ) : (
              <p className={`muted ${styles.observerNote}`}>{me?.observer ? t('poker.observerNote') : ''}</p>
            )}
          </div>
        </main>

        <aside className={styles.side} aria-label={t('sidebar.label')}>{sidebar}</aside>
      </div>

      {sheetOpen && (
        <Dialog title={room.ticketsEnabled ? t('tickets.title') : t('sidebar.history')} onClose={() => setSheetOpen(false)}>
          <div className={styles.sheet}>{sidebar}</div>
        </Dialog>
      )}
      {settingsOpen && isModerator && <RoomSettings room={room} onClose={() => setSettingsOpen(false)} />}
      {assignment && (
        <AssignmentPanel room={room} assignment={assignment} youId={youId} isModerator={isModerator} timing={timing} hasPending={hasPending} />
      )}
      <div className="visually-hidden" role="status" aria-live="polite">{announcement}</div>
      {celebrate > 0 && <RoyalFlushCelebration key={celebrate} />}
    </div>
  );
}
