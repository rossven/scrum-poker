import type { ReactNode } from 'react';

/*
 * SprintMasası ikon seti: projeye özel çizildi (proje lisansıyla birlikte gelir, dış kaynak yok).
 * 24×24 ızgara, 1.8 kalınlıkta yuvarlak uçlu çizgi; iskambil sembolleri dolgulu.
 * İkonlar süstür (aria-hidden): düğmenin erişilebilir adı her zaman yanındaki yazıdır.
 */

const f = { fill: 'currentColor', stroke: 'none' } as const;

/** Dişli: 8 diş, iç ve dış yarıçap arasında gidip gelen çokgen. */
const gearPath = (() => {
  const pts: string[] = [];
  for (let i = 0; i < 16; i++) {
    const a0 = (i / 16) * Math.PI * 2 - Math.PI / 16;
    const a1 = a0 + Math.PI / 8;
    const r = i % 2 === 0 ? 9 : 6.8;
    pts.push(`${(12 + r * Math.cos(a0)).toFixed(2)} ${(12 + r * Math.sin(a0)).toFixed(2)}`);
    pts.push(`${(12 + r * Math.cos(a1)).toFixed(2)} ${(12 + r * Math.sin(a1)).toFixed(2)}`);
  }
  return `M${pts.join('L')}Z`;
})();

const ICONS = {
  spade: (
    <path {...f} d="M12 2.5c-3 3.5-7.5 6.1-7.5 10.1 0 2.5 2 4.4 4.3 4.4 1.2 0 2.2-.4 2.9-1.2l-1.2 5.7h3l-1.2-5.7c.7.8 1.7 1.2 2.9 1.2 2.3 0 4.3-1.9 4.3-4.4 0-4-4.5-6.6-7.5-10.1z" />
  ),
  heart: (
    <path {...f} d="M12 20.5S3.5 15.2 3.5 9.3C3.5 6.6 5.6 4.5 8.2 4.5c1.6 0 3 .8 3.8 2.1.8-1.3 2.2-2.1 3.8-2.1 2.6 0 4.7 2.1 4.7 4.8 0 5.9-8.5 11.2-8.5 11.2z" />
  ),
  diamond: <path {...f} d="M12 2.5 19 12l-7 9.5L5 12z" />,
  club: (
    <g {...f}>
      <circle cx="12" cy="7.3" r="3.7" />
      <circle cx="7.3" cy="13.2" r="3.7" />
      <circle cx="16.7" cy="13.2" r="3.7" />
      <circle cx="12" cy="12.4" r="2.6" />
      <path d="M12 12.5 10.3 21.5h3.4z" />
    </g>
  ),
  chip: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="7.6" strokeWidth="2.6" strokeDasharray="2.7 3.27" strokeLinecap="butt" />
      <circle cx="12" cy="12" r="4" />
    </>
  ),
  cards: (
    <>
      <rect x="8.5" y="3.5" width="11" height="15" rx="2" />
      <path d="M6.3 6.4 4.4 6.9A2 2 0 0 0 3 9.3l2.9 10.8a2 2 0 0 0 2.4 1.4l5.2-1.4" />
      <path {...f} d="M14 7.8c-1.2 1.3-2.8 2.2-2.8 3.7 0 .9.7 1.6 1.6 1.6.4 0 .8-.2 1.1-.5l-.5 2.1h1.2l-.5-2.1c.3.3.7.5 1.1.5.9 0 1.6-.7 1.6-1.6 0-1.5-1.6-2.4-2.8-3.7z" />
    </>
  ),
  crown: (
    <>
      <path d="M3.5 8 7.7 11.6 12 5l4.3 6.6L20.5 8l-1.8 9.5H5.3z" />
      <path d="M5.5 20.5h13" />
    </>
  ),
  horse: (
    <>
      <path d="M5.5 20.5h13" />
      <path d="M8 20.5c0-2.8 1.3-4.6 3.5-6.2l-1-1.2c-1.4.9-3 1.1-4.3.6L5 12.4c-.4-.6-.3-1.3.2-1.8l4.6-4.4.4-2.7 2 1.6c3.6.3 6.3 3.4 6.3 8.2v7.2" />
      <circle {...f} cx="10.9" cy="8.9" r="1" />
    </>
  ),
  wheel: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4" />
      <circle {...f} cx="12" cy="12" r="2" />
    </>
  ),
  hand: (
    <path d="M8 13.5V5.5a1.5 1.5 0 0 1 3 0V11m0-.5V4a1.5 1.5 0 0 1 3 0v6.5m0 0V5.5a1.5 1.5 0 0 1 3 0V12m0-2.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7h-1.2a6 6 0 0 1-4.6-2.2l-2.7-3.4a1.6 1.6 0 0 1 2.4-2.1L8 14.5" />
  ),
  gear: (
    <>
      <path d={gearPath} />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  link: (
    <path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" />
  ),
  bell: <path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5a2.2 2.2 0 0 0 4 0" />,
  bellOff: (
    <>
      <path d="M8.2 5.8A6 6 0 0 1 18 11v3.5M18 18H4.5L6 16v-5c0-.9.2-1.8.6-2.6M10 20.5a2.2 2.2 0 0 0 4 0" />
      <path d="M3.5 3.5l17 17" />
    </>
  ),
  door: <path d="M14 4H6.5A1.5 1.5 0 0 0 5 5.5v13A1.5 1.5 0 0 0 6.5 20H14M10 12h10M16.5 8.5 20 12l-3.5 3.5" />,
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  timer: (
    <>
      <circle cx="12" cy="13.5" r="7.5" />
      <path d="M12 9.5v4l2.5 2M9.5 2.5h5M12 2.5V6M18.5 6.5 20 5" />
    </>
  ),
  trophy: (
    <path d="M7 4h10v5a5 5 0 0 1-10 0zM7 6H4.5a.5.5 0 0 0-.5.5c0 2.5 1.5 4 3.4 4.3M17 6h2.5a.5.5 0 0 1 .5.5c0 2.5-1.5 4-3.4 4.3M12 14v3.5M8 20.5h8M9.5 20.5c0-1.7 1.1-3 2.5-3s2.5 1.3 2.5 3" />
  ),
  undo: <path d="M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />,
  refresh: <path d="M20 11a8 8 0 0 0-14.3-4.9L4 8M4 3.5V8h4.5M4 13a8 8 0 0 0 14.3 4.9L20 16M20 20.5V16h-4.5" />,
  ticket: (
    <path d="M3.5 7.5A1.5 1.5 0 0 1 5 6h14a1.5 1.5 0 0 1 1.5 1.5V10a2 2 0 0 0 0 4v2.5A1.5 1.5 0 0 1 19 18H5a1.5 1.5 0 0 1-1.5-1.5V14a2 2 0 0 0 0-4zM14.5 6v2M14.5 11v2M14.5 16v2" />
  ),
  kick: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0M17 8.5l4 4M21 8.5l-4 4" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0M15.5 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2a6.5 6.5 0 0 1 3.5 5.8" />
    </>
  ),
  play: <path d="M7 4.5v15l12-7.5z" strokeLinejoin="round" />,
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2" />
      <path d="M8 10.5v-3a4 4 0 0 1 8 0v3" />
    </>
  ),
  scale: <path d="M12 3.5v17M7.5 20.5h9M5 6.5h14M2.5 13.5a2.5 2.5 0 0 0 5 0L5 7.5zM16.5 13.5a2.5 2.5 0 0 0 5 0L19 7.5z" />,
  check: <path d="M4.5 12.5l5 5 10-10.5" />,
  arrowRight: <path d="M4.5 12h15M13.5 6l6 6-6 6" />,
  arrowUp: <path d="M12 19.5v-15M6 10.5l6-6 6 6" />,
  arrowDown: <path d="M12 4.5v15M6 13.5l6 6 6-6" />,
  pencil: <path d="M15 4.5 19.5 9 8.5 20H4v-4.5zM13 6.5l4.5 4.5" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
    </>
  ),
  moon: <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z" />,
  monitor: (
    <>
      <rect x="3" y="4.5" width="18" height="12" rx="2" />
      <path d="M8.5 20.5h7M12 16.5v4" />
    </>
  ),
  nudge: <path d="M5 3.5l13 6-5.6 1.9L10.5 17zM12.4 11.4l6 6" />,
  shuffle: (
    <path d="M3.5 7h3.5c4 0 6 10 10 10h3.5M3.5 17H7c1.6 0 2.8-1.6 3.9-3.5M13.1 10.5C14.2 8.6 15.4 7 17 7h3.5M17.5 4l3 3-3 3M17.5 14l3 3-3 3" />
  ),
  smile: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 14.5a4.5 4.5 0 0 0 7 0" />
      <circle {...f} cx="9" cy="10" r="1.1" />
      <circle {...f} cx="15" cy="10" r="1.1" />
    </>
  ),
  history: (
    <>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.5-6L3.5 8.5M3.5 4v4.5H8" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  chart: <path d="M4 20.5h16M7 17V11M12 17V6M17 17v-8" />,
  plus: <path d="M12 5v14M5 12h14" />,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 18, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      className={`icon ${className ?? ''}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
    >
      {ICONS[name]}
    </svg>
  );
}

/** Takımın dört sembolü yan yana: başlık ve ayırıcı süsü. */
export function SuitRow({ size = 12, className }: { size?: number; className?: string }) {
  return (
    <span className={`suit-row ${className ?? ''}`} aria-hidden>
      <Icon name="spade" size={size} />
      <Icon name="heart" size={size} className="suit-red" />
      <Icon name="diamond" size={size} className="suit-red" />
      <Icon name="club" size={size} />
    </span>
  );
}
