import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AssignmentView, HorseAnimation, PlayableGame, RoomState, WheelAnimation } from '../../api/types';
import { PLAYABLE_GAMES } from '../../api/types';
import type { GameTiming } from '../../lib/gameClock';
import { splitTicketTitle } from '../../lib/deck';
import { play } from '../../lib/sound';
import { useRoomStore } from '../../store/roomStore';
import { Avatar } from '../Avatar';
import { Dialog } from '../Dialog';
import { Icon } from '../Icon';
import { HorseRace, leaderOf } from './HorseRace';
import { Wheel } from './Wheel';
import styles from './AssignmentPanel.module.css';

interface Props {
  room: RoomState;
  assignment: AssignmentView;
  youId: string | null;
  isModerator: boolean;
  timing: GameTiming;
  hasPending: boolean;
}

const VOLUNTEER_CHOICES = [10, 20, 30, 60, 0];

/** Oyun sürerken (ve sonuçta) kazanana göre dönüşümlü adalet ağırlığı: her kazanım ağırlığı yarıya indirir. */
function winsOf(room: RoomState, id: string) {
  return room.assignmentHistory.filter((r) => !r.undone && r.winner.participantId === id).length;
}

/**
 * "Kim alacak?" akışı, masanın üstünde bir pencere: 1 Gönüllü → 2 Adaylar → 3 Oyun → 4 Sonuç.
 * Kazananı sunucu belirler; burada yalnızca gösterilir. Herkes aynı pencereyi görür; kapatmak krupiyenindir.
 */
export function AssignmentPanel({ room, assignment, youId, isModerator, timing, hasPending }: Props) {
  const { t } = useTranslation();
  const closeAssignment = useRoomStore((s) => s.closeAssignment);
  const [skipped, setSkipped] = useState<string | null>(null);
  const resultId = assignment.result?.id ?? null;
  const reduceMotion = useReducedMotion();

  const gameRunning = assignment.phase === 'RESULT' && !!assignment.game && timing.stage !== 'done' && timing.stage !== 'none'
    && !(reduceMotion && timing.stage === 'running') && skipped !== resultId;
  const step = assignment.phase === 'VOLUNTEERING' ? 1 : assignment.phase === 'CANDIDATES' ? 2 : gameRunning ? 3 : 4;
  const steps = ['volunteer', 'candidates', 'game', 'result'];
  const { key, text } = splitTicketTitle(assignment.title ?? '');
  const eyebrow = assignment.title ? [key, text].filter(Boolean).join(' · ').toUpperCase() : t('poker.freeRound');

  return (
    <Dialog title={t('assign.title')} bare size="wide">
      <div className={styles.dialog}>
        <div className={styles.stepsRow}>
          <ol className={styles.steps} aria-label={t('assign.title')}>
            {steps.map((s, i) => (
              <li key={s} className={i + 1 === step ? styles.on : i + 1 < step ? styles.ok : ''} aria-current={i + 1 === step ? 'step' : undefined}>
                <b>{i + 1 < step ? '✓' : i + 1}</b>{t(`assign.steps.${s}`)}
              </li>
            ))}
          </ol>
          {isModerator && (
            <button type="button" className={styles.close} onClick={closeAssignment} aria-label={t('assign.close')} title={t('assign.close')}>
              <Icon name="close" size={20} />
            </button>
          )}
        </div>
        {step === 1 && <Volunteering room={room} assignment={assignment} youId={youId} isModerator={isModerator} eyebrow={eyebrow} />}
        {step === 2 && <Candidates room={room} assignment={assignment} isModerator={isModerator} eyebrow={eyebrow} />}
        {step === 3 && <Game assignment={assignment} timing={timing} eyebrow={eyebrow} onSkip={() => setSkipped(resultId)} />}
        {step === 4 && <Result room={room} assignment={assignment} isModerator={isModerator} eyebrow={eyebrow} hasPending={hasPending} />}
      </div>
    </Dialog>
  );
}

function Head({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className={styles.head}>
      <span className={styles.eyebrow}>{eyebrow}</span>
      <h1>{title}</h1>
      {sub && <p>{sub}</p>}
    </div>
  );
}

/** Kalan süre ve oran; sunucunun verdiği kalan süreden bu tarayıcının saatiyle sayar. */
function useCountdown(remainingMs: number | undefined) {
  const endsAt = useMemo(() => (remainingMs === undefined ? null : Date.now() + remainingMs), [remainingMs]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (endsAt === null) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [endsAt]);
  return endsAt === null ? null : Math.max(0, endsAt - now);
}

function Volunteering({ room, assignment, youId, isModerator, eyebrow }: Omit<Props, 'timing' | 'hasPending'> & { eyebrow: string }) {
  const { t } = useTranslation();
  const { setVolunteer, closeVolunteering, setVolunteerSeconds } = useRoomStore();
  const me = room.participants.find((p) => p.id === youId);
  const iVolunteered = !!youId && assignment.volunteers.includes(youId);
  const iPassed = !!youId && (assignment.passes ?? []).includes(youId);
  const seated = room.participants.filter((p) => !p.observer);
  const left = useCountdown(assignment.volunteerRemainingMs);
  const total = assignment.volunteerSeconds * 1000;
  const frac = left === null || total === 0 ? 1 : Math.min(1, left / total);
  const secs = left === null ? null : Math.ceil(left / 1000);
  const clock = secs === null ? '∞' : `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
  const R = 86;
  const C = 2 * Math.PI * R;

  const tagOf = (id: string) =>
    assignment.volunteers.includes(id) ? { cls: styles.tagYes, label: t('assign.tagVolunteer') }
      : (assignment.passes ?? []).includes(id) ? { cls: styles.tagNo, label: t('assign.tagPass') }
        : { cls: styles.tagWait, label: t('assign.tagThinking') };

  return (
    <>
      <Head eyebrow={eyebrow} title={t('assign.volunteerTitle')} sub={t('assign.volunteerSub')} />
      <div className={styles.split}>
        <div className={styles.timerCol}>
          <div className={styles.ring}>
            <svg viewBox="0 0 190 190" aria-hidden>
              <circle cx="95" cy="95" r={R} fill="none" stroke="var(--surface-2)" strokeWidth="10" />
              <circle cx="95" cy="95" r={R} fill="none" stroke="var(--accent)" strokeWidth="10" strokeLinecap="round"
                strokeDasharray={C} strokeDashoffset={C * (1 - frac)} transform="rotate(-90 95 95)" />
            </svg>
            <div className={styles.ringText} role="timer">
              <b>{clock}</b>
              <span>{secs === null ? t('assign.noLimit') : t('assign.remaining')}</span>
            </div>
          </div>
          {me && !me.observer && (
            <>
              <button type="button" className={`btn ${iVolunteered ? '' : 'btn-primary'} ${styles.big}`} aria-pressed={iVolunteered}
                onClick={() => setVolunteer(!iVolunteered)}>
                {!iVolunteered && <Icon name="hand" size={20} />}
                {iVolunteered ? t('assign.unvolunteer') : t('assign.volunteer')}
              </button>
              {!iVolunteered && (
                <button type="button" className={`btn btn-ghost ${styles.passBtn}`} aria-pressed={iPassed} onClick={() => setVolunteer(false, !iPassed)}>
                  {iPassed ? t('assign.unpass') : t('assign.pass')}
                </button>
              )}
            </>
          )}
          {room.fairRotation && <span className={styles.note}>{t('assign.fairNote')}</span>}
        </div>
        <div className={styles.listCol}>
          <span className={styles.lbl}>{t('assign.atTable', { count: seated.length })}</span>
          {seated.map((p) => {
            const tag = tagOf(p.id);
            return (
              <div key={p.id} className={styles.person}>
                <Avatar seed={p.avatar} size={38} online={p.online} alt="" />
                <b>{p.nickname}{p.id === youId && <span className={styles.you}> {t('room.you')}</span>}</b>
                <span className={`${styles.tag} ${tag.cls}`}>{tag.label}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className={styles.foot}>
        {isModerator ? (
          <>
            <span className={styles.lbl}>{t('assign.volunteerTime')}</span>
            <span className={styles.chips} role="group" aria-label={t('assign.volunteerTime')}>
              {VOLUNTEER_CHOICES.map((s) => (
                <button key={s} type="button" className={`${styles.chip} ${assignment.volunteerSeconds === s ? styles.chipOn : ''}`}
                  aria-pressed={assignment.volunteerSeconds === s} onClick={() => setVolunteerSeconds(s)}>
                  {s ? t('assign.seconds', { count: s }) : t('assign.noLimit')}
                </button>
              ))}
            </span>
            <span className={styles.grow} />
            <button type="button" className="btn" onClick={closeVolunteering}>{t('assign.finishEarly')}</button>
          </>
        ) : (
          <span className={styles.note}>{t('assign.volunteerRules')}</span>
        )}
      </div>
    </>
  );
}

function Candidates({ room, assignment, isModerator, eyebrow }: { room: RoomState; assignment: AssignmentView; isModerator: boolean; eyebrow: string }) {
  const { t } = useTranslation();
  const { setCandidate, playGame } = useRoomStore();
  const [game, setGame] = useState<PlayableGame>('horse');
  const candidates = room.participants.filter((p) => assignment.candidates.includes(p.id));
  const others = room.participants.filter((p) => !p.observer && !assignment.candidates.includes(p.id));
  const count = candidates.length;
  const weightOf = (id: string) => (room.fairRotation ? Math.pow(0.5, winsOf(room, id)) : 1);
  const totalWeight = candidates.reduce((s, p) => s + weightOf(p.id), 0) || 1;
  const names = candidates.map((p) => p.nickname);
  const title = count === 1 ? t('assign.singleCandidate', { name: names[0] })
    : assignment.volunteers.length > 0 ? t('assign.candidatesVolunteers', { count }) : t('assign.candidatesNobody', { count });
  const sub = count === 1 ? t('assign.directSub')
    : `${names.length > 3 ? t('assign.namesMore', { names: names.slice(0, 3).join(', '), count: names.length - 3 }) : names.join(', ')} ${t('assign.areCandidates')} ${room.fairRotation ? t('assign.fairSub') : t('assign.equalSub')}`;

  return (
    <>
      <Head eyebrow={eyebrow} title={title} sub={sub} />
      <div className={styles.cols}>
        <div className={styles.col}>
          <span className={styles.lbl}>{t('assign.candidates', { count })}</span>
          {candidates.map((p) => {
            const pct = Math.round((weightOf(p.id) / totalWeight) * 100);
            const wins = winsOf(room, p.id);
            return (
              <div key={p.id} className={styles.cand}>
                <div className={styles.candTop}>
                  <Avatar seed={p.avatar} size={54} online={p.online} alt="" />
                  <div className={styles.candName}>
                    <b>{p.nickname}</b>
                    <span>{wins === 0 ? t('assign.winsNone') : t('assign.winsN', { count: wins })}</span>
                  </div>
                  <b className={styles.pct}>%{pct}</b>
                  {isModerator && (
                    <button type="button" className="ib" onClick={() => setCandidate(p.id, false)} aria-label={t('assign.removeCandidate', { name: p.nickname })} title={t('assign.removeCandidate', { name: p.nickname })}>
                      <Icon name="close" size={16} />
                    </button>
                  )}
                </div>
                <div className={styles.bar} aria-hidden><i style={{ width: `${pct}%` }} /></div>
              </div>
            );
          })}
          {isModerator && others.length > 0 && (
            <div className={styles.addRow}>
              <span className={styles.lbl}>{t('assign.addCandidate')}</span>
              {others.map((p) => (
                <button key={p.id} type="button" className={styles.addChip} onClick={() => setCandidate(p.id, true)}>
                  <Avatar seed={p.avatar} size={22} alt="" />{p.nickname}<Icon name="plus" size={14} />
                </button>
              ))}
            </div>
          )}
          <span className={styles.note}>{t('assign.serverDecides')}</span>
        </div>
        <div className={styles.col}>
          <span className={styles.lbl}>{t('assign.chooseGame')}</span>
          {PLAYABLE_GAMES.map((g) => (
            <button key={g} type="button" className={`${styles.game} ${game === g ? styles.gameOn : ''}`} aria-pressed={game === g}
              disabled={!isModerator} onClick={() => setGame(g)}>
              <span className={styles.gameIcon}><Icon name={g === 'horse' ? 'horse' : 'wheel'} size={30} /></span>
              <span className={styles.gameText}><b>{t(`assign.games.${g}`)}</b><span>{t(`assign.gameNote.${g}`)}</span></span>
            </button>
          ))}
        </div>
      </div>
      <div className={styles.foot}>
        <span className={styles.note}>{isModerator ? t('assign.watchTogether') : t('assign.waitingDealer')}</span>
        <span className={styles.grow} />
        {isModerator && (
          <button type="button" className={`btn btn-primary ${styles.bigAction}`} disabled={count === 0}
            onClick={() => {
              play('shuffle');
              playGame(game);
            }}>
            {count === 1 ? t('assign.assignDirect', { name: names[0] }) : <><Icon name="play" /> {t(`assign.startGame.${game}`)}</>}
          </button>
        )}
      </div>
    </>
  );
}

function Game({ assignment, timing, eyebrow, onSkip }: { assignment: AssignmentView; timing: GameTiming; eyebrow: string; onSkip: () => void }) {
  const { t } = useTranslation();
  const result = assignment.result!;
  const game = assignment.game!;
  const names = result.candidates.map((p) => p.nickname);
  const leader = game.type === 'horse' && timing.stage === 'running' ? leaderOf(result, game.animation as HorseAnimation, timing.progress) : null;
  return (
    <>
      <Head eyebrow={eyebrow}
        title={game.type === 'horse' ? t('assign.raceStarted') : t('assign.wheelSpinning')}
        sub={game.type === 'horse' ? t('assign.raceSub', { names: names.join(', ') }) : t('assign.wheelSub')} />
      <div className={styles.stage}>
        {game.type === 'horse' && <HorseRace result={result} animation={game.animation as HorseAnimation} progress={timing.progress} done={false} />}
        {game.type === 'wheel' && <Wheel result={result} animation={game.animation as WheelAnimation} progress={timing.progress} done={false} />}
        {timing.stage === 'waiting' && <p className={styles.note} aria-live="polite">{t('assign.getReady')}</p>}
        {leader && (
          <div className={styles.progress}>
            <div className={styles.progressBar}><i style={{ width: `${Math.round(timing.progress * 100)}%` }} /></div>
            <span>{t('assign.leading', { name: leader })}</span>
          </div>
        )}
      </div>
      <div className={styles.foot}>
        <span className={styles.note}>
          {game.type === 'wheel' ? t('assign.wheelFoot', { names: result.candidates.map((p) => p.nickname).join(', ') }) : t('assign.sameRace')}
        </span>
        <span className={styles.grow} />
        <button type="button" className="btn" onClick={onSkip}>{t('assign.skip')}</button>
      </div>
    </>
  );
}

function Result({ room, assignment, isModerator, eyebrow, hasPending }: { room: RoomState; assignment: AssignmentView; isModerator: boolean; eyebrow: string; hasPending: boolean }) {
  const { t } = useTranslation();
  const { undoAssignment, closeAssignment, nextTicket } = useRoomStore();
  const reduceMotion = useReducedMotion();
  const result = assignment.result!;
  const celebrated = useRef<string | null>(null);
  useEffect(() => {
    if (celebrated.current !== result.id) {
      celebrated.current = result.id;
      play('fanfare');
    }
  }, [result.id]);

  const reason = result.game === 'volunteer' ? t('assign.byVolunteer') : result.game === 'direct' ? t('assign.byDirect')
    : t('assign.byGame', { game: t(`assign.games.${result.game}`) });
  void room;

  return (
    <div className={styles.result} role="status">
      {!reduceMotion && (
        <>
          <span className={`${styles.confetti} ${styles.c1}`} aria-hidden>🎉</span>
          <span className={`${styles.confetti} ${styles.c2}`} aria-hidden>✨</span>
          <span className={`${styles.confetti} ${styles.c3}`} aria-hidden>✨</span>
          <span className={`${styles.confetti} ${styles.c4}`} aria-hidden>🎉</span>
        </>
      )}
      <span className={styles.eyebrow}>{eyebrow}</span>
      <motion.div className={styles.winnerAvatar} initial={reduceMotion ? false : { scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 16 }}>
        <Avatar seed={result.winner.avatar} size={120} alt="" />
      </motion.div>
      <h1>{t('assign.winner', { name: result.winner.nickname })}</h1>
      <p>
        {reason}
        {result.weighted && <> {t('assign.nextHalf')}</>}
      </p>
      {result.ranking.length > 1 && (
        <ol className={styles.ranking} aria-label={t('assign.ranking')}>
          {result.ranking.map((p) => <li key={p.participantId}>{p.nickname}</li>)}
        </ol>
      )}
      {isModerator ? (
        <div className={styles.resultActions}>
          <button type="button" className="btn" onClick={undoAssignment}><Icon name="undo" size={16} /> {t('assign.again')}</button>
          <button type="button" className="btn btn-primary" onClick={() => {
            closeAssignment();
            if (hasPending) nextTicket();
          }}>
            {hasPending ? t('assign.assignAndNext') : t('assign.done')}
          </button>
        </div>
      ) : (
        <p className={styles.note}>{t('assign.dealerContinues')}</p>
      )}
    </div>
  );
}
