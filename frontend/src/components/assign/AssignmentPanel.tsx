import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AssignmentView, HorseAnimation, PlayableGame, RoomState, WheelAnimation } from '../../api/types';
import { PLAYABLE_GAMES } from '../../api/types';
import type { GameTiming } from '../../lib/gameClock';
import { play } from '../../lib/sound';
import { useRoomStore } from '../../store/roomStore';
import { Avatar } from '../Avatar';
import { HorseRace } from './HorseRace';
import { Wheel } from './Wheel';
import styles from './AssignmentPanel.module.css';
import { Icon } from '../Icon';

interface Props {
  room: RoomState;
  assignment: AssignmentView;
  youId: string | null;
  isModerator: boolean;
  timing: GameTiming;
}

/**
 * "Kim alacak?" akışı: gönüllü turu → aday ayarı ve oyun seçimi (krupiye) → oyun ve sonuç.
 * Kazananı sunucu belirler; burada yalnızca gösterilir.
 */
export function AssignmentPanel({ room, assignment, youId, isModerator, timing }: Props) {
  const { t } = useTranslation();
  const closeAssignment = useRoomStore((s) => s.closeAssignment);
  return (
    <section className={`card ${styles.panel}`} aria-label={t('assign.title')}>
      <div className={styles.head}>
        <div>
          <h2 className={`panel-title ${styles.title}`}><Icon name="hand" size={20} />{t('assign.title')}</h2>
          {assignment.title && <p className={styles.subject}>{assignment.title}</p>}
        </div>
        {isModerator && (
          <button type="button" className="btn btn-ghost btn-small" onClick={closeAssignment}>{t('assign.close')}</button>
        )}
      </div>
      {assignment.phase === 'VOLUNTEERING' && (
        <Volunteering room={room} assignment={assignment} youId={youId} isModerator={isModerator} />
      )}
      {assignment.phase === 'CANDIDATES' && <Candidates room={room} assignment={assignment} isModerator={isModerator} />}
      {assignment.phase === 'RESULT' && <Result assignment={assignment} isModerator={isModerator} timing={timing} />}
    </section>
  );
}

function Countdown({ remainingMs }: { remainingMs: number }) {
  const { t } = useTranslation();
  const endsAt = useMemo(() => Date.now() + remainingMs, [remainingMs]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);
  const secs = Math.max(0, Math.ceil((endsAt - now) / 1000));
  return <span className={styles.countdown} role="timer"><Icon name="timer" size={15} /> {t('assign.seconds', { count: secs })}</span>;
}

function Volunteering({ room, assignment, youId, isModerator }: Omit<Props, 'timing'>) {
  const { t } = useTranslation();
  const { setVolunteer, closeVolunteering } = useRoomStore();
  const me = room.participants.find((p) => p.id === youId);
  const iVolunteered = !!youId && assignment.volunteers.includes(youId);
  const volunteers = room.participants.filter((p) => assignment.volunteers.includes(p.id));
  return (
    <div className={styles.body}>
      <p className={styles.lead}>
        {t('assign.volunteerLead')}
        {assignment.volunteerRemainingMs !== undefined && <> <Countdown remainingMs={assignment.volunteerRemainingMs} /></>}
      </p>
      {me && !me.observer && (
        <button
          type="button"
          className={`btn ${iVolunteered ? '' : 'btn-primary'} ${styles.bigButton}`}
          aria-pressed={iVolunteered}
          onClick={() => setVolunteer(!iVolunteered)}
        >
          {!iVolunteered && <Icon name="hand" size={20} />}
          {iVolunteered ? t('assign.unvolunteer') : t('assign.volunteer')}
        </button>
      )}
      <div>
        <span className="label">{t('assign.volunteers', { count: volunteers.length })}</span>
        {volunteers.length === 0 ? (
          <p className="muted">{t('assign.noVolunteers')}</p>
        ) : (
          <ul className={styles.people}>
            {volunteers.map((p) => (
              <motion.li key={p.id} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                <Avatar seed={p.avatar} size={30} alt="" /> {p.nickname}
              </motion.li>
            ))}
          </ul>
        )}
      </div>
      {isModerator && (
        <div className={styles.tools}>
          <button type="button" className="btn btn-small" onClick={closeVolunteering}>{t('assign.closeVolunteering')}</button>
          <small className="muted">{t('assign.volunteerRules')}</small>
        </div>
      )}
    </div>
  );
}

function Candidates({ room, assignment, isModerator }: { room: RoomState; assignment: AssignmentView; isModerator: boolean }) {
  const { t } = useTranslation();
  const { setCandidate, setFairRotation, playGame } = useRoomStore();
  const [game, setGame] = useState<PlayableGame>('horse');
  const pool = room.participants.filter((p) => !p.observer || assignment.candidates.includes(p.id));
  const candidates = room.participants.filter((p) => assignment.candidates.includes(p.id));
  const count = candidates.length;

  return (
    <div className={styles.body}>
      <div>
        <span className="label">{t('assign.candidates', { count })}</span>
        {isModerator ? (
          <ul className={styles.checkList}>
            {pool.map((p) => (
              <li key={p.id}>
                <label>
                  <input type="checkbox" checked={assignment.candidates.includes(p.id)}
                    onChange={(e) => setCandidate(p.id, e.target.checked)} />
                  <Avatar seed={p.avatar} size={26} online={p.online} alt="" />
                  {p.nickname}
                </label>
              </li>
            ))}
          </ul>
        ) : (
          <ul className={styles.people}>
            {candidates.map((p) => (
              <li key={p.id}><Avatar seed={p.avatar} size={30} alt="" /> {p.nickname}</li>
            ))}
          </ul>
        )}
      </div>
      {room.fairRotation && <p className={styles.note}><Icon name="scale" size={15} /> {t('assign.weightedOn')}</p>}
      {isModerator ? (
        <>
          <fieldset className={styles.games}>
            <legend className="label">{t('assign.chooseGame')}</legend>
            {PLAYABLE_GAMES.map((g) => (
              <label key={g} className={`${styles.gameOption} ${game === g ? styles.chosen : ''}`}>
                <input type="radio" name="game" value={g} checked={game === g} onChange={() => setGame(g)} />
                <span className={styles.gameIcon}><Icon name={g === 'horse' ? 'horse' : 'wheel'} size={22} /></span>
                {t(`assign.games.${g}`)}
              </label>
            ))}
          </fieldset>
          <label className={styles.fair}>
            <input type="checkbox" checked={room.fairRotation} onChange={(e) => setFairRotation(e.target.checked)} />
            <span>
              <strong>{t('assign.fairRotation')}</strong>
              <small className="muted"> {t('assign.fairRotationHint')}</small>
            </span>
          </label>
          <button type="button" className={`btn btn-primary ${styles.bigButton}`} disabled={count === 0}
            onClick={() => {
              play('shuffle');
              playGame(game);
            }}>
            {count === 1 ? t('assign.assignDirect', { name: candidates[0].nickname }) : <><Icon name="play" /> {t('assign.start')}</>}
          </button>
        </>
      ) : (
        <p className="muted">{t('assign.waitingDealer')}</p>
      )}
    </div>
  );
}

function Result({ assignment, isModerator, timing }: { assignment: AssignmentView; isModerator: boolean; timing: GameTiming }) {
  const { t } = useTranslation();
  const { undoAssignment, closeAssignment } = useRoomStore();
  const reduceMotion = useReducedMotion();
  const result = assignment.result!;
  const game = assignment.game;
  // "Hareketi azalt" açıkken animasyon yok: başlangıç anında sonuç görünür.
  const done = timing.stage === 'done' || timing.stage === 'none' || (!!reduceMotion && timing.stage === 'running');

  const celebrated = useRef<string | null>(timing.stage === 'done' || timing.stage === 'none' ? result.id : null);
  useEffect(() => {
    if (done && celebrated.current !== result.id) {
      celebrated.current = result.id;
      play('fanfare');
    }
  }, [done, result.id]);

  return (
    <div className={styles.body}>
      {game?.type === 'horse' && (
        <HorseRace result={result} animation={game.animation as HorseAnimation} progress={timing.progress} done={done} />
      )}
      {game?.type === 'wheel' && (
        <Wheel result={result} animation={game.animation as WheelAnimation} progress={timing.progress} done={done} />
      )}
      {timing.stage === 'waiting' && <p className={styles.lead}>{t('assign.getReady')}</p>}
      {done && (
        <motion.div className={styles.winner} role="status"
          initial={reduceMotion ? false : { scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 16 }}>
          <Avatar seed={result.winner.avatar} size={56} alt="" />
          <div>
            <strong className={styles.winnerName}><Icon name="crown" size={20} /> {t('assign.winner', { name: result.winner.nickname })}</strong>
            <p className="muted">
              {result.game === 'volunteer' ? t('assign.byVolunteer') : result.game === 'direct' ? t('assign.byDirect')
                : t('assign.byGame', { game: t(`assign.games.${result.game}`) })}
              {result.weighted && <> · <Icon name="scale" size={13} /> {t('assign.weightedOn')}</>}
            </p>
          </div>
        </motion.div>
      )}
      {done && result.ranking.length > 1 && (
        <ol className={styles.ranking} aria-label={t('assign.ranking')}>
          {result.ranking.map((p) => <li key={p.participantId}>{p.nickname}</li>)}
        </ol>
      )}
      {isModerator && done && (
        <div className={styles.tools}>
          <button type="button" className="btn btn-small" onClick={undoAssignment}><Icon name="undo" size={16} /> {t('assign.undo')}</button>
          <button type="button" className="btn btn-primary btn-small" onClick={closeAssignment}>{t('assign.done')}</button>
        </div>
      )}
    </div>
  );
}
