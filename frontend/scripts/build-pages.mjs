// Statik içerik sayfalarını üretir: dist/pages/*.html, boot parçaları ve manifest.json.
// Vite build'inden sonra çalışır (npm run build). Sunucu (web/SiteController) bunları sınıf yolundan okur.
// Sayfalarda __SITE_URL__ yer tutucusu vardır; sunucu isteğin gerçek adresiyle değiştirir.

import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { home, pages, ui, UPDATED } from '../content/site.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'dist', 'pages');
if (!existsSync(join(root, 'dist'))) {
  console.error('dist/ yok: önce "vite build" çalıştırın.');
  process.exit(1);
}
mkdirSync(out, { recursive: true });

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** **kalın** ve [metin](adres) destekli satır içi biçim; önce kaçışlanır. */
function inline(text) {
  return esc(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => {
      const external = /^https?:/.test(href);
      return `<a href="${href}"${external ? ' rel="noopener noreferrer" target="_blank"' : ''}>${label}</a>`;
    });
}

function renderBlocks(page, t) {
  return page.blocks
    .map((b) => {
      if (b.h2) return `<h2>${inline(b.h2)}</h2>`;
      if (b.h3) return `<h3>${inline(b.h3)}</h3>`;
      if (b.p) return `<p>${inline(b.p)}</p>`;
      if (b.ul) return `<ul>${b.ul.map((i) => `<li>${inline(i)}</li>`).join('')}</ul>`;
      if (b.ol) return `<ol>${b.ol.map((i) => `<li>${inline(i)}</li>`).join('')}</ol>`;
      if (b.cta) return `<p class="cta-row"><a class="btn" href="${t.ctaPath}">${esc(t.cta)}</a></p>`;
      throw new Error(`Bilinmeyen blok: ${JSON.stringify(b)}`);
    })
    .join('\n');
}

const LOGO = `<svg width="30" height="30" viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1f9a6e"/><stop offset="1" stop-color="#0e5a42"/></linearGradient></defs><rect x="2" y="2" width="60" height="60" rx="16" fill="url(#g)"/><rect x="17" y="11" width="30" height="42" rx="6" fill="#fff" transform="rotate(-8 32 32)"/><g transform="translate(12 12)"><path d="M26 9.6A12 12 0 1 0 32 20" fill="none" stroke="#12775a" stroke-width="3.6" stroke-linecap="round"/><path d="M32 14.2 27.6 21.4h8.8z" fill="#12775a" stroke="#12775a" stroke-width="1.2" stroke-linejoin="round"/><circle cx="20" cy="20" r="3.6" fill="#12775a"/></g></svg>`;

const byId = (id, lang) => pages.find((p) => p.id === id && p.lang === lang);
const homePath = { tr: '/', en: '/en' };

function render(page) {
  const t = ui[page.lang];
  const other = page.lang === 'tr' ? 'en' : 'tr';
  const alt = byId(page.id, other);
  const urls = { [page.lang]: page.path, [other]: alt.path };
  const guide = byId('guide', page.lang);
  const story = byId('storyPoints', page.lang);
  const priv = byId('privacy', page.lang);
  const jsonLd = page.noCta
    ? ''
    : `<script type="application/ld+json">${JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: page.h1,
        description: page.description,
        inLanguage: page.lang,
        dateModified: UPDATED,
        mainEntityOfPage: `__SITE_URL__${page.path}`,
        publisher: { '@type': 'Organization', name: 'SprintMasası', url: '__SITE_URL__/' },
      })}</script>`;
  return `<!doctype html>
<html lang="${page.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>${esc(page.title)}</title>
<meta name="description" content="${esc(page.description)}">
<link rel="canonical" href="__SITE_URL__${page.path}">
<link rel="alternate" hreflang="${page.lang}" href="__SITE_URL__${urls[page.lang]}">
<link rel="alternate" hreflang="${other}" href="__SITE_URL__${urls[other]}">
<link rel="alternate" hreflang="x-default" href="__SITE_URL__${page.lang === 'tr' ? page.path : alt.path}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="SprintMasası">
<meta property="og:locale" content="${home[page.lang].locale}">
<meta property="og:title" content="${esc(page.title)}">
<meta property="og:description" content="${esc(page.description)}">
<meta property="og:url" content="__SITE_URL__${page.path}">
<meta property="og:image" content="__SITE_URL__/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0f7656">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="stylesheet" href="/site.css">
${jsonLd}
</head>
<body>
<header class="top">
  <a class="brand" href="${homePath[page.lang]}">${LOGO}<span>${esc(t.brand)}</span></a>
  <nav aria-label="${esc(t.nav)}">
    <a href="${guide.path}"${page.id === 'guide' ? ' aria-current="page"' : ''}>${esc(t.guide)}</a>
    <a href="${story.path}"${page.id === 'storyPoints' ? ' aria-current="page"' : ''}>${esc(t.storyPoints)}</a>
    <a href="${alt.path}" hreflang="${other}" lang="${other}">${esc(t.otherLang)}</a>
    <a class="btn small" href="${t.ctaPath}">${esc(t.cta)}</a>
  </nav>
</header>
<main>
<article>
<h1>${esc(page.h1)}</h1>
<p class="lead">${inline(page.lead)}</p>
${renderBlocks(page, t)}
${page.noCta ? `<p class="meta">${esc(t.updated)}: ${esc(t.dateFmt)}</p>` : ''}
</article>
</main>
<footer>
  <span>${esc(t.footerNote)}</span>
  <nav aria-label="${esc(t.nav)}">
    <a href="${homePath[page.lang]}">${esc(t.brand)}</a>
    <a href="${guide.path}">${esc(t.guide)}</a>
    <a href="${story.path}">${esc(t.storyPoints)}</a>
    <a href="${priv.path}"${page.id === 'privacy' ? ' aria-current="page"' : ''}>${esc(t.privacy)}</a>
    <a href="https://github.com/rossven/scrum-poker" rel="noopener noreferrer" target="_blank">${esc(t.source)}</a>
  </nav>
</footer>
</body>
</html>
`;
}

const manifest = { pages: [], home: {} };
for (const page of pages) {
  const file = `${page.path.replace(/^\//, '').replace(/\//g, '__')}.html`;
  writeFileSync(join(out, file), render(page));
  const other = page.lang === 'tr' ? 'en' : 'tr';
  manifest.pages.push({ path: page.path, file, lang: page.lang, id: page.id, alternate: byId(page.id, other).path });
}

for (const lang of ['tr', 'en']) {
  const h = home[lang];
  const links = ['guide', 'storyPoints', 'privacy']
    .map((id) => `<a href="${byId(id, lang).path}">${esc(ui[lang][id])}</a>`)
    .join(' · ');
  manifest.home[lang] = {
    path: homePath[lang],
    title: h.title,
    description: h.description,
    ogDescription: h.ogDescription,
    locale: h.locale,
    // React yüklenene kadar (ve JS çalıştırmayan botlar için) görünen sade ana sayfa içeriği.
    boot: `<main class="boot"><h1>${esc(h.boot.h1)}</h1><p>${esc(h.boot.p)}</p><p><a href="/yeni?lang=${lang}">${esc(h.boot.cta)}</a></p><nav>${links}</nav></main>`,
  };
}
writeFileSync(join(out, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`${pages.length} sayfa üretildi: ${out}`);
