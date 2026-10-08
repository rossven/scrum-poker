/** Üstten görünen poker fişi (süs). Renk paleti masa ile uyumlu: bordo, siyah, yeşil, krem. */
const TONES = {
  red: { base: '#9e2232', edge: '#fffdf7', inner: '#7a1f2b' },
  black: { base: '#1f1f22', edge: '#c9a24a', inner: '#2e2e33' },
  green: { base: '#1d6a47', edge: '#fffdf7', inner: '#145236' },
  cream: { base: '#f3ead2', edge: '#7a1f2b', inner: '#e6d9b5' },
} as const;

export type ChipTone = keyof typeof TONES;

export function Chip({ tone = 'red', size = 40, className, style }: {
  tone?: ChipTone; size?: number; className?: string; style?: React.CSSProperties;
}) {
  const c = TONES[tone];
  return (
    <svg className={className} style={style} width={size} height={size} viewBox="0 0 40 40" aria-hidden focusable="false">
      <circle cx="20" cy="20" r="19" fill={c.base} />
      {/* kenar çentikleri */}
      <circle cx="20" cy="20" r="16.5" fill="none" stroke={c.edge} strokeWidth="5" strokeDasharray="6.48 6.48" />
      <circle cx="20" cy="20" r="11" fill={c.inner} stroke={c.edge} strokeWidth="1" strokeDasharray="1.5 1.5" />
      <path
        d="M20 13.2c-2.4 2.6-5 4.2-5 6.9 0 1.7 1.3 3 2.9 3 .9 0 1.6-.4 2.1-.9L19.1 26h1.8L20 22.2c.5.5 1.2.9 2.1.9 1.6 0 2.9-1.3 2.9-3 0-2.7-2.6-4.3-5-6.9z"
        fill={c.edge}
      />
    </svg>
  );
}
