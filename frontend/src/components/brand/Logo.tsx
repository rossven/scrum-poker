/**
 * SprintMasası amblemi: yeşil zemin üstünde bir kart, kartın ortasında sprint döngüsü.
 * Aynı çizim public/favicon.svg'de de var (ürün adı değişirse ikisi birlikte güncellenir).
 */
export function Logo({ size = 28, title }: { size?: number; title?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role={title ? 'img' : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      <LogoArt />
    </svg>
  );
}

export function LogoArt() {
  return (
    <>
      <defs>
        <linearGradient id="sm-logo-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1f9a6e" />
          <stop offset="1" stopColor="#0e5a42" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#sm-logo-bg)" />
      <rect x="17" y="11" width="30" height="42" rx="6" fill="#ffffff" transform="rotate(-8 32 32)" />
      <g transform="translate(12 12)">
        <SprintLoopPaths color="#12775a" />
      </g>
    </>
  );
}

/** Sprint döngüsü: kendine dönen ok ve ortada bir nokta (40×40 ızgara). */
function SprintLoopPaths({ color }: { color: string }) {
  return (
    <>
      <path d="M26 9.6A12 12 0 1 0 32 20" fill="none" stroke={color} strokeWidth="3.6" strokeLinecap="round" />
      <path d="M32 14.2 27.6 21.4h8.8z" fill={color} stroke={color} strokeWidth="1.2" strokeLinejoin="round" />
      <circle cx="20" cy="20" r="3.6" fill={color} />
    </>
  );
}

/** Kart ortasındaki amblem; renk kartın tonundan gelir. */
export function SprintEmblem({ color = 'currentColor' }: { color?: string }) {
  return (
    <svg viewBox="0 0 40 40" width="100%" height="100%" aria-hidden>
      <SprintLoopPaths color={color} />
    </svg>
  );
}
