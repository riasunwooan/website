// The archive timeline: when each work found me, and each time I came back to it.
import { loadPublic, esc, fmtDate, workUrl, plate } from './data.js';
import './ui.js';

const host = document.getElementById('cx-timeline');
loadPublic().then((data) => {
  const byId = Object.fromEntries(data.artworks.map((a) => [a.id, a]));
  const events = [];
  data.artworks.forEach((a) => events.push(a.discovered_on
    ? { date: a.discovered_on, text: a.discovered_text, a, kind: 'First encountered' }
    : { date: String(a.created_at).slice(0, 10), a, kind: 'Added to the collection' }));
  // An approximate return visit, written as given ("April 2026").
  data.artworks.forEach((a) => {
    const m = /^([A-Za-z]+)\s+(\d{4})$/.exec(a.revisit_text || '');
    if (m) events.push({ date: m[2] + '-' + String(new Date(m[1] + ' 1, 2000').getMonth() + 1).padStart(2, '0') + '-01', text: a.revisit_text, a, kind: 'Returned to' });
  });
  data.reflections.forEach((r) => byId[r.artwork_id] && events.push({ date: r.written_on, a: byId[r.artwork_id], kind: 'Returned to' }));
  events.sort((x, y) => String(y.date).localeCompare(String(x.date)));
  const head = '<header class="cx-page-head"><p class="cx-label">Archive</p><h1 class="cx-title cx-title-sm">Timeline</h1>' +
    '<p class="cx-lede">Not when the works were made, but when they found me, and each time I went back.</p></header>';
  if (!events.length) { host.innerHTML = head + '<p class="cx-empty">Nothing has been entered yet.</p>'; return; }
  // Works seen on the same day at the same museum share one date in the left column.
  const groups = [];
  events.forEach((e) => {
    const place = e.a.seen_at || e.a.current_collection || '';
    const g = groups.find((x) => x.date === e.date && x.place === place);
    if (g) g.items.push(e); else groups.push({ date: e.date, text: e.text, place, items: [e] });
  });
  let year = null, html = '';
  groups.forEach((g) => {
    const y = String(g.date).slice(0, 4);
    if (y !== year) { html += (year ? '</ol>' : '') + '<h2 class="cx-tl-year">' + esc(y) + '</h2><ol class="cx-tl">'; year = y; }
    html += '<li><div class="cx-tl-when"><time datetime="' + esc(g.date) + '">' + esc(g.text ? g.text.replace(/\s*\d{4}$/, '') : fmtDate(g.date, { month: 'long', day: 'numeric' })) + '</time>' +
      (g.place ? '<span class="cx-tl-place">' + esc(g.place) + '</span>' : '') + '</div><ul class="cx-tl-works">' +
      g.items.map((e) => '<li><a href="' + workUrl(e.a) + '">' + plate(e.a, { thumb: true }) + '<span><span class="cx-label">' + e.kind + '</span>' +
        '<span class="cx-tl-title">' + esc(e.a.title) + '</span><span class="cx-card-by">' + esc(e.a.artist) + '</span></span></a></li>').join('') + '</ul></li>';
  });
  host.innerHTML = head + html + '</ol>';
}).catch((e) => { console.error(e); host.innerHTML = '<p class="cx-empty">The archive could not be opened just now.</p>'; });
