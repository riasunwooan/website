// Small shared interactions for the collection: dim-the-lights theme, reading mode, zooming a plate.
const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
};

const root = document.documentElement;
const dark = () => root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;

export function syncThemeButtons() {
  document.querySelectorAll('[data-cx-theme]').forEach((b) => {
    b.setAttribute('aria-pressed', String(dark()));
    (b.querySelector('.cx-theme-label') || b).textContent = dark() ? 'Raise the lights' : 'Dim the lights';
  });
}
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-cx-theme]');
  if (t) {
    root.dataset.theme = dark() ? 'light' : 'dark';
    store.set('cx-theme', root.dataset.theme);
    syncThemeButtons();
  }
  const c = e.target.closest('[data-cx-choice]');
  if (c) toggleChoice();
  const r = e.target.closest('[data-cx-reading]');
  if (r) setReading(!document.body.classList.contains('cx-reading'));
  const z = e.target.closest('[data-cx-zoom] img');
  if (z) zoom(z);
});
syncThemeButtons();

// Curator's Choice: on the collection page it lights the favorites and dims the rest;
// anywhere else it opens the collection with the spotlight on.
function setChoice(on) {
  document.body.classList.toggle('cx-spotlight', on);
  document.querySelectorAll('[data-cx-choice]').forEach((b) => b.setAttribute('aria-pressed', String(on)));
}
function toggleChoice() {
  const gallery = document.getElementById('collection');
  if (!gallery) { location.href = '/art/collection/?choice=1#collection'; return; }
  const on = !document.body.classList.contains('cx-spotlight');
  setChoice(on);
  if (on) gallery.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}

// The floating pair in the corner: Curator's Choice above, the flashlight below.
if (!document.getElementById('cx-admin')) {
  const dock = document.createElement('div');
  dock.className = 'cx-dock';
  dock.innerHTML =
    '<button type="button" class="cx-fab cx-fab-choice" data-cx-choice aria-pressed="false" aria-label="Curator’s Choice"><svg class="cx-pouch-fab" viewBox="0 0 60 64" aria-hidden="true"><defs><clipPath id="cx-pouch-hem-fab"><path d="M15.5 44 L30 49 L44.5 44 L50 55 Q30 64 10 55 Z"/></clipPath></defs><g stroke="#3a2416" stroke-width="1.4" stroke-linejoin="round"><path d="M18 23 L4.5 42 Q6 58.5 30 60.5 Q54 58.5 55.5 42 L42 23 Z" fill="#a8383a"/><path d="M18.5 23 L15.5 44 L30 49 L44.5 44 L41.5 23 Z" fill="#f6d9cb"/><g clip-path="url(#cx-pouch-hem-fab)" stroke="none"><rect x="8" y="40" width="11" height="26" fill="#f0d79a"/><rect x="19" y="40" width="10" height="26" fill="#a46ab5"/><rect x="29" y="40" width="10" height="26" fill="#d9566b"/><rect x="39" y="40" width="13" height="26" fill="#4f9ac2"/></g><path d="M15.5 44 L30 49 L44.5 44 L50 55 Q30 64 10 55 Z" fill="none"/><path d="M18 6 H42 L41.5 22 H18.5 Z" fill="#f6d9cb"/><path d="M18 6 L10 8.5 L18.5 22 Z M42 6 L50 8.5 L41.5 22 Z" fill="#a8383a"/><rect x="15" y="20.5" width="30" height="3.2" fill="#a8383a"/><rect x="27.2" y="19" width="5.6" height="6" rx="1" fill="#a8383a"/><path d="M32 24 L37 30 M33 23 L39 27.5" stroke-width="2.4" stroke-linecap="round"/><circle cx="30" cy="34.5" r="7.2" fill="#e7a33a"/></g><text x="30" y="38" text-anchor="middle" font-family="\'Noto Serif KR\', \'Nanum Myeongjo\', serif" font-size="9" font-weight="600" fill="#6b2416">복</text></svg>' +
      '<span class="cx-fab-label" aria-hidden="true">Curator’s Choice</span></button>' +
    '<button type="button" class="cx-fab cx-fab-light" data-cx-theme aria-pressed="false"><span class="cx-fab-beam" aria-hidden="true"></span><svg class="cx-torch" viewBox="0 0 28 14" aria-hidden="true"><rect x="10" y="4" width="17" height="6" rx="1.5" fill="currentColor"/><path d="M10 2.5 L4 1 L4 13 L10 11.5 Z" fill="currentColor"/><rect x="2" y="1.5" width="2" height="11" rx="1" class="cx-torch-lens"/></svg>' +
      '<span class="cx-fab-label cx-theme-label">Dim the lights</span></button>';
  document.body.appendChild(dock);
  syncThemeButtons();
  if (new URLSearchParams(location.search).get('choice')) setChoice(true);
  // The first time someone opens the collection, the flashlight sweeps once so it gets noticed.
  if (!store.get('cx-fab-seen')) {
    store.set('cx-fab-seen', '1');
    dock.querySelector('.cx-fab-light').classList.add('cx-fab-intro');
  }
}

export function setReading(on) {
  document.body.classList.toggle('cx-reading', on);
  store.set('cx-reading', on ? '1' : null);
  document.querySelectorAll('[data-cx-reading]').forEach((b) => {
    b.setAttribute('aria-pressed', String(on));
    b.textContent = on ? 'Leave reading mode' : 'Reading mode';
  });
}
export const readingPreferred = () => store.get('cx-reading') === '1';

let dlg;
function zoom(img) {
  if (!dlg) {
    dlg = document.createElement('dialog');
    dlg.className = 'cx-zoom';
    dlg.innerHTML = '<button type="button" class="cx-zoom-x" aria-label="Close">Close</button><img alt="">';
    dlg.addEventListener('click', (e) => { if (e.target === dlg || e.target.closest('.cx-zoom-x')) dlg.close(); });
    document.body.appendChild(dlg);
  }
  const im = dlg.querySelector('img');
  im.src = img.dataset.full || img.currentSrc || img.src;
  im.alt = img.alt;
  dlg.showModal();
}

export { store };
