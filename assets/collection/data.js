// Data layer for /art/collection/. Visitors only ever read the database's public_* views
// (or seed.json before Supabase is connected); the owner's session can read everything.
import config from './config.js';

export const configured = Boolean(config.supabaseUrl && config.supabaseAnonKey);
export const BASE = '/art/collection/';

let clientP = null;
export function client() {
  if (!configured) return Promise.resolve(null);
  if (!clientP) {
    clientP = import('./vendor/supabase.js').then(({ createClient }) =>
      createClient(config.supabaseUrl, config.supabaseAnonKey, { auth: { persistSession: true, storageKey: 'ria-collection-auth' } }));
  }
  return clientP;
}

// The signed-in owner's client, or null for visitors.
export async function ownerClient() {
  const sb = await client();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  if (!data.session) return null;
  const { data: rows } = await sb.from('site_owner').select('user_id').eq('user_id', data.session.user.id);
  return rows && rows.length ? sb : null;
}

let seedP = null;
function seed() {
  if (!seedP) seedP = fetch('/assets/collection/seed.json', { cache: 'no-cache' }).then((r) => r.json());
  return seedP;
}

function must({ data, error }) {
  if (error) throw error;
  return data;
}

// Everything a visitor may see: { artworks, rooms, reflections, exhibitions, settings }
export async function loadPublic() {
  const sb = await client();
  if (!sb) {
    const s = await seed();
    return { artworks: s.artworks, rooms: s.rooms, reflections: s.reflections, exhibitions: s.exhibitions, settings: s.settings.homepage };
  }
  const [artworks, rooms, reflections, exhibitions, settings] = await Promise.all([
    sb.from('public_artworks').select('*').then(must),
    sb.from('public_rooms').select('*').order('position').then(must),
    sb.from('public_reflections').select('*').order('written_on').then(must),
    sb.from('public_exhibitions').select('*').then(must),
    sb.from('public_settings').select('*').then(must),
  ]);
  const home = settings.find((s) => s.key === 'homepage');
  return { artworks, rooms, reflections, exhibitions, settings: home ? home.value : null };
}

// Owner preview of any entry (private, draft, archived), shaped like the public data.
export async function loadPreview(id) {
  const sb = await ownerClient();
  if (!sb) return null;
  const [all, links, rooms, reflections, priv] = await Promise.all([
    sb.from('artworks').select('*').then(must),
    sb.from('artwork_rooms').select('*').order('position').then(must),
    sb.from('rooms').select('*').order('position').then(must),
    sb.from('reflections').select('*').eq('artwork_id', id).order('written_on').then(must),
    sb.from('artwork_private').select('*').eq('artwork_id', id).then(must),
  ]);
  all.forEach((a) => { a.rooms = links.filter((l) => l.artwork_id === a.id).map((l) => l.room_id); });
  return { artworks: all, rooms, reflections, privateNotes: priv[0] ? priv[0].notes : '', sb };
}

export async function loadShared(token) {
  const sb = await client();
  if (!sb || !/^[0-9a-f-]{36}$/i.test(token || '')) return null;
  const { data, error } = await sb.rpc('get_shared_artwork', { token });
  if (error) throw error;
  return data;
}

// ---------- helpers ----------

export function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const TAGS = new Set(['P', 'BR', 'H2', 'H3', 'H4', 'STRONG', 'B', 'EM', 'I', 'U', 'S', 'BLOCKQUOTE', 'UL', 'OL', 'LI', 'A', 'HR', 'FIGURE', 'IMG', 'FIGCAPTION', 'DIV', 'SUP', 'SPAN']);
const ATTRS = { A: ['href', 'title'], IMG: ['src', 'alt', 'loading', 'width', 'height'], FIGURE: ['class', 'data-variant'], DIV: ['class'], SUP: ['class'] };
const safeUrl = (u) => /^(https?:|mailto:|\/|#)/i.test((u || '').trim());

// Rich text is written by the owner in the dashboard; still, only render an allowlist.
export function sanitize(html) {
  if (!html) return '';
  const doc = new DOMParser().parseFromString('<body>' + html, 'text/html');
  doc.body.querySelectorAll('*').forEach((el) => {
    if (!TAGS.has(el.tagName)) {
      if (/^(SCRIPT|STYLE|IFRAME|OBJECT|EMBED|TEMPLATE|SVG|MATH)$/i.test(el.tagName)) el.remove();
      else el.replaceWith(...el.childNodes);
      return;
    }
    [...el.attributes].forEach((at) => {
      const ok = (ATTRS[el.tagName] || []).includes(at.name);
      if (!ok || ((at.name === 'href' || at.name === 'src') && !safeUrl(at.value))) el.removeAttribute(at.name);
    });
    if (el.tagName === 'A' && /^https?:/i.test(el.getAttribute('href') || '')) { el.setAttribute('rel', 'noopener'); el.setAttribute('target', '_blank'); }
  });
  return doc.body.innerHTML;
}

export const isEmptyHTML = (h) => !h || !String(h).replace(/<[^>]*>/g, '').trim() && !/<img/i.test(h);

export function fmtDate(d, opts) {
  if (!d) return '';
  const dt = new Date(String(d).length === 10 ? d + 'T12:00:00' : d);
  return dt.toLocaleDateString('en-US', opts || { year: 'numeric', month: 'long', day: 'numeric' });
}

export const workUrl = (a) => BASE + 'work/?s=' + encodeURIComponent(a.slug);
export const roomUrl = (r) => BASE + 'room/?r=' + encodeURIComponent(r.slug);
export const exhibitionUrl = (e) => BASE + 'exhibition/?e=' + encodeURIComponent(e.slug);

// An artwork image at its own proportions. Missing images become a quiet titled frame.
export function plate(a, { thumb = false, eager = false, cls = '' } = {}) {
  const w = a.image_width || 4, h = a.image_height || 3;
  const src = (thumb && a.image_thumb) || a.image_url;
  const frame = '<span class="cx-frame-empty" style="aspect-ratio:' + w + '/' + h + '"><span>' + esc(a.title) + '</span></span>';
  if (!src) return '<span class="cx-plate ' + cls + '">' + frame + '</span>';
  const full = thumb && a.image_thumb && a.image_url ? ' data-full="' + esc(a.image_url) + '"' : '';
  return '<span class="cx-plate ' + cls + '"><img src="' + esc(src) + '"' + full + ' data-title="' + esc(a.title) + '" width="' + w + '" height="' + h + '" alt="' + esc(a.image_alt || a.title) +
    '" loading="' + (eager ? 'eager' : 'lazy') + '" decoding="async"></span>';
}

// <img> error handling for plates: try the full image if the thumbnail is missing, then the frame.
document.addEventListener('error', (e) => {
  const img = e.target;
  if (!(img instanceof HTMLImageElement) || !img.closest('.cx-plate')) return;
  if (img.dataset.full && img.src.indexOf(img.dataset.full) < 0) { img.src = img.dataset.full; return; }
  const p = img.closest('.cx-plate');
  const w = img.getAttribute('width') || 4, h = img.getAttribute('height') || 3;
  p.innerHTML = '<span class="cx-frame-empty" style="aspect-ratio:' + w + '/' + h + '"><span>' + esc(img.dataset.title || img.alt) + '</span><small>Image to come</small></span>';
}, true);

export const byline = (a) => [a.artist, a.year_text].filter(Boolean).map(esc).join(', ');

export function setMeta({ title, description, image, canonical, noindex }) {
  document.title = title;
  const put = (sel, attr, key, val) => {
    let m = document.head.querySelector(sel);
    if (!val) { if (m) m.remove(); return; }
    if (!m) { m = document.createElement(sel.startsWith('link') ? 'link' : 'meta'); m.setAttribute(attr, key); document.head.appendChild(m); }
    m.setAttribute(sel.startsWith('link') ? 'href' : 'content', val);
  };
  put('meta[name="description"]', 'name', 'description', description);
  put('meta[property="og:title"]', 'property', 'og:title', title);
  put('meta[property="og:description"]', 'property', 'og:description', description);
  put('meta[property="og:image"]', 'property', 'og:image', image && new URL(image, location.origin).href);
  put('link[rel="canonical"]', 'rel', 'canonical', canonical);
  put('meta[name="robots"]', 'name', 'robots', noindex ? 'noindex, nofollow' : '');
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
export const roman = (i) => ROMAN[i] || String(i + 1);
