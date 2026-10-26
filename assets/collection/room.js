// A curated room: /art/collection/room/?r=<slug>
import { loadPublic, setMeta, esc } from './data.js';
import { card, orderWorks } from './render-work.js';
import './ui.js';

const host = document.getElementById('cx-room');
const slug = new URLSearchParams(location.search).get('r');
loadPublic().then((data) => {
  const r = data.rooms.find((x) => x.slug === slug);
  const works = r ? orderWorks(data.artworks.filter((w) => (w.rooms || []).includes(r.id))) : [];
  if (!r || !works.length) {
    setMeta({ title: 'Room not found — The Ria Collection', noindex: true });
    host.innerHTML = '<div class="cx-empty-page"><p class="cx-label">Rooms</p><h1 class="cx-work-title">This room is closed.</h1><a class="cx-enter" href="/art/collection/">Return to the collection</a></div>';
    return;
  }
  setMeta({ title: r.name + ' — The Ria Collection', description: r.description || ('A room of The Ria Collection: ' + r.name + '.'),
    canonical: location.origin + location.pathname + '?r=' + encodeURIComponent(r.slug) });
  const others = data.rooms.filter((x) => x.id !== r.id && data.artworks.some((w) => (w.rooms || []).includes(x.id)));
  host.innerHTML = '<header class="cx-page-head"><p class="cx-label">Room</p><h1 class="cx-title cx-title-sm">' + esc(r.name) + '</h1>' +
    (r.description ? '<p class="cx-lede">' + esc(r.description) + '</p>' : '') + '</header>' +
    '<div class="cx-masonry">' + works.map((w) => card(w, { size: 'm' })).join('') + '</div>' +
    (others.length ? '<nav class="cx-other-rooms" aria-label="Other rooms"><p class="cx-label">Other rooms</p>' +
      others.map((x) => '<a href="?r=' + encodeURIComponent(x.slug) + '">' + esc(x.name) + '</a>').join('') + '</nav>' : '');
}).catch((e) => { console.error(e); host.innerHTML = '<p class="cx-empty">This room could not be opened just now.</p>'; });
