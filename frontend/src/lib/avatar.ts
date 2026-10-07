// Karakter avatarları: tamamen bizim çizdiğimiz SVG'ler (dış kütüphane/lisans yok).
// Sunucuda kısa bir metin olarak saklanır: "tohum" ya da "tohum.HGBK"
//   tohum: [A-Za-z0-9_-]{1,32}, yüz (ten, saç, göz, ağız) buradan türetilir
//   H şapka 0-4, G gözlük 0-3, B bıyık/sakal 0-3, K kıyafet rengi 0-7
// Sunucu aynı kuralı doğrular (Validation.avatar); bilinmeyen kod reddedilir.

export const HATS = ['none', 'cowboy', 'fedora', 'tophat', 'visor'] as const;
export const GLASSES = ['none', 'round', 'sun', 'monocle'] as const;
export const BEARDS = ['none', 'mustache', 'beard', 'goatee'] as const;
export const OUTFITS = ['#1d6a47', '#8e2a35', '#2c3e70', '#c08a1e', '#5d3a7a', '#5b6670', '#c4622d', '#1f8a8a'] as const;

export interface AvatarSpec {
  seed: string;
  hat: number;
  glasses: number;
  beard: number;
  outfit: number;
}

const SEED_RE = /^[A-Za-z0-9_-]{1,32}$/;

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Tohumdan türetilen sayı dizisi (aynı tohum = aynı yüz). */
function picker(seed: string) {
  let state = hash(seed) || 1;
  return (n: number) => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return ((state >>> 0) % n + n) % n;
  };
}

export function parseAvatar(value: string): AvatarSpec {
  const [seed, codes] = value.split('.');
  if (codes && /^[0-4][0-3][0-3][0-7]$/.test(codes)) {
    return { seed, hat: +codes[0], glasses: +codes[1], beard: +codes[2], outfit: +codes[3] };
  }
  // Aksesuarsız (M1/M2) avatar: kıyafet rengi tohumdan, aksesuar yok.
  return { seed: seed || 'x', hat: 0, glasses: 0, beard: 0, outfit: hash(seed || 'x') % OUTFITS.length };
}

export function formatAvatar(a: AvatarSpec): string {
  return `${a.seed}.${a.hat}${a.glasses}${a.beard}${a.outfit}`;
}

export function isValidAvatar(value: string) {
  return /^[A-Za-z0-9_-]{1,32}(\.[0-4][0-3][0-3][0-7])?$/.test(value);
}

/** Sunucu kuralıyla uyumlu rastgele tohum. */
export function randomSeed(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 12);
}

/** Rastgele karakter: yeni yüz + rastgele aksesuarlar (çoğu zaman sade). */
export function randomAvatar(): string {
  const r = new Uint8Array(4);
  crypto.getRandomValues(r);
  const sometimes = (v: number, n: number) => (v % 3 === 0 ? 0 : 1 + (v % (n - 1)));
  return formatAvatar({
    seed: randomSeed(),
    hat: sometimes(r[0], HATS.length),
    glasses: r[1] % 2 === 0 ? 0 : 1 + (r[1] % (GLASSES.length - 1)),
    beard: r[2] % 3 === 0 ? 1 + (r[2] % (BEARDS.length - 1)) : 0,
    outfit: r[3] % OUTFITS.length,
  });
}

// ---------------------------------------------------------------- çizim

const SKINS = ['#f7d7c4', '#efc09e', '#d9a07a', '#b97a55', '#8d5a3b', '#5f3b26'];
const HAIR_COLORS = ['#2b1d16', '#5a3825', '#8b5a2b', '#c9a24a', '#b0482a', '#9aa0a6', '#1f1f2e'];
const BACKGROUNDS = ['#d7eadf', '#f1e3c8', '#e3e0f1', '#f3d9d4', '#d6e6ee', '#e8eecf'];

function shade(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (shift: number) => Math.max(0, Math.min(255, ((n >> shift) & 255) + amount));
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')}`;
}

function hairBack(style: number, color: string) {
  // Uzun saç başın arkasında kalır.
  if (style === 1) return `<path d="M27 46 C25 26 37 17 50 17 C63 17 75 26 73 46 L74 70 C68 73 63 72 62 66 L38 66 C37 72 32 73 26 70 Z" fill="${color}"/>`;
  if (style === 3) return `<circle cx="50" cy="15" r="8" fill="${color}"/>`;
  return '';
}

function hairFront(style: number, color: string) {
  switch (style) {
    case 0: // kısa
      return `<path d="M29 45 C27 27 38 19 50 19 C63 19 73 27 71 45 C68 36 60 31 50 31 C41 31 33 35 29 45 Z" fill="${color}"/>`;
    case 1: // uzun (ön perçem)
      return `<path d="M29 46 C27 27 38 19 50 19 C63 19 73 27 71 46 C66 34 56 29 47 31 C40 33 34 38 29 46 Z" fill="${color}"/>`;
    case 2: // kıvırcık
      return [
        [32, 33], [38, 26], [46, 22], [54, 22], [62, 26], [68, 33], [30, 41], [70, 41],
      ].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7.5" fill="${color}"/>`).join('');
    case 3: // topuz
      return `<path d="M29 44 C28 28 38 21 50 21 C62 21 72 28 71 44 C67 35 59 31 50 31 C41 31 33 35 29 44 Z" fill="${color}"/>`;
    case 4: // kel (yanlarda biraz)
      return `<path d="M29 48 C29 41 31 38 33 37 L33 48 Z M71 48 C71 41 69 38 67 37 L67 48 Z" fill="${color}"/>`;
    default: // kabarık perçem
      return `<path d="M29 45 C27 27 38 19 50 19 C63 19 73 27 71 45 C69 38 64 34 58 33 C60 28 55 24 49 27 C44 22 36 27 38 33 C33 35 30 39 29 45 Z" fill="${color}"/>`;
  }
}

function eyes(variant: number) {
  if (variant === 1) {
    // gülen (kapalı) gözler
    return `<path d="M39 49 Q42 46 45 49 M55 49 Q58 46 61 49" stroke="#1b1b1b" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  }
  if (variant === 2) {
    return `<circle cx="42" cy="48" r="3.4" fill="#fff"/><circle cx="58" cy="48" r="3.4" fill="#fff"/>` +
      `<circle cx="42.6" cy="48.4" r="1.9" fill="#1b1b1b"/><circle cx="58.6" cy="48.4" r="1.9" fill="#1b1b1b"/>`;
  }
  return `<circle cx="42" cy="48" r="2.4" fill="#1b1b1b"/><circle cx="58" cy="48" r="2.4" fill="#1b1b1b"/>`;
}

function mouth(variant: number) {
  switch (variant) {
    case 0:
      return `<path d="M43 58 Q50 64 57 58" stroke="#7a2a22" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
    case 1:
      return `<path d="M42 57 Q50 66 58 57 Z" fill="#7a2a22"/><path d="M45 58.5 H55" stroke="#fff" stroke-width="1.6"/>`;
    case 2:
      return `<path d="M44 59 Q51 62 57 57" stroke="#7a2a22" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
    default:
      return `<circle cx="50" cy="59" r="2.6" fill="#7a2a22"/>`;
  }
}

function beardArt(kind: number, color: string) {
  switch (kind) {
    case 1: // bıyık
      return `<path d="M40 56 C43 52 48 53 50 55 C52 53 57 52 60 56 C56 56 53 57 50 56.5 C47 57 44 56 40 56 Z" fill="${color}"/>`;
    case 2: // sakal
      return `<path d="M30 49 C31 63 39 70 50 70 C61 70 69 63 70 49 C67 56 63 60 58 60 C55 57 45 57 42 60 C37 60 33 56 30 49 Z" fill="${color}"/>` +
        `<path d="M41 56 C44 53 48 54 50 55.5 C52 54 56 53 59 56 C55 56 52 57 50 56.6 C48 57 45 56 41 56 Z" fill="${color}"/>`;
    case 3: // keçi sakalı
      return `<path d="M45 62 C46 69 54 69 55 62 C53 64 47 64 45 62 Z" fill="${color}"/>` +
        `<path d="M43 56 C46 54 49 55 50 56 C51 55 54 54 57 56 C54 56.5 52 57 50 56.8 C48 57 46 56.5 43 56 Z" fill="${color}"/>`;
    default:
      return '';
  }
}

function glassesArt(kind: number) {
  switch (kind) {
    case 1:
      return `<g fill="none" stroke="#2b2b2b" stroke-width="1.8"><circle cx="42" cy="48" r="6"/><circle cx="58" cy="48" r="6"/><path d="M48 48 H52 M36 47 L31 45 M64 47 L69 45"/></g>`;
    case 2:
      return `<g stroke="#111" stroke-width="1.6"><path d="M35 44 H48 V49 C48 53 45 54 41.5 54 C38 54 35 53 35 49 Z" fill="#1b1b1b"/>` +
        `<path d="M52 44 H65 V49 C65 53 62 54 58.5 54 C55 54 52 53 52 49 Z" fill="#1b1b1b"/><path d="M48 46 H52 M35 45 L30 44 M65 45 L70 44" fill="none"/></g>` +
        `<path d="M37 46 L41 46" stroke="#fff" stroke-opacity="0.5" stroke-width="1.4"/>`;
    case 3:
      return `<circle cx="58" cy="48" r="6.2" fill="#ffffff" fill-opacity="0.25" stroke="#c9a24a" stroke-width="2"/>` +
        `<path d="M62 53 C64 60 66 64 64 70" stroke="#c9a24a" stroke-width="1.2" fill="none"/>`;
    default:
      return '';
  }
}

function hatArt(kind: number, outfit: string) {
  switch (kind) {
    case 1: // kovboy
      return `<path d="M33 29 C33 15 40 11 44 15 C47 12 53 12 56 15 C60 11 67 15 67 29 Z" fill="#9a6235"/>` +
        `<path d="M33 27 H67 V30 H33 Z" fill="#5b2e1d"/>` +
        `<path d="M16 30 C22 36 36 34 50 34 C64 34 78 36 84 30 C80 27 72 29 66 28 L34 28 C28 29 20 27 16 30 Z" fill="#b0743f"/>`;
    case 2: // fötr (dedektif)
      return `<path d="M34 30 C34 18 40 14 50 14 C60 14 66 18 66 30 Z" fill="#4a4a52"/>` +
        `<path d="M46 15 C48 19 52 19 54 15" stroke="#33333a" stroke-width="1.6" fill="none"/>` +
        `<rect x="34" y="25" width="32" height="5" fill="#1b1b1b"/>` +
        `<ellipse cx="50" cy="31" rx="25" ry="4.5" fill="#3d3d44"/>`;
    case 3: // silindir
      return `<rect x="36" y="4" width="28" height="27" rx="2" fill="#1b1b1b"/>` +
        `<rect x="36" y="23" width="28" height="5" fill="${outfit}"/>` +
        `<ellipse cx="50" cy="31" rx="22" ry="4" fill="#111"/>`;
    case 4: // krupiye vizörü
      return `<path d="M29 31 C30 25 70 25 71 31 Z" fill="#f5f0e1"/>` +
        `<path d="M26 31 C34 41 66 41 74 31 Z" fill="#2b8a5b" fill-opacity="0.85"/>` +
        `<path d="M26 31 H74" stroke="#145236" stroke-width="2"/>`;
    default:
      return '';
  }
}

/** Krupiyenin yeleği ve papyonu (kıyafetin üstüne). */
function dealerArt() {
  return `<path d="M36 79 L50 96 L64 79 C70 80 76 83 80 88 L80 100 L20 100 L20 88 C24 83 30 80 36 79 Z" fill="#7a1f2b"/>` +
    `<path d="M42 78 L50 92 L58 78 Z" fill="#fffdf7"/>` +
    `<circle cx="50" cy="94" r="1.3" fill="#c9a24a"/><circle cx="48" cy="99" r="1.3" fill="#c9a24a"/>` +
    `<path d="M42 76 L49 80 L42 84 Z M58 76 L51 80 L58 84 Z" fill="#1b1b1b"/><circle cx="50" cy="80" r="2" fill="#1b1b1b"/>`;
}

export function avatarSvg(value: string, dealer = false): string {
  const a = parseAvatar(value);
  const pick = picker(SEED_RE.test(a.seed) ? a.seed : 'x');
  const skin = SKINS[pick(SKINS.length)];
  const hairColor = HAIR_COLORS[pick(HAIR_COLORS.length)];
  const hairStyle = pick(6);
  const eyeVariant = pick(3);
  const mouthVariant = pick(4);
  const bg = BACKGROUNDS[pick(BACKGROUNDS.length)];
  const outfit = OUTFITS[a.outfit] ?? OUTFITS[0];

  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">`,
    `<defs><clipPath id="c"><circle cx="50" cy="50" r="50"/></clipPath></defs>`,
    `<g clip-path="url(#c)">`,
    `<rect width="100" height="100" fill="${bg}"/>`,
    // Karakter dairede biraz büyütülür: yüz küçük boyutlarda da seçilsin.
    `<g transform="translate(50 56) scale(1.14) translate(-50 -56)">`,
    hairBack(hairStyle, hairColor),
    // gövde ve boyun
    `<path d="M14 104 C14 86 28 78 50 78 C72 78 86 86 86 104 Z" fill="${outfit}"/>`,
    `<path d="M43 62 H57 V79 C54 82 46 82 43 79 Z" fill="${shade(skin, -18)}"/>`,
    dealer ? dealerArt() : `<path d="M42 78 L50 86 L58 78" fill="none" stroke="${shade(outfit, -30)}" stroke-width="2"/>`,
    // kulaklar ve baş
    `<circle cx="30" cy="49" r="4.5" fill="${shade(skin, -10)}"/><circle cx="70" cy="49" r="4.5" fill="${shade(skin, -10)}"/>`,
    `<ellipse cx="50" cy="46" rx="20" ry="23" fill="${skin}"/>`,
    hairFront(hairStyle, hairColor),
    // kaşlar, gözler, burun, yanaklar, ağız
    `<path d="M38 42 Q42 40 46 42 M54 42 Q58 40 62 42" stroke="${shade(hairColor, -10)}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`,
    eyes(eyeVariant),
    `<path d="M50 50 Q48 55 51 55" stroke="${shade(skin, -45)}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`,
    `<circle cx="37" cy="55" r="3.2" fill="#e8807a" fill-opacity="0.35"/><circle cx="63" cy="55" r="3.2" fill="#e8807a" fill-opacity="0.35"/>`,
    mouth(mouthVariant),
    beardArt(a.beard, hairColor),
    glassesArt(a.glasses),
    hatArt(a.hat, outfit),
    `</g></g></svg>`,
  ];
  return parts.join('');
}

const cache = new Map<string, string>();

export function avatarUri(value: string, dealer = false): string {
  const key = `${dealer ? 'D' : ''}${value}`;
  let uri = cache.get(key);
  if (!uri) {
    uri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(avatarSvg(value, dealer))}`;
    cache.set(key, uri);
  }
  return uri;
}
