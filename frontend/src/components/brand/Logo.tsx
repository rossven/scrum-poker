/**
 * SprintMasası amblemi: yeşil çuha üstünde altın halka, iki iskambil kartı ve maça.
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
      <circle cx="32" cy="32" r="30" fill="#1c6b46" />
      <circle cx="32" cy="32" r="30" fill="none" stroke="#5b2e1d" strokeWidth="3" />
      <circle cx="32" cy="32" r="25.5" fill="none" stroke="#c9a24a" strokeWidth="1.6" />
      <rect x="15" y="17" width="20" height="28" rx="3" fill="#fffdf7" stroke="#c9a24a" strokeWidth="1.2" transform="rotate(-14 25 31)" />
      <rect x="27" y="17" width="20" height="28" rx="3" fill="#fffdf7" stroke="#c9a24a" strokeWidth="1.2" transform="rotate(10 37 31)" />
      <path
        transform="rotate(10 37 31)"
        d="M37 22.5c-3.6 3.6-7.4 5.8-7.4 9.4 0 2.2 1.7 3.8 3.7 3.8 1.2 0 2.2-.5 2.8-1.3l-1.3 4.4h4.4l-1.3-4.4c.6.8 1.6 1.3 2.8 1.3 2 0 3.7-1.6 3.7-3.8 0-3.6-3.8-5.8-7.4-9.4z"
        fill="#1b1b1b"
      />
    </>
  );
}

/** Kart ortasındaki sade amblem. */
export function CardEmblem() {
  return (
    <svg viewBox="0 0 40 40" width="100%" height="100%" aria-hidden>
      <circle cx="20" cy="20" r="17" fill="none" stroke="#c9a24a" strokeWidth="1.6" />
      <circle cx="20" cy="20" r="13.5" fill="#1c6b46" />
      <path
        d="M20 10.5c-3.4 3.4-7 5.5-7 8.9 0 2.1 1.6 3.6 3.5 3.6 1.1 0 2.1-.5 2.7-1.2L18 26h4l-1.2-4.2c.6.7 1.6 1.2 2.7 1.2 1.9 0 3.5-1.5 3.5-3.6 0-3.4-3.6-5.5-7-8.9z"
        fill="#fffdf7"
      />
    </svg>
  );
}
