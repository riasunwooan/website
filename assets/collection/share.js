// A privately shared (unlisted) entry: /art/collection/share/?t=<token>. Never indexed.
import { loadShared, setMeta } from './data.js';
import { renderWork } from './render-work.js';
import './ui.js';

const host = document.getElementById('cx-work');
loadShared(new URLSearchParams(location.search).get('t')).then((a) => {
  if (!a) {
    setMeta({ title: 'Link unavailable — The Ria Collection', noindex: true });
    host.innerHTML = '<div class="cx-empty-page"><p class="cx-label">Not on view</p><h1 class="cx-work-title">This link is no longer open.</h1>' +
      '<p>The entry may have been made private, or the link may be mistyped.</p></div>';
    return;
  }
  setMeta({ title: a.title + ' — The Ria Collection', noindex: true });
  const note = document.createElement('p');
  note.className = 'cx-preview-banner';
  note.textContent = 'Shared with you by private link. This entry is not listed in the public collection.';
  const body = document.createElement('div');
  host.replaceChildren(note, body);
  // Unlisted entries don't link onward: other works and rooms aren't part of what was shared.
  renderWork(body, a, { works: [a], reflections: a.reflections, linkWorks: false });
}).catch((e) => {
  console.error(e);
  host.innerHTML = '<p class="cx-empty">This entry could not be opened just now.</p>';
});
