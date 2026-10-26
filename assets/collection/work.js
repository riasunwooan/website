// An artwork's page: /art/collection/work/?s=<slug>. Owners can preview any entry with ?id=<id>&preview=1.
import { loadPublic, loadPreview, setMeta, esc, plate } from './data.js';
import { renderWork } from './render-work.js';
import './ui.js';

const host = document.getElementById('cx-work');
const q = new URLSearchParams(location.search);

function missing() {
  setMeta({ title: 'Not found — The Ria Collection', noindex: true });
  host.innerHTML = '<div class="cx-empty-page"><p class="cx-label">Not on view</p><h1 class="cx-work-title">This room is empty.</h1>' +
    '<p>The work you are looking for is not part of the public collection.</p><a class="cx-enter" href="/art/collection/">Return to the collection</a></div>';
}

async function main() {
  if (q.get('preview') && q.get('id')) {
    const d = await loadPreview(q.get('id'));
    const a = d && d.artworks.find((w) => w.id === q.get('id'));
    if (!a) return missing();
    setMeta({ title: 'Preview: ' + a.title + ' — The Ria Collection', noindex: true });
    host.innerHTML = '';
    const banner = document.createElement('p');
    banner.className = 'cx-preview-banner';
    banner.innerHTML = 'Preview, visible only to you · ' + esc(a.status === 'published' ? 'Published' : 'Draft') + ' · ' +
      esc({ private: 'Private', unlisted: 'Unlisted', public: 'Public' }[a.visibility]) + (a.archived ? ' · Archived' : '') +
      ' · <a href="/art/collection/admin/#edit/' + esc(a.id) + '">Back to editing</a>';
    const body = document.createElement('div');
    host.append(banner, body);
    renderWork(body, a, { works: d.artworks.filter((w) => !w.archived), rooms: d.rooms, reflections: d.reflections, privateNotes: d.privateNotes });
    return;
  }
  const data = await loadPublic();
  const a = data.artworks.find((w) => w.slug === q.get('s'));
  if (!a) return missing();
  setMeta({
    title: a.title + (a.artist ? ' — ' + a.artist : '') + ' — The Ria Collection',
    description: a.observation || a.excerpt || ('An entry in The Ria Collection on ' + a.title + (a.artist ? ' by ' + a.artist : '') + '.'),
    image: a.image_url,
    canonical: location.origin + location.pathname + '?s=' + encodeURIComponent(a.slug),
  });
  renderWork(host, a, { works: data.artworks, rooms: data.rooms, reflections: data.reflections.filter((r) => r.artwork_id === a.id) });
  if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
}

main().catch((e) => {
  console.error(e);
  host.innerHTML = '<p class="cx-empty">This entry could not be opened just now. Please try again in a moment.</p>';
});
