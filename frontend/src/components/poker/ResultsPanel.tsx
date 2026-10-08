import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { RoomState, RoundView } from '../../api/types';
import { cardTone, formatNumber, isSpecialCard, toneColor } from '../../lib/deck';
import { useRoomStore } from '../../store/roomStore';
import { Icon } from '../Icon';
import { Menu, MenuItem } from '../Menu';
import { CardFace } from './CardFace';
import { isBreakTime, isRoyalFlush } from './FunFx';
import styles from './ResultsPanel.module.css';

interface Props {
  room: RoomState;
  round: RoundView;
  isModerator: boolean;
  /** Sırada bekleyen başka ticket var mı (kaydedip sıradakine geçilebilir). */
  hasPending: boolean;
}

const METER_AT = { UNANIMOUS: 94, CLOSE: 64, SPREAD: 20, NONE: 0 } as const;

/**
 * Açılan turun sonucu, kart eli alanının yerine geçer (kaydırma yok): dağılım, uzlaşı ve final tahmin yan yana.
 * Telefonda aynı bilgi alt panelde alt alta, dağılım kart renginde çubuklarla gösterilir.
 */
export function ResultsPanel({ room, round, isModerator, hasPending }: Props) {
  const { t } = useTranslation();
  const { finalize, excludeVote, newRound, nextTicket } = useRoomStore();
  const stats = round.stats!;
  const votes = round.votes ?? [];
  const nameOf = (id: string) => votes.find((v) => v.participantId === id)?.nickname ?? '?';
  const cardOf = (id: string) => votes.find((v) => v.participantId === id)?.card ?? '';
  const maxCount = Math.max(1, ...stats.distribution.map((b) => b.count));
  const order = (c: string) => room.deckCards.indexOf(c);
  const deckNumeric = room.deckCards.filter((c) => !isSpecialCard(c));
  const voted = stats.distribution.map((b) => b.card).filter((c) => !isSpecialCard(c)).sort((a, b) => order(a) - order(b));
  const options = voted.length > 0 ? voted : deckNumeric;
  const others = deckNumeric.filter((c) => !options.includes(c));
  const [choice, setChoice] = useState(stats.suggested ?? options[0] ?? '');

  // Oylar değişince (ör. biri sayımdan çıkarıldı) öneri güncellenir.
  useEffect(() => {
    if (stats.suggested) setChoice(stats.suggested);
  }, [stats.suggested]);

  // Ticket'sız turda da final verilebilir (oturum geçmişine yazılır).
  const canFinalize = isModerator && round.state === 'REVEALED' && deckNumeric.length > 0;
  const freeFinalized = round.state === 'FINALIZED' && !round.ticketId;
  const distinct = stats.distribution.length;
  const spread = stats.consensus === 'SPREAD';
  const lowCard = stats.lowestIds[0] ? cardOf(stats.lowestIds[0]) : '';
  const highCard = stats.highestIds[0] ? cardOf(stats.highestIds[0]) : '';
  const rest = stats.voteCount - stats.countedCount;
  const toneOf = (c: string) => toneColor(cardTone(room.deckCards, c));
  const chip = (c: string) => ({ ['--t' as string]: toneOf(c) ?? '#77837d' }) as React.CSSProperties;

  const save = () => {
    if (!choice) return;
    finalize(choice);
    if (hasPending && window.matchMedia('(max-width: 720px)').matches) nextTicket();
  };

  const optionButton = (c: string) => (
    <button key={c} type="button" className={`${styles.opt} ${choice === c ? styles.optOn : ''}`} style={chip(c)} aria-pressed={choice === c}
      onClick={() => setChoice(c)}>
      {c}
      {c === stats.suggested && <small>{t('poker.suggested')}</small>}
    </button>
  );

  return (
    <section className={styles.panel} aria-label={t('poker.results')}>
      <div className={styles.col}>
        <span className={styles.lbl}>{t('poker.distribution')} · {t('poker.voteTotal', { count: stats.voteCount })}</span>
        <div className={styles.dist}>
          {stats.distribution.map((b) => (
            <div key={b.card} className={styles.group}>
              <div className={styles.minis}>
                {b.participantIds.map((id) => (
                  <span key={id} className={styles.mini} style={chip(b.card)}><CardFace value={b.card} tone={cardTone(room.deckCards, b.card)} compact /></span>
                ))}
              </div>
              <span className={styles.who}><b>{t('poker.voteN', { count: b.count })}</b><br />{b.participantIds.map(nameOf).join(', ')}</span>
            </div>
          ))}
        </div>
        <ul className={styles.bars} aria-label={t('poker.distribution')}>
          {stats.distribution.map((b) => (
            <li key={b.card} className={styles.barRow} style={chip(b.card)}>
              <span className={styles.barValue}>{b.card}</span>
              <span className={styles.barTrack}><span style={{ width: `${(b.count / maxCount) * 100}%` }}>{b.participantIds.map(nameOf).join(', ')}</span></span>
              <span className={styles.barCount}>{b.count}</span>
            </li>
          ))}
        </ul>
        {isModerator && round.state === 'REVEALED' && votes.length > 0 && (
          <details className={styles.exclude}>
            <summary>{t('poker.excludeTitle')}</summary>
            <ul>
              {votes.map((v) => (
                <li key={v.participantId}>
                  <label>
                    <input type="checkbox" checked={!v.excluded} onChange={(e) => excludeVote(v.participantId, !e.target.checked)} />
                    {v.nickname} · <strong>{v.card}</strong>
                    {v.left && <span className="muted"> ({t('poker.leftRoom')})</span>}
                  </label>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      <div className={styles.col}>
        <span className={styles.lbl}>{t('poker.consensusTitle')}</span>
        {stats.consensus === 'NONE' ? (
          <b className={styles.cons}>{t('poker.consensus.NONE')}</b>
        ) : (
          <>
            <b className={styles.cons}>
              {t(`poker.consensus.${stats.consensus}`)}
              {spread && <> · {t('poker.distinctValues', { count: distinct })}</>}
            </b>
            <div className={styles.meter} aria-hidden><i style={{ left: `${METER_AT[stats.consensus]}%` }} /></div>
            <div className={styles.meterLabels} aria-hidden><span>{t('poker.consensusScattered')}</span><span>{t('poker.consensusFull')}</span></div>
          </>
        )}
        {isRoyalFlush(stats) && <p className={styles.callout}><strong>{t('poker.royalFlush')}</strong> {t('poker.royalFlushSub')}</p>}
        {isBreakTime(stats) && <p className={styles.callout}><strong>{t('poker.breakTime')}</strong> {t('poker.breakTimeSub')}</p>}
        {spread && lowCard && highCard && (
          <p className={styles.tip}>
            {t('poker.discussTip', {
              high: `${stats.highestIds.map(nameOf).join(', ')} (${highCard})`,
              low: `${stats.lowestIds.map(nameOf).join(', ')} (${lowCard})`,
            })}
          </p>
        )}
        <p className={styles.numbers}>
          {stats.average !== undefined && <span>{t('poker.average')} {formatNumber(stats.average)}</span>}
          {stats.median !== undefined && <span>{t('poker.median')} {formatNumber(stats.median)}</span>}
          {stats.modes.length > 0 && <span>{t('poker.mode')} {stats.modes.join(' / ')}</span>}
          <span>{rest > 0 ? t('poker.countedOf', { counted: stats.countedCount, rest }) : t('poker.voteTotal', { count: stats.voteCount })}</span>
        </p>
        {(stats.lowestIds.length > 0 || stats.highestIds.length > 0) && !spread && (
          <p className={styles.extremes}>
            <span><Icon name="arrowDown" size={14} /> {t('poker.lowest')}: {stats.lowestIds.map(nameOf).join(', ')}</span>
            <span><Icon name="arrowUp" size={14} /> {t('poker.highest')}: {stats.highestIds.map(nameOf).join(', ')}</span>
          </p>
        )}
      </div>

      <div className={styles.col}>
        <span className={styles.lbl}>{t('poker.finalLabel')}</span>
        {canFinalize ? (
          <>
            <div className={styles.opts} role="group" aria-label={t('poker.finalLabel')}>
              {options.map(optionButton)}
              {others.length > 0 && (
                <Menu label={t('poker.otherValue')} align="start" up triggerClassName={`${styles.opt} ${styles.optOther} ${others.includes(choice) ? styles.optOn : ''}`}
                  trigger={others.includes(choice) ? <span style={chip(choice)}>{choice}</span> : t('poker.otherValue')}>
                  {others.map((c) => <MenuItem key={c} onClick={() => setChoice(c)} pressed={choice === c}>{c}</MenuItem>)}
                </Menu>
              )}
            </div>
            {stats.average !== undefined && (
              <span className={styles.sub}>{t('poker.suggestHint', { median: formatNumber(stats.median), average: formatNumber(stats.average) })}</span>
            )}
            <div className={styles.saveRow}>
              <button type="button" className={`btn btn-primary ${styles.save}`} onClick={save} disabled={!choice}>
                <Icon name="check" size={18} />
                <span>{hasPending ? t('poker.saveAndNext', { value: choice }) : t('poker.saveValue', { value: choice })}</span>
              </button>
              {hasPending && (
                <button type="button" className={`btn ${styles.nextIcon}`} onClick={nextTicket} aria-label={t('poker.nextTicket')} title={t('poker.nextTicket')}>
                  <Icon name="arrowRight" size={18} />
                </button>
              )}
            </div>
          </>
        ) : round.state === 'FINALIZED' && round.finalEstimate ? (
          <>
            <p className={styles.final}><Icon name="check" size={18} /> {t('poker.finalSaved', { value: round.finalEstimate })}</p>
            {isModerator && (
              <div className={styles.saveRow}>
                {hasPending ? (
                  <button type="button" className={`btn btn-primary ${styles.save}`} onClick={nextTicket}>{t('poker.nextTicket')} <Icon name="arrowRight" size={18} /></button>
                ) : (
                  <button type="button" className={`btn btn-primary ${styles.save}`} onClick={newRound}><Icon name="cards" size={18} /> {t('poker.newRound')}</button>
                )}
              </div>
            )}
            {freeFinalized && !isModerator && <span className={styles.sub}>{t('poker.waitingDealer')}</span>}
          </>
        ) : (
          <span className={styles.sub}>{t('poker.dealerPicksFinal')}</span>
        )}
      </div>
    </section>
  );
}
