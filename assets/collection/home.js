// The museum entrance: the searchable collection and the quieter sections below it.
import { loadPublic, BASE, esc, plate, byline, workUrl, roomUrl, exhibitionUrl, fmtDate, sanitize } from './data.js';
import { card, orderWorks } from './render-work.js';
import { door, gate } from './door.js';
import './ui.js';

const host = document.getElementById('cx-home');
const DEFAULT_SECTIONS = ['collection', 'rooms', 'exhibitions', 'recent'];
const surname = (s) => (s || '').trim().split(/\s+/).pop().toLowerCase();

loadPublic().then(render).catch((e) => {
  console.error(e);
  host.innerHTML = '<p class="cx-empty">The galleries could not be opened just now. Please try again in a moment.</p>';
});

function render(data) {
  const works = orderWorks(data.artworks);
  const settings = data.settings || {};
  const order = (settings.sections || DEFAULT_SECTIONS).filter((s) => !(settings.hidden || []).includes(s));
  DEFAULT_SECTIONS.forEach((s) => { if (!order.includes(s) && !(settings.hidden || []).includes(s)) order.push(s); });

  if (!works.length) {
    host.innerHTML = '<p class="cx-empty">The collection is quiet for now. The first works are still being hung.</p>';
    return;
  }
  const builders = { collection, recent, rooms, exhibitions };
  host.innerHTML = order.map((s) => (builders[s] ? builders[s](works, data) : '')).join('');
  wireCollection(works);
}

function options(works, key, label) {
  const vals = [...new Set(works.flatMap((w) => (Array.isArray(w[key]) ? w[key] : [w[key]])).filter(Boolean))].sort();
  return '<label class="cx-field"><span>' + label + '</span><select data-f="' + key + '"><option value="">All</option>' +
    vals.map((v) => '<option>' + esc(v) + '</option>').join('') + '</select></label>';
}

function collection(works) {
  return '<section class="cx-collection" id="collection" aria-labelledby="cx-col-h">' +
    '<div class="cx-sec-head"><h2 id="cx-col-h">The Collection</h2><p class="cx-count" aria-live="polite"></p></div>' +
    '<form class="cx-controls" role="search" onsubmit="return false">' +
      '<label class="cx-field cx-search"><span>Search</span><input type="search" data-f="q" placeholder="Title or artist" autocomplete="off"></label>' +
      options(works, 'themes', 'Theme') + options(works, 'movement', 'Movement') + options(works, 'period', 'Period') +
      '<label class="cx-field"><span>Sort</span><select data-f="sort">' +
        '<option value="curated">Curated order</option><option value="added">Recently added</option>' +
        '<option value="artist">Artist</option><option value="year">Year created</option></select></label>' +
      '<label class="cx-field"><span>View</span><select data-f="view"><option value="visit">By visit</option><option value="all">All works</option></select></label>' +
    '</form>' +
    '<div class="cx-gallery-view"></div>' +
  '</section>';
}

function wireCollection(works) {
  const form = host.querySelector('.cx-controls');
  if (!form) return;
  const grid = host.querySelector('.cx-gallery-view'), count = host.querySelector('.cx-count');
  const f = (k) => form.querySelector('[data-f="' + k + '"]');
  const params = new URLSearchParams(location.search);
  if (params.get('q')) f('q').value = params.get('q');
  if (params.get('theme')) f('themes').value = params.get('theme');
  if (params.get('sort')) f('sort').value = params.get('sort');
  if (params.get('view')) f('view').value = params.get('view');

  function apply() {
    const q = f('q').value.trim().toLowerCase();
    const theme = f('themes').value, mv = f('movement').value, pd = f('period').value, sort = f('sort').value;
    let list = works.filter((w) =>
      (!q || (w.title + ' ' + w.artist).toLowerCase().includes(q)) &&
      (!theme || (w.themes || []).includes(theme)) && (!mv || w.movement === mv) && (!pd || w.period === pd));
    if (sort === 'added') list = list.slice().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    if (sort === 'artist') list = list.slice().sort((a, b) => surname(a.artist).localeCompare(surname(b.artist)) || a.title.localeCompare(b.title));
    if (sort === 'year') list = list.slice().sort((a, b) => (a.year_sort ?? 1e9) - (b.year_sort ?? 1e9));
    grid.innerHTML = !list.length ? '<p class="cx-empty">Nothing in the collection matches that yet.</p>' :
      f('view').value === 'all' ? rows(list) : visits(list).map((v) =>
        '<section class="cx-visit"><h3 class="cx-visit-head"><span>' + esc(v.place || 'Elsewhere') + '</span>' +
        (v.date ? '<time datetime="' + esc(v.date) + '">' + esc(fmtDate(v.date)) + '</time>' : '<time>Date not recorded</time>') + '</h3>' + rows(v.works) + '</section>').join('');
    count.textContent = list.length + (list.length === 1 ? ' work' : ' works');
    const p = new URLSearchParams();
    if (q) p.set('q', f('q').value.trim());
    if (theme) p.set('theme', theme);
    if (sort !== 'curated') p.set('sort', sort);
    if (f('view').value !== 'visit') p.set('view', f('view').value);
    history.replaceState(null, '', location.pathname + (p.toString() ? '?' + p : '') + location.hash);
  }
  form.addEventListener('input', apply);
  apply();
  if (location.hash === '#collection') host.querySelector('#collection').scrollIntoView();
}

// Works seen on the same day at the same museum, most recent visit first; undated works go last.
function visits(list) {
  const out = [];
  list.forEach((w) => {
    const date = w.discovered_on || '', place = w.current_collection || '';
    const v = out.find((x) => x.date === date && x.place === place);
    if (v) v.works.push(w); else out.push({ date, place, works: [w] });
  });
  return out.sort((x, y) => (y.date || '0').localeCompare(x.date || '0'));
}

// Even rows: every work in a row shares one height and keeps its own proportions.
function rows(list) {
  return '<div class="cx-rows">' + list.map((w) => {
    const r = ((w.image_width || 4) / (w.image_height || 3)).toFixed(3);
    return '<a class="cx-row-item' + (w.is_favorite ? ' cx-fav' : '') + '" href="' + workUrl(w) + '" style="--r:' + r + '">' + plate(w, { thumb: true }) +
      '<span class="cx-row-cap"><span class="cx-card-title">' + esc(w.title) + '</span><span class="cx-card-by">' + byline(w) + '</span></span></a>';
  }).join('') + '</div>';
}

function recent(works, data) {
  const last = {};
  works.forEach((w) => { if (w.last_contemplated_at) last[w.id] = w.last_contemplated_at; });
  (data.reflections || []).forEach((r) => { if (!last[r.artwork_id] || r.written_on > last[r.artwork_id]) last[r.artwork_id] = r.written_on; });
  const list = works.filter((w) => last[w.id]).sort((a, b) => String(last[b.id]).localeCompare(String(last[a.id]))).slice(0, 6);
  if (!list.length) return '';
  return '<section class="cx-strip-sec" aria-labelledby="cx-rec-h"><div class="cx-sec-head"><h2 id="cx-rec-h">Recently Re-Contemplated</h2>' +
    '<p class="cx-sec-note">Works I have returned to.</p></div><div class="cx-related">' +
    list.map((w) => card(w, { note: 'Returned ' + fmtDate(last[w.id], { month: 'short', day: 'numeric', year: 'numeric' }) })).join('') + '</div></section>';
}

function rooms(works, data) {
  const list = data.rooms || [];
  if (!list.length) return '';
  return '<section class="cx-rooms" id="rooms" aria-labelledby="cx-rooms-h"><div class="cx-sec-head"><h2 id="cx-rooms-h">Rooms</h2>' +
    '<p class="cx-sec-note">Six doors, six ways a work can stay with me.</p></div><ul class="cx-doors">' +
    list.map((r) => {
      const ws = works.filter((w) => (w.rooms || []).includes(r.id));
      const inner = door() + '<span class="cx-room-name">' + esc(r.name) + '</span>' +
        (r.description ? '<span class="cx-room-desc">' + esc(r.description) + '</span>' : '') +
        '<span class="cx-card-by">' + (ws.length ? ws.length + (ws.length === 1 ? ' work' : ' works') : 'Not yet open') + '</span>';
      return '<li>' + (ws.length ? '<a class="cx-door-link" href="' + roomUrl(r) + '">' + inner + '</a>' : '<div class="cx-door-link is-closed">' + inner + '</div>') + '</li>';
    }).join('') + choiceDoor(works) +
    '</ul></section>';
}

// The Curator's Choice gate: the works Ria loves, simply because.
function choiceDoor(works) {
  const n = works.filter((w) => w.is_favorite).length;
  if (!n) return '';
  return '<li><a class="cx-door-link cx-choice-door" href="' + BASE + 'room/?r=curators-choice">' + gate() +
    '<span class="cx-room-name">Curator’s Choice</span><span class="cx-room-desc">Pieces I love, simply because</span>' +
    '<span class="cx-card-by">' + n + (n === 1 ? ' work' : ' works') + '</span></a></li>';
}

function exhibitions(works, data) {
  const list = (data.exhibitions || []).filter((e) => (e.items || []).length);
  if (!list.length) return '';
  return '<section class="cx-exhibitions" aria-labelledby="cx-ex-h"><div class="cx-sec-head"><h2 id="cx-ex-h">Exhibitions</h2></div><ul>' +
    list.map((e) => '<li><a href="' + exhibitionUrl(e) + '"><span class="cx-room-name">' + esc(e.title) + '</span>' +
      '<span class="cx-room-desc">' + esc(sanitizeText(e.intro)) + '</span></a></li>').join('') + '</ul></section>';
}

function sanitizeText(html) {
  const d = document.createElement('div');
  d.innerHTML = sanitize(html);
  const t = d.textContent.trim();
  return t.length > 180 ? t.slice(0, 177) + '…' : t;
}
