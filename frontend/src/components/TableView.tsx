import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { ParticipantView } from '../api/types';
import type { FlyingEmoji } from '../store/roomStore';
import { Seat } from './Seat';
import styles from './TableView.module.css';

interface Props {
  people: ParticipantView[];
  youId: string | null;
  renderCard?: (p: ParticipantView) => ReactNode;
  renderActions?: (p: ParticipantView) => ReactNode;
  center?: ReactNode;
  /** Değişince (yeni tur) krupiyeden koltuklara kart dağıtılır. */
  dealKey?: number;
  /** Değişince (kartlar açıldı) krupiyeden masanın ortasına küçük bir hareket. */
  revealKey?: number | null;
  emojis?: FlyingEmoji[];
  nudges?: Record<string, number>;
  /** Koltuğun altındaki durum yazısı (ör. "düşünüyor"). */
  renderStatus?: (p: ParticipantView) => ReactNode;
  /** Masanın üstünde ters, altında düz yazılan silik oda adı (karşıdaki de okusun). */
  roomName?: string;
}

/** Kalabalıkta avatarlar küçülür; 16 kişiden sonra iki sıra (iç/dış halka) kullanılır. */
function avatarSize(n: number, narrow: boolean) {
  const base = n <= 8 ? 46 : n <= 14 ? 40 : n <= 24 ? 34 : 30;
  return narrow ? Math.min(base, n <= 8 ? 36 : 30) : base;
}

/** i = 0 masanın altında (kart elinin hemen üstü), diğerleri saat yönünde dizilir. */
function ellipsePoint(i: number, n: number, narrow: boolean) {
  const twoRows = n > 16;
  const angle = Math.PI / 2 + (i / n) * Math.PI * 2;
  const outer = !twoRows || i % 2 === 0;
  const few = n <= 5;
  const rx = (outer ? (few ? 34 : 42) : 32) - (narrow ? 6 : 0);
  const ry = outer ? 40 : 28;
  return { x: 50 + rx * Math.cos(angle), y: 45.5 + ry * Math.sin(angle) };
}

/**
 * 6-16 kişide koltuklar masanın alt ve üst kenarında sıralanır, yanlarda birer koltuk durur:
 * oval üzerinde eşit açıyla dizilince yan koltuklar üst üste biniyordu. Sıra saat yönünde, sen altta ortadasın.
 */
function stadiumPoints(n: number, narrow: boolean) {
  const m = n - 2;
  let bottom = Math.ceil(m / 2);
  if (bottom % 2 === 0) bottom += 1; // sen alt sırada tam ortada oturursun
  const top = m - bottom;
  const row = (count: number, y: number) => {
    const dx = count > 1 ? Math.min(narrow ? 24 : 21, 66 / (count - 1)) : 0;
    return Array.from({ length: count }, (_, k) => ({ x: 50 + (k - (count - 1) / 2) * dx, y }));
  };
  const bottomRow = row(bottom, 84);
  const topRow = row(top, 6);
  const sideX = narrow ? 10 : 15;
  const half = (bottom - 1) / 2;
  const left = bottomRow.slice(0, half + 1).reverse(); // ortadan sola
  const right = bottomRow.slice(half + 1).reverse(); // sağ uçtan ortaya
  return [...left, { x: sideX, y: 38 }, ...topRow, { x: 100 - sideX, y: 38 }, ...right];
}

function layoutPoints(n: number, narrow: boolean) {
  return n >= 6 && n <= 16
    ? stadiumPoints(n, narrow)
    : Array.from({ length: n }, (_, i) => ellipsePoint(i, n, narrow));
}

const pct = (p: { x: number; y: number }) => ({ left: `${p.x}%`, top: `${p.y}%` });

/** Dar ekranda (telefon) koltuklar ve kartlar küçülür. */
function useNarrow() {
  const query = '(max-width: 720px)';
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setNarrow(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return narrow;
}

type Fx = { id: number; kind: 'deal' | 'reveal' };
let fxSeq = 0;

/**
 * Oval masa: düz yeşil çuha, ince koyu halka. Koltuklar (telefonda da) masanın etrafına dizilir.
 * Krupiye efektleri (kart dağıtma, açılış) ve uçan emojiler masanın üstünde bir katmanda çizilir.
 */
export function TableView({ people, youId, renderCard, renderActions, renderStatus, roomName, center, dealKey, revealKey, emojis = [], nudges = {} }: Props) {
  const reduceMotion = useReducedMotion();
  const narrow = useNarrow();
  const size = avatarSize(people.length, narrow);
  const [fx, setFx] = useState<Fx[]>([]);
  // Sen her zaman masanın altında, kendi kart elinin yanında oturursun.
  const youIndex = Math.max(0, people.findIndex((p) => p.id === youId));
  const points = layoutPoints(people.length, narrow);
  const seatAt = (i: number) => points[(i - youIndex + people.length) % people.length];
  const dealerIndex = people.findIndex((p) => p.moderator);
  const dealerPoint = dealerIndex >= 0 ? seatAt(dealerIndex) : { x: 50, y: 50 };

  const addFx = (kind: Fx['kind']) => {
    const item = { id: ++fxSeq, kind };
    setFx((list) => [...list, item]);
    setTimeout(() => setFx((list) => list.filter((f) => f.id !== item.id)), 1600);
  };

  // İlk açılışta efekt yok; yalnızca değişimlerde.
  const lastDeal = useRef(dealKey);
  useEffect(() => {
    if (dealKey === lastDeal.current) return;
    lastDeal.current = dealKey;
    if (!reduceMotion && dealerIndex >= 0) addFx('deal');
  }, [dealKey, reduceMotion, dealerIndex]);

  const lastReveal = useRef(revealKey);
  useEffect(() => {
    if (revealKey === lastReveal.current) return;
    lastReveal.current = revealKey;
    if (revealKey != null && !reduceMotion && dealerIndex >= 0) addFx('reveal');
  }, [revealKey, reduceMotion, dealerIndex]);

  const emojiStart = (participantId: string) => {
    const i = people.findIndex((p) => p.id === participantId);
    if (i < 0) return { x: 50, y: 92 };
    return seatAt(i);
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.arena}>
        <div className={styles.table}>
          <div className={styles.felt}>
            {roomName && (
              <>
                <span className={`${styles.roomName} ${styles.nameTop}`} aria-hidden>{roomName}</span>
                <span className={`${styles.roomName} ${styles.nameBottom}`} aria-hidden>{roomName}</span>
              </>
            )}
            {center}
          </div>
        </div>
        <ul className={styles.seats}>
          {people.map((p, i) => (
            // Konum düz <li> üzerinde: framer-motion'ın transform'u ortalama için gereken translate'i ezmesin.
            <li key={p.id} className={styles.seatSlot} style={pct(seatAt(i))}>
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
                <Seat person={p} isYou={p.id === youId} size={size} card={renderCard?.(p)} actions={renderActions?.(p)}
                  nudge={nudges[p.id] ?? 0} status={renderStatus?.(p)} />
              </motion.div>
            </li>
          ))}
        </ul>

        <div className={styles.fx} aria-hidden>
          {fx.map((f) =>
            f.kind === 'deal'
              ? people.map((p, i) =>
                  i === dealerIndex ? null : (
                    <motion.span
                      key={`${f.id}-${p.id}`}
                      className={styles.flyingCard}
                      initial={{ ...pct(dealerPoint), opacity: 0, rotate: -30 }}
                      animate={{ ...pct(seatAt(i)), opacity: [0, 1, 1, 0], rotate: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.6, ease: 'easeOut' }}
                    />
                  ),
                )
              : [0, 1, 2].map((k) => (
                  <motion.span
                    key={`${f.id}-${k}`}
                    className={styles.flyingCard}
                    initial={{ ...pct(dealerPoint), opacity: 0, rotate: 0 }}
                    animate={{ left: `${46 + k * 4}%`, top: '50%', opacity: [0, 1, 0], rotate: (k - 1) * 18 }}
                    transition={{ delay: k * 0.05, duration: 0.55, ease: 'easeOut' }}
                  />
                )),
          )}
          {emojis.map((e) => {
            const start = emojiStart(e.participantId);
            // Aynı emojiler üst üste binmesin diye ortada küçük bir sapma.
            const jx = ((e.id * 37) % 21) - 10;
            const jy = ((e.id * 53) % 13) - 6;
            return reduceMotion ? (
              <motion.span key={e.id} data-fx="emoji" className={styles.emoji} style={{ left: `${50 + jx}%`, top: `${50 + jy}%`, x: '-50%', y: '-50%' }}
                initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ delay: 1.2, duration: 0.6 }}>
                {e.emoji}
              </motion.span>
            ) : (
              <motion.span
                key={e.id}
                data-fx="emoji"
                className={styles.emoji}
                style={{ x: '-50%', y: '-50%' }}
                initial={{ ...pct(start), opacity: 0, scale: 0.5 }}
                animate={{ left: `${50 + jx}%`, top: `${50 + jy}%`, opacity: [0, 1, 1, 0], scale: [0.5, 1.3, 1.1, 0.9] }}
                transition={{ duration: 1.8, times: [0, 0.35, 0.75, 1], ease: 'easeOut' }}
              >
                {e.emoji}
              </motion.span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
