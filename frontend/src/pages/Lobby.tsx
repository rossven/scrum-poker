import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ParticipantView, RoomState } from '../api/types';
import { Avatar } from '../components/Avatar';
import { CopyLinkButton } from '../components/CopyLinkButton';
import { Icon } from '../components/Icon';
import { RoomSettings } from '../components/RoomSettings';
import { SoundToggle } from '../components/SoundToggle';
import { TableView } from '../components/TableView';
import { AssignmentHistory } from '../components/assign/AssignmentHistory';
import { AssignmentPanel } from '../components/assign/AssignmentPanel';
import { CardHand } from '../components/poker/CardHand';
import { EmojiBar } from '../components/poker/EmojiBar';
import { isRoyalFlush, RoyalFlushCelebration } from '../components/poker/FunFx';
import { SessionHistory } from '../components/poker/SessionHistory';
import { EmptyCardSlot, PlayingCard } from '../components/poker/PlayingCard';
import { ResultsPanel } from '../components/poker/ResultsPanel';
import { RoundControls } from '../components/poker/RoundControls';
import { TableCenter } from '../components/poker/TableCenter';
import { TicketQueue } from '../components/poker/TicketQueue';
import { useGameTiming } from '../lib/gameClock';
import { play } from '../lib/sound';
import { navigate } from '../lib/router';
import { useRoomStore } from '../store/roomStore';
import styles from './Lobby.module.css';

/** Oda ekranı: masa, kart eli, sonuçlar; ticket listesi açıksa yanda kuyruk. */
export function Lobby({ room, youId }: { room: RoomState; youId: string | null }) {
  const { t } = useTranslation();
  const { promote, leave, vote, setObserver, nudge, kick, yourVote, flyingEmojis, nudges } = useRoomStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
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
    return <PlayingCard faceUp size="md" value={v.card} index={room.deckCards.indexOf(v.card)} highlight={highlight} dimmed={v.excluded} />;
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

  const observerList = observers.length > 0 && (
    <section className={styles.observers} aria-label={t('room.observers')}>
      <h2 className={`panel-title ${styles.sectionTitle}`}><Icon name="eye" size={16} />{t('room.observers')}</h2>
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
                  <button type="button" className="btn btn-ghost btn-small" onClick={() => promote(o.id)}>
                    {t('room.makeModerator')}
                  </button>
                )}
                <button type="button" className="btn btn-ghost btn-small" onClick={() => setObserver(o.id, false)}>
                  {t('room.makeParticipant')}
                </button>
                <button type="button" className="btn btn-ghost btn-small btn-danger" onClick={() => confirmKick(o)}>
                  {t('room.kick')}
                </button>
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );

  return (
    <div className={styles.lobby}>
      <div className={styles.topbar}>
        <div className={styles.heading}>
          <h1 className={styles.title}>{room.name ?? t('app.name')}</h1>
          <p className={styles.meta}>
            <span className={styles.codeChip}>
              <span className="visually-hidden">{t('room.code')}: </span>
              <span aria-hidden className={styles.codeLabel}>{t('room.code')}</span>
              <strong className={styles.code}>{room.code}</strong>
            </span>
            <span className={styles.metaItem}>· {t('room.count', { count: room.participants.length })}</span>
            <span className={styles.metaItem}>· {t(`decks.${room.deck}`)}</span>
            {room.passwordProtected && <span className={styles.metaItem}>· <Icon name="lock" size={14} /> {t('room.passwordProtected')}</span>}
          </p>
        </div>
        <div className={styles.tools}>
          <CopyLinkButton code={room.code} />
          <SoundToggle />
          {me && (
            me.observer ? (
              <button type="button" className="btn btn-small" onClick={() => setObserver(null, false)}>
                <Icon name="cards" size={16} />{t('room.becomeParticipant')}
              </button>
            ) : (
              <button type="button" className="btn btn-ghost btn-small" disabled={voting && iVoted}
                title={voting && iVoted ? t('errors.ALREADY_VOTED') : undefined}
                onClick={() => setObserver(null, true)}>
                <Icon name="eye" size={16} />{t('room.becomeObserver')}
              </button>
            )
          )}
          {isModerator && (
            <button type="button" className="btn btn-small" onClick={() => setSettingsOpen((v) => !v)} aria-expanded={settingsOpen}>
              <Icon name="gear" size={16} />{t('room.settings')}
            </button>
          )}
          <button type="button" className="btn btn-ghost btn-small" onClick={onLeave}>
            <Icon name="door" size={16} />{t('room.leave')}
          </button>
        </div>
      </div>

      {settingsOpen && isModerator && <RoomSettings room={room} onClose={() => setSettingsOpen(false)} />}

      <div className={`${styles.layout} ${room.ticketsEnabled ? '' : styles.solo}`}>
        <div className={styles.main}>
          {isModerator && <RoundControls room={room} allVoted={allVoted} youId={youId} />}

          {assignment && (
            <AssignmentPanel room={room} assignment={assignment} youId={youId} isModerator={isModerator} timing={timing} />
          )}

          <TableView
            people={seated}
            youId={youId}
            renderCard={renderCard}
            renderActions={renderActions}
            center={<TableCenter room={room} seatedCount={seated.length} allVoted={allVoted} isModerator={isModerator} />}
            dealKey={round.id}
            revealKey={voting ? null : round.id}
            emojis={flyingEmojis}
            nudges={nudges}
          />

          {me && !me.observer && (
            <CardHand cards={room.deckCards} selected={myCard} disabled={!voting} onVote={vote} dealKey={round.id} />
          )}
          {me?.observer && <p className={`muted ${styles.observerNote}`}>{t('poker.observerNote')}</p>}
          {me && <EmojiBar />}

          {!voting && stats && <ResultsPanel room={room} round={round} isModerator={isModerator} />}

          {!room.ticketsEnabled && (
            <>
              <SessionHistory rounds={room.sessionHistory} />
              <AssignmentHistory records={room.assignmentHistory} hiddenId={hiddenResultId} />
              {observerList}
            </>
          )}
        </div>

        {room.ticketsEnabled && (
          <aside className={styles.side}>
            <TicketQueue room={room} isModerator={isModerator} hiddenResultId={hiddenResultId} />
            <SessionHistory rounds={room.sessionHistory} />
            <AssignmentHistory records={room.assignmentHistory} hiddenId={hiddenResultId} />
            {observerList}
          </aside>
        )}
      </div>
      {celebrate > 0 && <RoyalFlushCelebration key={celebrate} />}
    </div>
  );
}
