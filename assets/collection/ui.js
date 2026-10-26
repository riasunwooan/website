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
    b.textContent = dark() ? 'Raise the lights' : 'Dim the lights';
  });
}
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-cx-theme]');
  if (t) {
    root.dataset.theme = dark() ? 'light' : 'dark';
    store.set('cx-theme', root.dataset.theme);
    syncThemeButtons();
  }
  const r = e.target.closest('[data-cx-reading]');
  if (r) setReading(!document.body.classList.contains('cx-reading'));
  const z = e.target.closest('[data-cx-zoom] img');
  if (z) zoom(z);
});
syncThemeButtons();

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
