// The museum entrance: featured work, the searchable collection, and the quieter sections below it.
import { loadPublic, esc, plate, byline, workUrl, roomUrl, exhibitionUrl, fmtDate, sanitize } from './data.js';
import { card, orderWorks } from './render-work.js';
import './ui.js';

const host = document.getElementById('cx-home');
const DEFAULT_SECTIONS = ['featured', 'collection', 'recent', 'connections', 'rooms', 'exhibitions'];
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
  const builders = { featured, collection, recent, connections, rooms, exhibitions };
  host.innerHTML = order.map((s) => (builders[s] ? builders[s](works, data) : '')).join('');
  wireCollection(works);
}

function featured(works) {
  const a = works.find((w) => w.featured) || works[0];
  return '<section class="cx-featured" aria-labelledby="cx-feat-h">' +
    '<a class="cx-featured-plate" href="' + workUrl(a) + '" tabindex="-1" aria-hidden="true">' + plate(a, { eager: true }) + '</a>' +
    '<div class="cx-featured-text">' +
      '<p class="cx-label">On view</p>' +
      '<h2 class="cx-featured-title" id="cx-feat-h"><a href="' + workUrl(a) + '">' + esc(a.title) + '</a></h2>' +
      '<p class="cx-work-by">' + byline(a) + '</p>' +
      (a.excerpt ? '<p class="cx-featured-excerpt">' + esc(a.excerpt) + '</p>' : '') +
      '<a class="cx-enter" href="' + workUrl(a) + '">Enter the Story</a>' +
    '</div></section>';
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
    '</form>' +
    '<div class="cx-masonry"></div>' +
  '</section>';
}

function wireCollection(works) {
  const form = host.querySelector('.cx-controls');
  if (!form) return;
  const grid = host.querySelector('.cx-masonry'), count = host.querySelector('.cx-count');
  const f = (k) => form.querySelector('[data-f="' + k + '"]');
  const params = new URLSearchParams(location.search);
  if (params.get('q')) f('q').value = params.get('q');
  if (params.get('theme')) f('themes').value = params.get('theme');
  if (params.get('sort')) f('sort').value = params.get('sort');

  function apply() {
    const q = f('q').value.trim().toLowerCase();
    const theme = f('themes').value, mv = f('movement').value, pd = f('period').value, sort = f('sort').value;
    let list = works.filter((w) =>
      (!q || (w.title + ' ' + w.artist).toLowerCase().includes(q)) &&
      (!theme || (w.themes || []).includes(theme)) && (!mv || w.movement === mv) && (!pd || w.period === pd));
    if (sort === 'added') list = list.slice().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    if (sort === 'artist') list = list.slice().sort((a, b) => surname(a.artist).localeCompare(surname(b.artist)) || a.title.localeCompare(b.title));
    if (sort === 'year') list = list.slice().sort((a, b) => (a.year_sort ?? 1e9) - (b.year_sort ?? 1e9));
    grid.innerHTML = list.length ? list.map((w) => card(w, { size: 'm' })).join('') :
      '<p class="cx-empty">Nothing in the collection matches that yet.</p>';
    count.textContent = list.length + (list.length === 1 ? ' work' : ' works');
    const p = new URLSearchParams();
    if (q) p.set('q', f('q').value.trim());
    if (theme) p.set('theme', theme);
    if (sort !== 'curated') p.set('sort', sort);
    history.replaceState(null, '', location.pathname + (p.toString() ? '?' + p : '') + location.hash);
  }
  form.addEventListener('input', apply);
  apply();
  if (location.hash === '#collection') host.querySelector('#collection').scrollIntoView();
}

function recent(works, data) {
  const last = {};
  works.forEach((w) => { if (w.last_contemplated_at) last[w.id] = w.last_contemplated_at; });
  (data.reflections || []).forEach((r) => { if (!last[r.artwork_id] || r.written_on > last[r.artwork_id]) last[r.artwork_id] = r.written_on; });
  const list = works.filter((w) => last[w.id]).sort((a, b) => String(last[b.id]).localeCompare(String(last[a.id]))).slice(0, 6);
  if (!list.length) return '';
  return '<section class="cx-strip-sec" aria-labelledby="cx-rec-h"><div class="cx-sec-head"><h2 id="cx-rec-h">Recently Contemplated</h2>' +
    '<p class="cx-sec-note">Works I have returned to.</p></div><div class="cx-related">' +
    list.map((w) => card(w, { note: 'Returned ' + fmtDate(last[w.id], { month: 'short', day: 'numeric', year: 'numeric' }) })).join('') + '</div></section>';
}

function connections(works) {
  const by = {};
  works.forEach((w) => (w.themes || []).forEach((t) => (by[t] = by[t] || []).push(w)));
  const threads = Object.keys(by).filter((t) => by[t].length > 1).sort((a, b) => by[b].length - by[a].length).slice(0, 6);
  if (!threads.length) return '';
  return '<section class="cx-connections" aria-labelledby="cx-con-h"><div class="cx-sec-head"><h2 id="cx-con-h">Connections</h2>' +
    '<p class="cx-sec-note">Threads that run between the works.</p></div><ul>' +
    threads.map((t) => '<li><a class="cx-thread-name" href="?theme=' + encodeURIComponent(t) + '#collection">' + esc(t) + '</a><span class="cx-thread-works">' +
      by[t].slice(0, 6).map((w) => '<a href="' + workUrl(w) + '" title="' + esc(w.title) + '">' + plate(w, { thumb: true }) + '</a>').join('') + '</span></li>').join('') +
    '</ul></section>';
}

function rooms(works, data) {
  const list = (data.rooms || []).map((r) => ({ r, ws: works.filter((w) => (w.rooms || []).includes(r.id)) })).filter((x) => x.ws.length);
  if (!list.length) return '';
  return '<section class="cx-rooms" id="rooms" aria-labelledby="cx-rooms-h"><div class="cx-sec-head"><h2 id="cx-rooms-h">Rooms</h2></div><ul>' +
    list.map(({ r, ws }) => '<li><a href="' + roomUrl(r) + '">' + plate(ws[0], { thumb: true }) +
      '<span class="cx-room-name">' + esc(r.name) + '</span><span class="cx-card-by">' + ws.length + (ws.length === 1 ? ' work' : ' works') + '</span>' +
      (r.description ? '<span class="cx-room-desc">' + esc(r.description) + '</span>' : '') + '</a></li>').join('') +
    '</ul></section>';
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
