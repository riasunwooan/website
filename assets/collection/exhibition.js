// A public exhibition: /art/collection/exhibition/?e=<slug>. Shows only public-facing fields of each work.
import { loadPublic, setMeta, esc, sanitize, plate, byline, workUrl } from './data.js';
import './ui.js';

const host = document.getElementById('cx-exhibition');
const slug = new URLSearchParams(location.search).get('e');
loadPublic().then((data) => {
  const ex = data.exhibitions.find((x) => x.slug === slug);
  const items = ex ? (ex.items || []).map((it) => ({ it, a: data.artworks.find((w) => w.id === it.artwork_id) })).filter((x) => x.a) : [];
  if (!ex || !items.length) {
    setMeta({ title: 'Exhibition not found — The Ria Collection', noindex: true });
    host.innerHTML = '<div class="cx-empty-page"><p class="cx-label">Exhibitions</p><h1 class="cx-work-title">This exhibition has closed.</h1><a class="cx-enter" href="/art/collection/">Return to the collection</a></div>';
    return;
  }
  setMeta({ title: ex.title + ' — An exhibition — The Ria Collection', canonical: location.origin + location.pathname + '?e=' + encodeURIComponent(ex.slug) });
  host.innerHTML = '<header class="cx-page-head"><p class="cx-label">Exhibition</p><h1 class="cx-title cx-title-sm">' + esc(ex.title) + '</h1>' +
    (ex.intro ? '<div class="cx-prose cx-lede">' + sanitize(ex.intro) + '</div>' : '') + '</header>' +
    '<ol class="cx-ex-list">' + items.map(({ it, a }, i) =>
      '<li class="cx-ex-item"><a class="cx-ex-plate" href="' + workUrl(a) + '">' + plate(a) + '</a>' +
      '<div class="cx-ex-text"><p class="cx-label">' + String(i + 1).padStart(2, '0') + '</p><h2><a href="' + workUrl(a) + '">' + esc(a.title) + '</a></h2>' +
      '<p class="cx-work-by">' + byline(a) + '</p>' + (it.note ? '<p class="cx-ex-note">' + esc(it.note) + '</p>' : '') + '</div></li>').join('') + '</ol>';
}).catch((e) => { console.error(e); host.innerHTML = '<p class="cx-empty">This exhibition could not be opened just now.</p>'; });
