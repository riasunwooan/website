// The archive timeline: when each work found me, and each time I came back to it.
import { loadPublic, esc, fmtDate, workUrl, plate } from './data.js';
import './ui.js';

const host = document.getElementById('cx-timeline');
loadPublic().then((data) => {
  const byId = Object.fromEntries(data.artworks.map((a) => [a.id, a]));
  const events = [];
  data.artworks.forEach((a) => events.push(a.discovered_on
    ? { date: a.discovered_on, a, kind: 'First encountered' }
    : { date: String(a.created_at).slice(0, 10), a, kind: 'Added to the collection' }));
  data.reflections.forEach((r) => byId[r.artwork_id] && events.push({ date: r.written_on, a: byId[r.artwork_id], kind: 'Returned to' }));
  events.sort((x, y) => String(y.date).localeCompare(String(x.date)));
  const head = '<header class="cx-page-head"><p class="cx-label">Archive</p><h1 class="cx-title cx-title-sm">Timeline</h1>' +
    '<p class="cx-lede">Not when the works were made, but when they found me, and each time I went back.</p></header>';
  if (!events.length) { host.innerHTML = head + '<p class="cx-empty">Nothing has been entered yet.</p>'; return; }
  let year = null, html = '';
  events.forEach((e) => {
    const y = String(e.date).slice(0, 4);
    if (y !== year) { html += (year ? '</ol>' : '') + '<h2 class="cx-tl-year">' + esc(y) + '</h2><ol class="cx-tl">'; year = y; }
    html += '<li><time datetime="' + esc(e.date) + '">' + esc(fmtDate(e.date, { month: 'long', day: 'numeric' })) + '</time>' +
      '<a href="' + workUrl(e.a) + '">' + plate(e.a, { thumb: true }) + '<span><span class="cx-label">' + e.kind + '</span>' +
      '<span class="cx-tl-title">' + esc(e.a.title) + '</span><span class="cx-card-by">' + esc(e.a.artist) + '</span></span></a></li>';
  });
  host.innerHTML = head + html + '</ol>';
}).catch((e) => { console.error(e); host.innerHTML = '<p class="cx-empty">The archive could not be opened just now.</p>'; });
