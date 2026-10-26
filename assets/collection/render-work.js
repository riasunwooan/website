// Renders an artwork's long-form page. Used by the public page, the private-link page and owner previews.
import { esc, sanitize, isEmptyHTML, fmtDate, plate, byline, workUrl, roomUrl, roman } from './data.js';
import { setReading, readingPreferred } from './ui.js';

const KINDS = { observation: 'Observation', detail: 'Favorite detail', sketch: 'Sketch', quotation: 'Quotation', question: 'Unanswered question', research: 'Research note', image: 'Image' };

export const orderWorks = (list) => list.slice().sort((a, b) => (a.position || 0) - (b.position || 0) || String(a.created_at).localeCompare(String(b.created_at)));

function rich(html, cls) {
  return '<div class="cx-prose' + (cls ? ' ' + cls : '') + '">' + sanitize(html) + '</div>';
}

export function card(a, { size = 'sm', note = '' } = {}) {
  return '<a class="cx-card cx-card-' + size + '" href="' + workUrl(a) + '">' + plate(a, { thumb: true }) +
    '<span class="cx-card-cap"><span class="cx-card-title">' + esc(a.title) + '</span><span class="cx-card-by">' + byline(a) + '</span>' +
    (note ? '<span class="cx-card-thread">' + esc(note) + '</span>' : '') + '</span></a>';
}

// a: the artwork. ctx: { works (all works the viewer may see), rooms, reflections (this work's), privateNotes, linkWorks }
export function renderWork(host, a, ctx = {}) {
  const works = orderWorks(ctx.works || [a]);
  const n = works.findIndex((w) => w.id === a.id);
  const linkWorks = ctx.linkWorks !== false;
  const meta = [
    ['Medium', a.medium], ['Dimensions', a.dimensions], ['Movement', a.movement],
    ['Period', a.period], ['Collection', a.current_collection],
  ].filter((m) => m[1]);
  const rooms = (ctx.rooms || []).filter((r) => (a.rooms || []).includes(r.id));

  const secs = [];
  const sec = (i, id, title, body) => { if (body) secs.push({ i, id, title, body }); };

  sec(0, 'first-encounter', 'First Encounter', !isEmptyHTML(a.first_encounter) && rich(a.first_encounter));

  let behind = '';
  if (!isEmptyHTML(a.behind_canvas)) behind += '<div class="cx-facts"><p class="cx-label">Documented</p>' + rich(a.behind_canvas) + '</div>';
  if (!isEmptyHTML(a.behind_interpretation)) behind += '<div class="cx-interp"><p class="cx-label">Interpretation</p>' + rich(a.behind_interpretation) + '</div>';
  sec(1, 'behind-the-canvas', 'Behind the Canvas', behind);

  sec(2, 'looking-closer', 'Looking Closer', !isEmptyHTML(a.looking_closer) && rich(a.looking_closer));
  sec(3, 'what-i-see', 'What I See', !isEmptyHTML(a.what_i_see) && rich(a.what_i_see, 'cx-essay'));

  const related = (a.related || []).map((id) => works.find((w) => w.id === id)).filter(Boolean);
  let conv = '';
  if (!isEmptyHTML(a.conversations)) conv += rich(a.conversations);
  if (linkWorks && related.length) conv += '<div class="cx-related">' + related.map((w) => card(w)).join('') + '</div>';
  sec(4, 'conversations', 'Conversations Across Canvases', conv);

  const notes = (a.marginalia || []).filter((m) => m && (m.body || m.src));
  sec(5, 'marginalia', 'Marginalia', notes.length && '<ul class="cx-margins">' + notes.map((m) =>
    '<li class="cx-margin cx-margin-' + esc(m.kind || 'observation') + '"><span class="cx-label">' + esc(KINDS[m.kind] || 'Note') + '</span>' +
    (m.src ? '<figure data-cx-zoom><img src="' + esc(m.src) + '" alt="' + esc(m.body || '') + '" loading="lazy"></figure>' : '') +
    (m.body ? (m.kind === 'quotation' ? '<blockquote>' + esc(m.body) + '</blockquote>' : '<p>' + esc(m.body) + '</p>') : '') + '</li>').join('') + '</ul>');

  const refl = (ctx.reflections || []).slice().sort((x, y) => String(x.written_on).localeCompare(String(y.written_on)));
  sec(6, 'returning', 'Returning to the Artwork', refl.length && '<ol class="cx-journal">' + refl.map((r) =>
    '<li><time datetime="' + esc(r.written_on) + '">' + esc(fmtDate(r.written_on)) + '</time>' +
    (r.is_private ? '<span class="cx-private-tag">Private</span>' : '') + rich(r.body) + '</li>').join('') + '</ol>');

  const sources = (a.sources || []).filter((s) => s && s.text);
  const unwritten = [a.first_encounter, a.looking_closer, a.what_i_see].every(isEmptyHTML);

  host.innerHTML =
    '<article class="cx-work">' +
      (a.is_sample ? '<p class="cx-sample">Sample entry, written to show the layout. Not a real reflection.</p>' : '') +
      '<figure class="cx-work-plate" data-cx-zoom>' + plate(a, { eager: true }) + (a.credit ? '<figcaption>' + esc(a.credit) + '</figcaption>' : '') + '</figure>' +
      '<header class="cx-work-head">' +
        '<p class="cx-label">' + (n >= 0 ? 'No. ' + String(n + 1).padStart(2, '0') : '') +
          (a.discovered_on ? ' <span aria-hidden="true">·</span> First encountered ' + esc(fmtDate(a.discovered_on)) : '') + '</p>' +
        '<h1 class="cx-work-title">' + esc(a.title) + '</h1>' +
        '<p class="cx-work-by">' + byline(a) + '</p>' +
        (meta.length ? '<dl class="cx-meta">' + meta.map((m) => '<div><dt>' + m[0] + '</dt><dd>' + esc(m[1]) + '</dd></div>').join('') + '</dl>' : '') +
        (a.observation ? '<p class="cx-observation">' + esc(a.observation) + '</p>' : '') +
        ((a.themes || []).length || rooms.length ? '<p class="cx-threads">' +
          rooms.map((r) => linkWorks ? '<a href="' + roomUrl(r) + '">' + esc(r.name) + '</a>' : '<span>' + esc(r.name) + '</span>').join('') +
          (a.themes || []).map((t) => linkWorks ? '<a href="/art/collection/?theme=' + encodeURIComponent(t) + '#collection">' + esc(t) + '</a>' : '<span>' + esc(t) + '</span>').join('') + '</p>' : '') +
        '<div class="cx-tools"><button type="button" class="cx-textbtn" data-cx-reading aria-pressed="false">Reading mode</button>' +
          (ctx.toolsExtra || '') + '</div>' +
      '</header>' +
      '<div class="cx-body">' +
        (secs.length > 1 ? '<nav class="cx-toc" aria-label="Sections"><ol>' + secs.map((s) =>
          '<li><a href="#' + s.id + '"><span>' + roman(s.i) + '</span>' + s.title + '</a></li>').join('') + '</ol></nav>' : '') +
        '<div class="cx-sections">' +
          secs.map((s) => '<section class="cx-sec cx-sec-' + s.id + '" id="' + s.id + '" aria-labelledby="h-' + s.id + '">' +
            '<h2 id="h-' + s.id + '"><span class="cx-num">' + roman(s.i) + '.</span> ' + s.title + '</h2>' + s.body + '</section>').join('') +
          (unwritten ? '<p class="cx-unwritten">The rest of this entry is still being written.</p>' : '') +
          (ctx.privateNotes && !isEmptyHTML(ctx.privateNotes) ? '<section class="cx-sec cx-private"><h2>Private notes</h2><p class="cx-label">Visible only to you</p>' + rich(ctx.privateNotes) + '</section>' : '') +
          (sources.length ? '<section class="cx-sources" aria-label="Sources and references"><h2 class="cx-label">Sources &amp; References</h2><ol>' + sources.map((s, i) =>
            '<li id="ref-' + (i + 1) + '">' + esc(s.text) + (s.url ? ' <a href="' + esc(s.url) + '" rel="noopener" target="_blank">Link</a>' : '') + '</li>').join('') + '</ol></section>' : '') +
        '</div>' +
      '</div>' +
      (linkWorks ? footer(a, works, n, related) : '') +
    '</article>';

  // Images inside the writing open enlarged on click.
  host.querySelectorAll('.cx-prose figure img, .cx-prose .cx-gallery img').forEach((im) => im.closest('figure').setAttribute('data-cx-zoom', ''));
  setReading(readingPreferred());
}

function footer(a, works, n, related) {
  const next = works.length > 1 ? works[(n + 1) % works.length] : null;
  const more = works.filter((w) => w.id !== a.id && !related.includes(w)).slice(0, 4);
  return '<footer class="cx-work-foot">' +
    (more.length ? '<div class="cx-foot-more"><p class="cx-label">Elsewhere in the collection</p><div class="cx-related">' + more.map((w) => card(w)).join('') + '</div></div>' : '') +
    (next && next.id !== a.id ? '<a class="cx-next" href="' + workUrl(next) + '"><span class="cx-label">Next entry</span><span class="cx-next-title">' + esc(next.title) + '</span><span class="cx-card-by">' + byline(next) + '</span></a>' : '') +
    '<a class="cx-back" href="/art/collection/">Return to the collection</a>' +
  '</footer>';
}
