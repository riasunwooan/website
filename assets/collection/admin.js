// The private dashboard: /art/collection/admin/. Everything here runs as the signed-in owner;
// the database's row-level security refuses these reads and writes for anyone else.
import { client, configured, esc, plate, sanitize, fmtDate, workUrl } from './data.js';
import { store, syncThemeButtons } from './ui.js';

const host = document.getElementById('cx-admin');
const VIS = {
  private: ['Private', 'Only you, after signing in.'],
  unlisted: ['Unlisted', 'Anyone with the private link can read it. Hidden from the collection, search and search engines.'],
  public: ['Public', 'Shown in the public collection, its search and related works.'],
};
const SECTIONS = [
  ['first_encounter', 'I', 'First Encounter', 'How I found it, what caught me first, why it stayed.'],
  ['behind_canvas', 'II', 'Behind the Canvas: documented', 'History, the artist, context. Facts only; cite with Ref and add the source below.'],
  ['behind_interpretation', 'II', 'Behind the Canvas: interpretation', 'Readings and claims that are interpretation rather than record (scholars’ or mine).'],
  ['looking_closer', 'III', 'Looking Closer', 'Composition, color, light, texture, technique. Use Detail for enlarged crops.'],
  ['what_i_see', 'IV', 'What I See', 'The essay. Take all the room you need.'],
];
const MARGIN_KINDS = { thought: 'Thought (my own words)', observation: 'Observation', detail: 'Favorite detail', sketch: 'Sketch', quotation: 'Quotation (someone else’s words)', question: 'Unanswered question', research: 'Research note', image: 'Image' };
const HOME_SECTIONS = { collection: 'The Collection', rooms: 'Rooms', exhibitions: 'Exhibitions', quotes: 'Quote Collection', recent: 'Recently Re-Contemplated' };
const FIELDS = ['title', 'slug', 'artist', 'year_text', 'year_sort', 'medium', 'dimensions', 'movement', 'period', 'current_collection', 'credit',
  'image_url', 'image_thumb', 'image_width', 'image_height', 'image_alt', 'observation', 'excerpt', 'discovered_on', 'discovered_text', 'revisit_text', 'seen_at', 'status', 'visibility', 'is_favorite'];

let sb, Editor, S = {};
const slugify = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'untitled';
const must = ({ data, error }) => { if (error) throw error; return data; };
const listOf = (s) => (s || '').split(',').map((x) => x.trim()).filter(Boolean);
const shareUrl = (a) => location.origin + '/art/collection/share/?t=' + a.share_token;
const orderBy = (a, b) => (a.position || 0) - (b.position || 0) || String(a.created_at).localeCompare(String(b.created_at));

// ---------- boot & auth ----------

async function boot() {
  if (!configured) return setupNeeded();
  sb = await client();
  sb.auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_OUT') login(); });
  const { data } = await sb.auth.getSession();
  if (!data.session) return login();
  const owner = await sb.from('site_owner').select('user_id').eq('user_id', data.session.user.id);
  if (owner.error || !owner.data.length) {
    await sb.auth.signOut();
    return login('This account is not the collection’s owner. See step 4 of supabase/README.md.');
  }
  S.user = data.session.user;
  window.addEventListener('hashchange', route);
  await refresh();
  route();
}

function setupNeeded() {
  host.innerHTML = '<div class="ad-login"><p class="cx-label">Dashboard</p><h1 class="ad-h2">Connect the database first</h1>' +
    '<p class="ad-note">The dashboard saves to your own Supabase project, which isn’t connected yet. Follow <code>supabase/README.md</code> in the website repository: ' +
    'create the project, run <code>supabase/schema.sql</code>, then paste the project URL and anon key into <code>assets/collection/config.js</code>.</p>' +
    '<p class="ad-note">Until then the public collection shows the entries in <code>assets/collection/seed.json</code>.</p></div>';
}

function login(msg) {
  host.innerHTML = '<div class="ad-login"><p class="cx-label">The Ria Collection</p><h1 class="ad-h2">Sign in</h1>' +
    '<form id="ad-login"><label class="cx-field"><span>Email</span><input type="email" name="email" required autocomplete="username"></label>' +
    '<label class="cx-field"><span>Password</span><input type="password" name="password" autocomplete="current-password"></label>' +
    '<div class="ad-row"><button class="ad-btn" type="submit">Sign in</button><button class="ad-btn ghost" type="button" data-link>Email me a sign-in link</button></div>' +
    '<p class="ad-msg" role="alert">' + esc(msg || '') + '</p></form></div>';
  const f = host.querySelector('#ad-login'), out = f.querySelector('.ad-msg');
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    out.textContent = 'Signing in…';
    const { error } = await sb.auth.signInWithPassword({ email: f.email.value, password: f.password.value });
    if (error) { out.textContent = error.message; return; }
    boot();
  });
  f.querySelector('[data-link]').addEventListener('click', async () => {
    if (!f.email.reportValidity()) return;
    const { error } = await sb.auth.signInWithOtp({ email: f.email.value, options: { shouldCreateUser: false, emailRedirectTo: location.href.split('#')[0] } });
    out.textContent = error ? error.message : 'Check your email for a sign-in link.';
  });
}

async function refresh() {
  const [works, rooms, links, exhibitions, settings, favorites] = await Promise.all([
    sb.from('artworks').select('*').then(must),
    sb.from('rooms').select('*').order('position').then(must),
    sb.from('artwork_rooms').select('*').order('position').then(must),
    sb.from('exhibitions').select('*').order('created_at').then(must),
    sb.from('settings').select('*').then(must),
    sb.from('favorites').select('*').then(must),
  ]);
  Object.assign(S, { works: works.sort(orderBy), rooms, links, exhibitions, favorites: new Set(favorites.map((f) => f.artwork_id)) });
  S.home = (settings.find((s) => s.key === 'homepage') || {}).value || {};
}

function shell(tab, inner) {
  const tabs = [['works', 'Artworks'], ['new', 'New entry'], ['rooms', 'Rooms'], ['exhibitions', 'Exhibitions'], ['homepage', 'Homepage'], ['backup', 'Backup']];
  host.innerHTML = '<div class="ad-top"><h1>The Ria Collection</h1><a class="ad-link" href="/art/collection/" target="_blank" rel="noopener">View the public collection</a>' +
    '<button class="cx-textbtn" data-cx-theme type="button">Dim the lights</button><button class="ad-link" type="button" data-signout>Sign out</button></div>' +
    '<ul class="ad-tabs">' + tabs.map(([k, l]) => '<li><a href="#' + k + '"' + (k === tab ? ' aria-current="page"' : '') + '>' + l + '</a></li>').join('') + '</ul>' +
    '<div class="ad-main">' + inner + '</div>';
  host.querySelector('[data-signout]').addEventListener('click', () => sb.auth.signOut());
  syncThemeButtons();
  return host.querySelector('.ad-main');
}

function route() {
  if (S.leave && !S.leave()) { history.replaceState(null, '', S.hash); return; }
  S.leave = null; S.hash = location.hash || '#works';
  window.onbeforeunload = null;
  const [view, id] = location.hash.slice(1).split('/');
  if (S.editors) { S.editors.forEach((e) => e.destroy()); S.editors = null; }
  if (view === 'new') return editWork(null);
  if (view === 'edit') return editWork(S.works.find((w) => w.id === id) || null);
  if (view === 'rooms') return roomsView();
  if (view === 'exhibitions') return exhibitionsView(id);
  if (view === 'homepage') return homeView();
  if (view === 'backup') return backupView();
  return worksView();
}

function fail(e, out) {
  console.error(e);
  const m = /duplicate key.*slug/i.test(e.message || '') ? 'That address (slug) is already used by another entry.' : (e.message || String(e));
  if (out) out.textContent = m; else alert(m);
}

// ---------- artworks list ----------

function worksView() {
  const f = S.filter || 'active';
  const main = shell('works', '<div class="ad-filters"><label class="cx-field cx-search"><span>Search</span><input type="search" id="ad-q" placeholder="Title or artist" value="' + esc(S.q || '') + '"></label>' +
    '<label class="cx-field"><span>Show</span><select id="ad-f">' + [['active', 'All but archived'], ['draft', 'Drafts'], ['published', 'Published'], ['public', 'Public'], ['unlisted', 'Unlisted'], ['private', 'Private'], ['bookmarked', 'Bookmarked'], ['archived', 'Archived']]
      .map(([k, l]) => '<option value="' + k + '"' + (k === f ? ' selected' : '') + '>' + l + '</option>').join('') + '</select></label>' +
    '<a class="ad-btn" href="#new">New entry</a></div><ul class="ad-list" id="ad-list"></ul>');
  const q = main.querySelector('#ad-q'), sel = main.querySelector('#ad-f'), ul = main.querySelector('#ad-list');
  function draw() {
    S.q = q.value; S.filter = sel.value;
    const t = q.value.trim().toLowerCase();
    const list = S.works.filter((w) => {
      if (t && !(w.title + ' ' + w.artist).toLowerCase().includes(t)) return false;
      switch (sel.value) {
        case 'archived': return w.archived;
        case 'bookmarked': return S.favorites.has(w.id);
        case 'draft': case 'published': return !w.archived && w.status === sel.value;
        case 'public': case 'unlisted': case 'private': return !w.archived && w.visibility === sel.value;
        default: return !w.archived;
      }
    });
    const reorder = sel.value === 'active' && !t;
    ul.innerHTML = list.length ? list.map((w, i) => '<li class="ad-item" data-id="' + w.id + '">' + plate(w, { thumb: true }) +
      '<div><a class="ad-item-title" href="#edit/' + w.id + '">' + esc(w.title) + '</a><div class="ad-item-sub">' + esc([w.artist, w.year_text].filter(Boolean).join(', ')) + '</div>' +
      '<div class="ad-badges"><span class="ad-badge">' + (w.status === 'published' ? 'Published' : 'Draft') + '</span><span class="ad-badge ' + w.visibility + '">' + VIS[w.visibility][0] + '</span>' +
      (w.archived ? '<span class="ad-badge">Archived</span>' : '') +
      (S.favorites.has(w.id) ? '<span class="ad-badge unlisted">Bookmarked</span>' : '') + (w.is_sample ? '<span class="ad-badge">Sample</span>' : '') + '</div></div>' +
      '<div class="ad-actions">' + (reorder ? '<span class="ad-order"><button type="button" data-a="up" aria-label="Move up"' + (i ? '' : ' disabled') + '>↑</button><button type="button" data-a="down" aria-label="Move down"' + (i < list.length - 1 ? '' : ' disabled') + '>↓</button></span>' : '') +
      '<button type="button" data-a="edit">Edit</button><button type="button" data-a="preview">Preview</button><button type="button" data-a="fav">' + (S.favorites.has(w.id) ? 'Unbookmark' : 'Bookmark') + '</button>' +
      '<button type="button" data-a="dup">Duplicate</button>' +
      '<button type="button" data-a="archive">' + (w.archived ? 'Unarchive' : 'Archive') + '</button><button type="button" data-a="delete">Delete</button></div></li>').join('')
      : '<li class="cx-empty">' + (S.works.length ? 'Nothing matches.' : 'No entries yet. Start with “New entry”, or bring in your first work from Backup.') + '</li>';
    S.visible = list;
  }
  q.addEventListener('input', draw); sel.addEventListener('change', draw);
  ul.addEventListener('click', async (e) => {
    const b = e.target.closest('button[data-a]'); if (!b) return;
    const w = S.works.find((x) => x.id === b.closest('[data-id]').dataset.id);
    try {
      switch (b.dataset.a) {
        case 'edit': location.hash = 'edit/' + w.id; return;
        case 'preview': window.open(previewUrl(w), '_blank'); return;
        case 'fav':
          if (S.favorites.has(w.id)) must(await sb.from('favorites').delete().eq('artwork_id', w.id));
          else must(await sb.from('favorites').insert({ artwork_id: w.id }));
          break;
        case 'dup': await duplicate(w); break;
        case 'archive': must(await sb.from('artworks').update({ archived: !w.archived }).eq('id', w.id)); break;
        case 'delete':
          if (!confirm('Delete “' + w.title + '” permanently, with its reflections and private notes? This cannot be undone.\n\nTip: Archive hides an entry without deleting it, and Backup → Export keeps a copy.')) return;
          must(await sb.from('artworks').delete().eq('id', w.id));
          break;
        case 'up': case 'down': await move(S.visible, w, b.dataset.a === 'up' ? -1 : 1, 'artworks'); break;
      }
      await refresh(); draw();
    } catch (err) { fail(err); }
  });
  draw();
}

const previewUrl = (w) => '/art/collection/work/?id=' + w.id + '&preview=1';

// Swap an item with its neighbour in `list` and renumber positions 0..n.
async function move(list, item, dir, table) {
  const arr = list.slice(), i = arr.indexOf(item), j = i + dir;
  if (j < 0 || j >= arr.length) return;
  [arr[i], arr[j]] = [arr[j], arr[i]];
  await Promise.all(arr.map((x, k) => (x.position === k ? null : sb.from(table).update({ position: k }).eq('id', x.id).then(must))));
}

async function uniqueSlug(base, exceptId) {
  let s = base, n = 2;
  while (S.works.some((w) => w.slug === s && w.id !== exceptId)) s = base + '-' + n++;
  return s;
}

async function duplicate(w) {
  const copy = { ...w };
  ['id', 'share_token', 'created_at', 'updated_at', 'last_contemplated_at'].forEach((k) => delete copy[k]);
  Object.assign(copy, { title: w.title + ' (copy)', slug: await uniqueSlug(w.slug + '-copy'), status: 'draft', visibility: 'private', featured: false, archived: false, position: S.works.length });
  const row = must(await sb.from('artworks').insert(copy).select().single());
  const priv = must(await sb.from('artwork_private').select('*').eq('artwork_id', w.id));
  if (priv[0]) must(await sb.from('artwork_private').insert({ artwork_id: row.id, notes: priv[0].notes }));
  const rl = S.links.filter((l) => l.artwork_id === w.id).map((l) => ({ artwork_id: row.id, room_id: l.room_id, position: l.position }));
  if (rl.length) must(await sb.from('artwork_rooms').insert(rl));
}

// ---------- image upload ----------

const canWebp = (() => { try { return document.createElement('canvas').toDataURL('image/webp').startsWith('data:image/webp'); } catch (e) { return false; } })();

function resized(img, max) {
  const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas');
  c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
  const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, c.width, c.height);
  return new Promise((res) => c.toBlob(res, canWebp ? 'image/webp' : 'image/jpeg', 0.9));
}

// Uploads an optimized copy (long edge ≤ 2400px, proportions kept) and a gallery thumbnail.
async function uploadImage(file) {
  const img = new Image();
  img.src = URL.createObjectURL(file);
  await img.decode();
  const ext = canWebp ? 'webp' : 'jpg', name = crypto.randomUUID();
  const [full, sm] = await Promise.all([resized(img, 2400), resized(img, 900)]);
  URL.revokeObjectURL(img.src);
  const put = async (path, blob) => {
    must(await sb.storage.from('artworks').upload(path, blob, { contentType: blob.type, cacheControl: '31536000' }));
    return sb.storage.from('artworks').getPublicUrl(path).data.publicUrl;
  };
  const [url, thumb] = await Promise.all([put(name + '.' + ext, full), put(name + '-sm.' + ext, sm)]);
  const k = Math.min(1, 2400 / Math.max(img.naturalWidth, img.naturalHeight));
  return { url, thumb, width: Math.round(img.naturalWidth * k), height: Math.round(img.naturalHeight * k) };
}

function measure(url) {
  return new Promise((res) => { const i = new Image(); i.onload = () => res({ width: i.naturalWidth, height: i.naturalHeight }); i.onerror = () => res(null); i.src = url; });
}

// For the editor's Image / Detail / Gallery buttons.
function pickImage() {
  return new Promise((resolve) => {
    const d = document.createElement('dialog');
    d.className = 'ad-dialog';
    d.innerHTML = '<form method="dialog"><h3>Add an image</h3><label class="cx-field"><span>Upload</span><input type="file" accept="image/*" name="file"></label>' +
      '<label class="cx-field"><span>or image URL</span><input type="url" name="url" placeholder="https://"></label>' +
      '<label class="cx-field"><span>Describe it (alt text)</span><input name="alt"></label><p class="ad-msg"></p>' +
      '<div class="ad-row"><button class="ad-btn" value="ok">Insert</button><button class="ad-btn ghost" value="cancel" formnovalidate>Cancel</button></div></form>';
    document.body.appendChild(d);
    const f = d.querySelector('form');
    f.addEventListener('submit', async (e) => {
      if (e.submitter && e.submitter.value === 'cancel') return;
      e.preventDefault();
      const file = f.file.files[0];
      try {
        let src = f.url.value.trim();
        if (file) { f.querySelector('.ad-msg').textContent = 'Uploading…'; src = (await uploadImage(file)).url; }
        if (!src) { f.querySelector('.ad-msg').textContent = 'Choose a file or paste a URL.'; return; }
        d.returnValue = 'done'; d.close(); resolve({ src, alt: f.alt.value });
      } catch (err) { fail(err, f.querySelector('.ad-msg')); }
    });
    d.addEventListener('close', () => { if (d.returnValue !== 'done') resolve(null); d.remove(); });
    d.showModal();
  });
}

// ---------- edit an artwork ----------

// restore: { row, rooms, notes } from this device's autosave, to reopen the form with.
async function editWork(w, restore) {
  if (!Editor) Editor = await import('./vendor/editor.js');
  const isNew = !w;
  const a = { ...(w || { status: 'draft', visibility: 'private', marginalia: [], sources: [], themes: [], tags: [], related: [], featured: false }) };
  const key = 'cx-autosave:' + (a.id || 'new');
  if (restore) Object.assign(a, restore.row);
  const priv = restore ? restore.notes : isNew ? '' : ((must(await sb.from('artwork_private').select('notes').eq('artwork_id', a.id))[0] || {}).notes || '');
  const refl = isNew ? [] : must(await sb.from('reflections').select('*').eq('artwork_id', a.id).order('written_on'));
  const myRooms = new Set(restore ? restore.rooms : S.links.filter((l) => l.artwork_id === a.id).map((l) => l.room_id));
  const live = w || {};
  const field = (name, label, opts = {}) => '<label class="cx-field' + (opts.wide ? ' ad-wide' : '') + '"><span>' + label + '</span>' +
    (opts.area ? '<textarea name="' + name + '" rows="' + (opts.rows || 2) + '">' + esc(a[name] ?? '') + '</textarea>'
      : '<input name="' + name + '" type="' + (opts.type || 'text') + '" value="' + esc(a[name] ?? '') + '"' + (opts.attrs || '') + '>') + '</label>';

  const main = shell(isNew ? 'new' : 'works',
    '<p class="cx-label">' + (isNew ? 'New entry' : 'Editing') + '</p><h2 class="ad-h2">' + esc(a.title || 'Untitled') + '</h2>' +
    '<div id="ad-restore"></div>' +
    '<form class="ad-form" id="ad-work" novalidate>' +
      '<fieldset class="ad-fieldset"><legend>The work</legend>' +
        field('title', 'Title', { wide: true, attrs: ' required' }) + field('artist', 'Artist') + field('year_text', 'Date, as written (e.g. c. 1665)') +
        field('year_sort', 'Year, for sorting', { type: 'number' }) + field('medium', 'Medium') + field('dimensions', 'Dimensions') + field('movement', 'Movement') +
        field('period', 'Historical period') + field('current_collection', 'Museum or collection') + field('seen_at', 'Where I saw it, if not that collection (fair, exhibition…)') +
        field('discovered_on', 'First encountered', { type: 'date' }) + field('discovered_text', 'If the date is approximate, how to write it (e.g. March 2026)') +
        field('revisit_text', 'An approximate return visit, if any (e.g. April 2026)') +
        field('slug', 'Web address', { attrs: ' pattern="[a-z0-9]+(-[a-z0-9]+)*"' }) +
      '</fieldset>' +
      '<fieldset class="ad-fieldset"><legend>Image</legend>' +
        '<div class="ad-wide ad-row"><div class="ad-imgprev">' + plate(a) + '</div></div>' +
        '<label class="cx-field"><span>Upload image</span><input type="file" accept="image/*" id="ad-file"></label>' +
        field('image_url', 'or image URL', { type: 'url' }) + field('image_alt', 'Describe the image (alt text)', { wide: true }) +
        field('credit', 'Image credit / rights', { wide: true }) +
        '<input type="hidden" name="image_thumb" value="' + esc(a.image_thumb || '') + '"><input type="hidden" name="image_width" value="' + esc(a.image_width || '') + '"><input type="hidden" name="image_height" value="' + esc(a.image_height || '') + '">' +
        '<p class="ad-note ad-wide">Uploads are resized to at most 2400px on the long edge, never cropped.</p>' +
      '</fieldset>' +
      '<fieldset class="ad-fieldset"><legend>In brief</legend>' +
        field('observation', 'A short personal observation (under the title)', { wide: true, area: true }) +
        field('excerpt', 'Short description for search engines and link previews', { wide: true, area: true }) +
      '</fieldset>' +
      '<fieldset class="ad-fieldset"><legend>The essay</legend>' +
        SECTIONS.map(([k, n, t, hint]) => '<div class="ad-sec ad-wide"><div class="ad-sec-title"><span>' + n + '.</span> ' + t + '</div><p class="ad-note">' + hint + '</p><div data-ed="' + k + '"' + (k === 'what_i_see' ? ' class="ed-tall"' : '') + '></div></div>').join('') +
      '</fieldset>' +
      '<fieldset class="ad-fieldset"><legend>Sources &amp; references</legend><p class="ad-note ad-wide">Numbered in order. Cite one in the text with the Ref button and its number.</p><div class="ad-rep ad-wide" id="ad-sources"></div>' +
        '<div class="ad-wide"><button class="ad-btn ghost" type="button" id="ad-add-src">Add source</button></div></fieldset>' +
      '<fieldset class="ad-fieldset"><legend>V. Marginalia</legend><div class="ad-rep ad-wide" id="ad-margins"></div>' +
        '<div class="ad-wide"><button class="ad-btn ghost" type="button" id="ad-add-margin">Add a fragment</button></div></fieldset>' +
      '<fieldset class="ad-fieldset"><legend>Threads</legend>' +
        '<label class="cx-field ad-wide"><span>Themes (comma separated)</span><input name="themes" list="ad-themes" value="' + esc((a.themes || []).join(', ')) + '"></label>' +
        '<label class="cx-field ad-wide"><span>Tags (comma separated)</span><input name="tags" value="' + esc((a.tags || []).join(', ')) + '"></label>' +
        '<datalist id="ad-themes">' + [...new Set(S.works.flatMap((x) => x.themes || []))].map((t) => '<option value="' + esc(t) + '">').join('') + '</datalist>' +
        '<div class="ad-wide"><p class="cx-label">Rooms</p><div class="ad-checks">' + (S.rooms.length ? S.rooms.map((r) => '<label class="ad-check"><input type="checkbox" name="room" value="' + r.id + '"' + (myRooms.has(r.id) ? ' checked' : '') + '>' + esc(r.name) + '</label>').join('') : '<span class="ad-note">No rooms yet. Create them under Rooms.</span>') + '</div></div>' +
      '</fieldset>' +
      '<fieldset class="ad-fieldset"><legend>Private notes</legend><p class="ad-note ad-wide">Kept in a separate, owner-only table. Never shown publicly, whatever the entry’s visibility.</p><div class="ad-wide" data-ed="private_notes"></div></fieldset>' +
      '<fieldset class="ad-fieldset"><legend>Publishing</legend>' +
        '<div class="ad-wide"><p class="cx-label">State</p><div class="ad-checks">' +
          '<label class="ad-check"><input type="radio" name="status" value="draft"' + (a.status !== 'published' ? ' checked' : '') + '>Draft</label>' +
          '<label class="ad-check"><input type="radio" name="status" value="published"' + (a.status === 'published' ? ' checked' : '') + '>Published</label></div>' +
          '<p class="ad-note">Drafts are never visible to anyone but you, whatever their visibility.</p></div>' +
        '<div class="ad-wide"><p class="cx-label">Visibility</p>' + Object.entries(VIS).map(([k, [l, d]]) => '<label class="ad-check"><input type="radio" name="visibility" value="' + k + '"' + (a.visibility === k ? ' checked' : '') + '><strong>' + l + '</strong>&nbsp;· ' + d + '</label>').join('') + '</div>' +
        '<div class="ad-wide" id="ad-sharebox"></div>' +
        '<label class="ad-check ad-wide"><input type="checkbox" name="is_favorite"' + (a.is_favorite ? ' checked' : '') + '>Curator’s Choice: one of my favorites (lit up by the Curator’s Choice button and listed behind its door)</label>' +
      '</fieldset>' +
      (isNew ? '' : '<fieldset class="ad-fieldset"><legend>VI. Returning to the Artwork</legend><p class="ad-note ad-wide">Each return is dated and kept; earlier ones are never overwritten. New reflections start private.</p><div class="ad-wide" id="ad-refl"></div></fieldset>') +
      '<div class="ad-sticky"><button class="ad-btn" type="submit">Save</button>' + (isNew ? '' : '<a class="ad-btn ghost" href="' + previewUrl(a) + '" target="_blank" rel="noopener">Preview</a>') +
        (!isNew && a.status === 'published' && a.visibility === 'public' ? '<a class="ad-link" href="' + workUrl(a) + '" target="_blank" rel="noopener">Public page</a>' : '') +
        '<span class="ad-status" role="status"></span></div>' +
    '</form>');

  const f = main.querySelector('#ad-work'), status = main.querySelector('.ad-status');
  let slugTouched = !isNew;
  const html = { private_notes: priv };
  SECTIONS.forEach(([k]) => { html[k] = a[k] || ''; });
  S.editors = [];
  main.querySelectorAll('[data-ed]').forEach((el) => {
    const k = el.dataset.ed;
    const ed = Editor.createEditor(el, { content: html[k], placeholder: k === 'private_notes' ? 'Only you will see this.' : 'Begin writing…', pickImage, onUpdate: (h) => { html[k] = h; changed(); } });
    ed.key = k; S.editors.push(ed);
  });

  // Repeating rows: sources and marginalia
  const srcBox = main.querySelector('#ad-sources'), marBox = main.querySelector('#ad-margins');
  const srcRow = (s = {}) => '<div class="ad-rep-row src"><label class="cx-field"><span>Source</span><textarea rows="2" data-k="text">' + esc(s.text || '') + '</textarea></label>' +
    '<label class="cx-field"><span>Link</span><input type="url" data-k="url" value="' + esc(s.url || '') + '"></label><button class="ad-link" type="button" data-rm>Remove</button></div>';
  const marRow = (m = {}) => '<div class="ad-rep-row"><label class="cx-field"><span>Kind</span><select data-k="kind">' + Object.entries(MARGIN_KINDS).map(([k, l]) => '<option value="' + k + '"' + (m.kind === k ? ' selected' : '') + '>' + l + '</option>').join('') + '</select></label>' +
    '<div class="ad-rep"><label class="cx-field"><span>Text</span><textarea rows="2" data-k="body">' + esc(m.body || '') + '</textarea></label>' +
    '<label class="cx-field"><span>Image URL (optional, e.g. a sketch)</span><input type="url" data-k="src" value="' + esc(m.src || '') + '"></label></div><button class="ad-link" type="button" data-rm>Remove</button></div>';
  srcBox.innerHTML = (a.sources || []).map(srcRow).join('');
  marBox.innerHTML = (a.marginalia || []).map(marRow).join('');
  main.querySelector('#ad-add-src').onclick = () => { srcBox.insertAdjacentHTML('beforeend', srcRow()); changed(); };
  main.querySelector('#ad-add-margin').onclick = () => { marBox.insertAdjacentHTML('beforeend', marRow()); changed(); };
  [srcBox, marBox].forEach((b) => b.addEventListener('click', (e) => { if (e.target.matches('[data-rm]')) { e.target.parentElement.remove(); changed(); } }));
  const rows = (box) => [...box.children].map((r) => Object.fromEntries([...r.querySelectorAll('[data-k]')].map((i) => [i.dataset.k, i.value.trim()])));

  function collect() {
    const v = (n) => f.elements[n].value;
    const row = {};
    FIELDS.forEach((k) => { if (f.elements[k]) row[k] = f.elements[k].type === 'checkbox' ? f.elements[k].checked : v(k).trim(); });
    row.status = f.querySelector('[name=status]:checked').value;
    row.visibility = f.querySelector('[name=visibility]:checked').value;
    row.year_sort = row.year_sort === '' ? null : Number(row.year_sort);
    row.image_width = Number(row.image_width) || null;
    row.image_height = Number(row.image_height) || null;
    row.discovered_on = row.discovered_on || null;
    SECTIONS.forEach(([k]) => { row[k] = html[k]; });
    row.sources = rows(srcBox).filter((s) => s.text);
    row.marginalia = rows(marBox).filter((m) => m.body || m.src);
    row.themes = listOf(f.elements.themes.value);
    row.tags = listOf(f.elements.tags.value);
    row.related = [...f.querySelectorAll('[name=related]:checked')].map((i) => i.value);
    return { row, rooms: [...f.querySelectorAll('[name=room]:checked')].map((i) => i.value), notes: html.private_notes };
  }

  function shareBox() {
    const vis = f.querySelector('[name=visibility]:checked').value;
    const box = main.querySelector('#ad-sharebox');
    if (vis !== 'unlisted' || isNew) { box.innerHTML = vis === 'unlisted' ? '<p class="ad-note">Save once to get the private link.</p>' : ''; return; }
    box.innerHTML = '<div class="ad-share"><p class="cx-label">Private link</p><code>' + esc(shareUrl(a)) + '</code>' +
      '<p>Anyone who has this link can read the public-facing parts of this entry (never your private notes or private reflections). It is kept out of the collection, search, related works and search engines.' +
      (a.status !== 'published' ? ' <strong>It only opens once the entry is Published.</strong>' : '') + '</p>' +
      '<div class="ad-row"><button class="ad-btn ghost" type="button" data-copy>Copy link</button><button class="ad-link" type="button" data-rotate>Replace with a new link (the old one stops working)</button></div></div>';
    box.querySelector('[data-copy]').onclick = () => navigator.clipboard.writeText(shareUrl(a)).then(() => { status.textContent = 'Link copied.'; });
    box.querySelector('[data-rotate]').onclick = async () => {
      if (!confirm('Make a new private link? Anyone using the old link will lose access.')) return;
      try { Object.assign(a, must(await sb.from('artworks').update({ share_token: crypto.randomUUID() }).eq('id', a.id).select().single())); shareBox(); } catch (e) { fail(e, status); }
    };
  }
  shareBox();

  // Local autosave (this device) on every change; drafts that already exist also save to the database.
  let dirty = false, tLocal, tRemote;
  function changed() {
    dirty = true;
    clearTimeout(tLocal);
    tLocal = setTimeout(() => {
      store.set(key, JSON.stringify({ at: new Date().toISOString(), data: collect() }));
      status.textContent = 'Autosaved on this device at ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }, 800);
    clearTimeout(tRemote);
    if (!isNew && live.status === 'draft') tRemote = setTimeout(() => { if (collect().row.status === 'draft') save(true); }, 6000);
  }
  f.addEventListener('input', (e) => {
    if (e.target.name === 'title' && !slugTouched) f.elements.slug.value = slugify(e.target.value);
    if (e.target.name === 'slug') slugTouched = true;
    if (e.target.name === 'visibility') shareBox();
    changed();
  });
  f.elements.image_url.addEventListener('change', async () => {
    const url = f.elements.image_url.value.trim();
    f.elements.image_thumb.value = '';
    const m = url && await measure(url);
    f.elements.image_width.value = m ? m.width : ''; f.elements.image_height.value = m ? m.height : '';
    main.querySelector('.ad-imgprev').innerHTML = plate({ ...collect().row });
    changed();
  });
  main.querySelector('#ad-file').addEventListener('change', async (e) => {
    const file = e.target.files[0]; if (!file) return;
    status.textContent = 'Optimizing and uploading the image…';
    try {
      const up = await uploadImage(file);
      f.elements.image_url.value = up.url; f.elements.image_thumb.value = up.thumb;
      f.elements.image_width.value = up.width; f.elements.image_height.value = up.height;
      main.querySelector('.ad-imgprev').innerHTML = plate({ ...collect().row });
      status.textContent = 'Image uploaded. Save to keep it.';
      changed();
    } catch (err) { fail(err, status); }
  });

  // Offer to restore unsaved local changes
  let saved = null;
  try { saved = JSON.parse(store.get(key) || 'null'); } catch (e) { /* ignore a corrupt autosave */ }
  if (restore) { dirty = true; status.textContent = 'Restored. Save to keep these changes.'; }
  else if (saved && saved.data && (!live.updated_at || saved.at > live.updated_at)) {
    const box = main.querySelector('#ad-restore');
    box.innerHTML = '<div class="ad-share ad-row"><span>Unsaved changes from ' + esc(new Date(saved.at).toLocaleString()) + ' were kept on this device.</span>' +
      '<button class="ad-btn ghost" type="button" data-r>Restore them</button><button class="ad-link" type="button" data-d>Discard</button></div>';
    box.querySelector('[data-d]').onclick = () => { store.set(key, null); box.innerHTML = ''; };
    box.querySelector('[data-r]').onclick = () => {
      S.editors.forEach((e) => e.destroy()); S.editors = null;
      editWork(w, saved.data);
    };
  }

  async function save(quiet) {
    const { row, rooms, notes } = collect();
    if (!row.title) { status.textContent = 'Give the entry a title first.'; f.elements.title.focus(); return; }
    row.slug = slugify(row.slug || row.title);
    if (!quiet && row.visibility === 'public' && row.status === 'published' && !(a.visibility === 'public' && a.status === 'published') &&
        !confirm('Make “' + row.title + '” public?\n\nIt will appear in the public collection, its search and related works, and can be indexed by search engines. Private notes and private reflections stay private.')) return;
    if (!quiet && row.visibility === 'unlisted' && live.visibility !== 'unlisted' &&
        !confirm('Make “' + row.title + '” unlisted?\n\nIt stays out of the collection and search engines, but anyone who has its private link can read it.')) return;
    status.textContent = quiet ? 'Saving draft…' : 'Saving…';
    try {
      let saved;
      if (isNew) { row.position = S.works.length; saved = must(await sb.from('artworks').insert(row).select().single()); }
      else saved = must(await sb.from('artworks').update(row).eq('id', a.id).select().single());
      must(await sb.from('artwork_private').upsert({ artwork_id: saved.id, notes, updated_at: new Date().toISOString() }));
      const had = S.links.filter((l) => l.artwork_id === saved.id);
      const drop = had.filter((l) => !rooms.includes(l.room_id)).map((l) => l.room_id);
      const add = rooms.filter((id) => !had.some((l) => l.room_id === id)).map((id) => ({ artwork_id: saved.id, room_id: id, position: S.links.filter((l) => l.room_id === id).length }));
      if (drop.length) must(await sb.from('artwork_rooms').delete().eq('artwork_id', saved.id).in('room_id', drop));
      if (add.length) must(await sb.from('artwork_rooms').insert(add));
      store.set(key, null);
      dirty = false;
      await refresh();
      Object.assign(a, saved); Object.assign(live, saved);
      if (isNew) { S.leave = null; location.hash = 'edit/' + saved.id; return; }
      status.textContent = (quiet ? 'Draft saved' : 'Saved') + ' at ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      shareBox();
    } catch (e) { fail(e, status); }
  }
  f.addEventListener('submit', (e) => { e.preventDefault(); save(false); });
  S.leave = () => !dirty || confirm('Leave without saving? Your changes are autosaved on this device and can be restored.');
  window.onbeforeunload = () => (dirty ? true : undefined);

  if (!isNew) reflections(main.querySelector('#ad-refl'), a, refl);
}

function reflections(box, a, list) {
  box.innerHTML = '<div id="ad-refl-list"></div><div class="ad-card"><p class="cx-label">A new return</p>' +
    '<label class="cx-field"><span>Date</span><input type="date" id="ad-refl-date" value="' + new Date().toISOString().slice(0, 10) + '"></label>' +
    '<div id="ad-refl-ed"></div><label class="ad-check"><input type="checkbox" id="ad-refl-pub">Show this reflection on the entry’s public page</label>' +
    '<div><button class="ad-btn ghost" type="button" id="ad-refl-add">Add reflection</button></div></div>';
  const ed = Editor.createEditor(box.querySelector('#ad-refl-ed'), { placeholder: 'What do you see now?', pickImage });
  S.editors.push(ed);
  const draw = () => {
    box.querySelector('#ad-refl-list').innerHTML = list.length ? list.map((r) => '<div class="ad-refl" data-id="' + r.id + '"><div class="ad-refl-head"><strong>' + esc(fmtDate(r.written_on)) + '</strong>' +
      '<span>' + (r.is_private ? 'Private' : 'Shown publicly') + '</span><button class="ad-link" type="button" data-a="toggle">' + (r.is_private ? 'Show publicly' : 'Make private') + '</button>' +
      '<button class="ad-link" type="button" data-a="del">Delete</button></div><div class="cx-prose">' + sanitize(r.body) + '</div></div>').join('') : '<p class="ad-note">No returns recorded yet.</p>';
  };
  draw();
  box.querySelector('#ad-refl-list').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    const r = list.find((x) => x.id === b.closest('[data-id]').dataset.id);
    try {
      if (b.dataset.a === 'toggle') Object.assign(r, must(await sb.from('reflections').update({ is_private: !r.is_private }).eq('id', r.id).select().single()));
      if (b.dataset.a === 'del') {
        if (!confirm('Delete the reflection from ' + fmtDate(r.written_on) + '? This cannot be undone.')) return;
        must(await sb.from('reflections').delete().eq('id', r.id)); list.splice(list.indexOf(r), 1);
      }
      draw();
    } catch (err) { fail(err); }
  });
  box.querySelector('#ad-refl-add').onclick = async () => {
    const body = ed.getHTML(); if (!body) return;
    try {
      const r = must(await sb.from('reflections').insert({ artwork_id: a.id, written_on: box.querySelector('#ad-refl-date').value, body, is_private: !box.querySelector('#ad-refl-pub').checked }).select().single());
      list.push(r); list.sort((x, y) => String(x.written_on).localeCompare(String(y.written_on)));
      ed.setHTML(''); draw();
    } catch (err) { fail(err); }
  };
}

// ---------- rooms ----------

function roomsView() {
  const main = shell('rooms', '<h2 class="ad-h2">Rooms</h2><p class="ad-note">Curated rooms group works across the collection. A work can hang in several rooms. Private rooms are hidden from visitors; public rooms show only public works.</p>' +
    '<div id="ad-rooms"></div><form class="ad-card" id="ad-room-new"><p class="cx-label">A new room</p><div class="ad-fieldset"><label class="cx-field"><span>Name</span><input name="name" required></label>' +
    '<label class="cx-field ad-wide"><span>Description</span><textarea name="description" rows="2"></textarea></label></div><div><button class="ad-btn" type="submit">Create room</button></div></form>');
  const box = main.querySelector('#ad-rooms');
  const draw = () => {
    box.innerHTML = S.rooms.length ? S.rooms.map((r, i) => {
      const ws = S.links.filter((l) => l.room_id === r.id).sort((x, y) => x.position - y.position).map((l) => S.works.find((w) => w.id === l.artwork_id)).filter(Boolean);
      return '<form class="ad-card" data-id="' + r.id + '"><div class="ad-row"><span class="ad-order"><button type="button" data-a="up" aria-label="Move room up"' + (i ? '' : ' disabled') + '>↑</button><button type="button" data-a="down" aria-label="Move room down"' + (i < S.rooms.length - 1 ? '' : ' disabled') + '>↓</button></span>' +
        '<span class="ad-badge ' + (r.visibility === 'public' ? 'public' : '') + '">' + (r.visibility === 'public' ? 'Public' : 'Private') + '</span></div>' +
        '<div class="ad-fieldset"><label class="cx-field"><span>Name</span><input name="name" value="' + esc(r.name) + '" required></label><label class="cx-field"><span>Web address</span><input name="slug" value="' + esc(r.slug) + '"></label>' +
        '<label class="cx-field"><span>Visibility</span><select name="visibility"><option value="private"' + (r.visibility === 'private' ? ' selected' : '') + '>Private</option><option value="public"' + (r.visibility === 'public' ? ' selected' : '') + '>Public</option></select></label>' +
        '<label class="cx-field ad-wide"><span>Description</span><textarea name="description" rows="2">' + esc(r.description) + '</textarea></label></div>' +
        '<div><p class="cx-label">Works in this room, in order</p>' + (ws.length ? '<ul class="ad-list">' + ws.map((w, k) => '<li class="ad-item" data-w="' + w.id + '">' + plate(w, { thumb: true }) + '<div class="ad-item-title">' + esc(w.title) + '</div><div class="ad-actions"><span class="ad-order"><button type="button" data-a="wup" aria-label="Move up"' + (k ? '' : ' disabled') + '>↑</button><button type="button" data-a="wdown" aria-label="Move down"' + (k < ws.length - 1 ? '' : ' disabled') + '>↓</button></span><button type="button" data-a="wrm">Remove</button></div></li>').join('') + '</ul>' : '<p class="ad-note">Add works to this room from each entry’s Threads section.</p>') + '</div>' +
        '<div class="ad-row"><button class="ad-btn" type="submit">Save room</button><button class="ad-btn danger" type="button" data-a="del">Delete room</button>' + (r.visibility === 'public' ? '<a class="ad-link" target="_blank" rel="noopener" href="/art/collection/room/?r=' + esc(r.slug) + '">View</a>' : '') + '</div></form>';
    }).join('') : '<p class="ad-note">No rooms yet.</p>';
  };
  draw();
  box.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target, id = f.dataset.id;
    try {
      const vis = f.elements.visibility.value;
      const prev = S.rooms.find((r) => r.id === id);
      if (vis === 'public' && prev.visibility !== 'public' && !confirm('Make this room public? Its name and description, and the public works in it, will be visible to everyone.')) return;
      must(await sb.from('rooms').update({ name: f.elements.name.value.trim(), slug: slugify(f.elements.slug.value || f.elements.name.value), description: f.elements.description.value.trim(), visibility: vis }).eq('id', id));
      await refresh(); draw();
    } catch (err) { fail(err); }
  });
  box.addEventListener('click', async (e) => {
    const b = e.target.closest('button[data-a]'); if (!b) return;
    const r = S.rooms.find((x) => x.id === b.closest('[data-id]').dataset.id);
    try {
      if (b.dataset.a === 'up' || b.dataset.a === 'down') await move(S.rooms, r, b.dataset.a === 'up' ? -1 : 1, 'rooms');
      if (b.dataset.a === 'del') {
        if (!confirm('Delete the room “' + r.name + '”? The works in it are not deleted.')) return;
        must(await sb.from('rooms').delete().eq('id', r.id));
      }
      if (b.dataset.a.startsWith('w')) {
        const wid = b.closest('[data-w]').dataset.w;
        const ls = S.links.filter((l) => l.room_id === r.id).sort((x, y) => x.position - y.position);
        const i = ls.findIndex((l) => l.artwork_id === wid);
        if (b.dataset.a === 'wrm') must(await sb.from('artwork_rooms').delete().eq('room_id', r.id).eq('artwork_id', wid));
        else {
          const j = i + (b.dataset.a === 'wup' ? -1 : 1);
          [ls[i], ls[j]] = [ls[j], ls[i]];
          await Promise.all(ls.map((l, k) => sb.from('artwork_rooms').update({ position: k }).eq('room_id', r.id).eq('artwork_id', l.artwork_id).then(must)));
        }
      }
      await refresh(); draw();
    } catch (err) { fail(err); }
  });
  main.querySelector('#ad-room-new').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    try {
      let slug = slugify(f.elements.name.value), n = 2;
      while (S.rooms.some((r) => r.slug === slug)) slug = slugify(f.elements.name.value) + '-' + n++;
      must(await sb.from('rooms').insert({ name: f.elements.name.value.trim(), slug, description: f.elements.description.value.trim(), position: S.rooms.length }));
      f.reset(); await refresh(); draw();
    } catch (err) { fail(err); }
  });
}

// ---------- exhibitions ----------

async function exhibitionsView(id) {
  const ex = id && S.exhibitions.find((x) => x.id === id);
  if (!ex) {
    const main = shell('exhibitions', '<h2 class="ad-h2">Exhibitions</h2><p class="ad-note">An exhibition is a public sequence of works with your notes on each. It shows only the public-facing parts of each entry, never private notes, and only works that are themselves public.</p>' +
      '<ul class="ad-list">' + S.exhibitions.map((x) => '<li class="ad-item"><span></span><div><a class="ad-item-title" href="#exhibitions/' + x.id + '">' + esc(x.title) + '</a><div class="ad-badges"><span class="ad-badge ' + (x.visibility === 'public' ? 'public' : '') + '">' + (x.visibility === 'public' ? 'Public' : 'Private') + '</span><span class="ad-badge">' + (x.items || []).length + ' works</span></div></div><span></span></li>').join('') + '</ul>' +
      '<form class="ad-card" id="ad-ex-new"><label class="cx-field"><span>Title of a new exhibition</span><input name="title" required></label><div><button class="ad-btn" type="submit">Create</button></div></form>');
    main.querySelector('#ad-ex-new').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const t = e.target.elements.title.value.trim();
        let slug = slugify(t), n = 2;
        while (S.exhibitions.some((x) => x.slug === slug)) slug = slugify(t) + '-' + n++;
        const row = must(await sb.from('exhibitions').insert({ title: t, slug }).select().single());
        await refresh(); location.hash = 'exhibitions/' + row.id;
      } catch (err) { fail(err); }
    });
    return;
  }
  if (!Editor) Editor = await import('./vendor/editor.js');
  let items = (ex.items || []).slice();
  const main = shell('exhibitions', '<a class="ad-link" href="#exhibitions">All exhibitions</a><h2 class="ad-h2">' + esc(ex.title) + '</h2>' +
    '<form id="ad-ex" class="ad-form"><div class="ad-fieldset"><label class="cx-field"><span>Title</span><input name="title" value="' + esc(ex.title) + '" required></label>' +
    '<label class="cx-field"><span>Web address</span><input name="slug" value="' + esc(ex.slug) + '"></label>' +
    '<label class="cx-field"><span>Visibility</span><select name="visibility"><option value="private"' + (ex.visibility !== 'public' ? ' selected' : '') + '>Private</option><option value="public"' + (ex.visibility === 'public' ? ' selected' : '') + '>Public</option></select></label>' +
    '<div class="ad-wide"><p class="cx-label">Introduction</p><div id="ad-ex-intro"></div></div></div>' +
    '<div><p class="cx-label">Works, in order</p><div id="ad-ex-items" class="ad-rep"></div><div class="ad-row" style="margin-top:12px"><select id="ad-ex-add" class="cx-field"><option value="">Add a work…</option>' +
      S.works.filter((w) => !w.archived).map((w) => '<option value="' + w.id + '">' + esc(w.title) + (w.visibility === 'public' && w.status === 'published' ? '' : ' (not public)') + '</option>').join('') + '</select></div></div>' +
    '<div class="ad-sticky"><button class="ad-btn" type="submit">Save exhibition</button><button class="ad-btn danger" type="button" id="ad-ex-del">Delete</button>' +
      (ex.visibility === 'public' ? '<a class="ad-link" target="_blank" rel="noopener" href="/art/collection/exhibition/?e=' + esc(ex.slug) + '">View</a>' : '') + '<span class="ad-status" role="status"></span></div></form>');
  const intro = Editor.createEditor(main.querySelector('#ad-ex-intro'), { content: ex.intro, placeholder: 'What this exhibition is about…', pickImage });
  S.editors = [intro];
  const box = main.querySelector('#ad-ex-items');
  const draw = () => {
    box.innerHTML = items.length ? items.map((it, i) => {
      const w = S.works.find((x) => x.id === it.artwork_id);
      if (!w) return '';
      const pub = w.visibility === 'public' && w.status === 'published' && !w.archived;
      return '<div class="ad-rep-row" data-i="' + i + '"><div>' + plate(w, { thumb: true }) + '</div><div class="ad-rep"><span class="ad-item-title">' + esc(w.title) + '</span>' +
        (pub ? '' : '<span class="ad-note">Not public, so visitors won’t see it here until you publish it as Public.</span>') +
        '<label class="cx-field"><span>Curator’s note</span><textarea rows="2" data-note>' + esc(it.note || '') + '</textarea></label></div>' +
        '<div class="ad-actions"><span class="ad-order"><button type="button" data-a="up" aria-label="Move up"' + (i ? '' : ' disabled') + '>↑</button><button type="button" data-a="down" aria-label="Move down"' + (i < items.length - 1 ? '' : ' disabled') + '>↓</button></span><button type="button" data-a="rm">Remove</button></div></div>';
    }).join('') : '<p class="ad-note">No works yet.</p>';
  };
  const notes = () => box.querySelectorAll('[data-i]').forEach((r) => { items[+r.dataset.i].note = r.querySelector('[data-note]').value; });
  draw();
  box.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-a]'); if (!b) return;
    notes();
    const i = +b.closest('[data-i]').dataset.i;
    if (b.dataset.a === 'rm') items.splice(i, 1);
    else { const j = i + (b.dataset.a === 'up' ? -1 : 1); [items[i], items[j]] = [items[j], items[i]]; }
    draw();
  });
  main.querySelector('#ad-ex-add').addEventListener('change', (e) => {
    if (!e.target.value) return;
    notes(); items.push({ artwork_id: e.target.value, note: '' }); e.target.value = ''; draw();
  });
  const f = main.querySelector('#ad-ex'), status = f.querySelector('.ad-status');
  f.addEventListener('submit', async (e) => {
    e.preventDefault(); notes();
    const vis = f.elements.visibility.value;
    if (vis === 'public' && ex.visibility !== 'public' && !confirm('Make this exhibition public? Its introduction, notes and the public works in it will be visible to everyone.')) return;
    try {
      Object.assign(ex, must(await sb.from('exhibitions').update({ title: f.elements.title.value.trim(), slug: slugify(f.elements.slug.value || f.elements.title.value), visibility: vis, intro: intro.getHTML(), items }).eq('id', ex.id).select().single()));
      status.textContent = 'Saved.'; await refresh();
    } catch (err) { fail(err, status); }
  });
  main.querySelector('#ad-ex-del').onclick = async () => {
    if (!confirm('Delete this exhibition? The works in it are not deleted.')) return;
    try { must(await sb.from('exhibitions').delete().eq('id', ex.id)); await refresh(); location.hash = 'exhibitions'; } catch (err) { fail(err); }
  };
}

// ---------- homepage ----------

function homeView() {
  let order = (S.home.sections || Object.keys(HOME_SECTIONS)).filter((k) => HOME_SECTIONS[k]);
  Object.keys(HOME_SECTIONS).forEach((k) => { if (!order.includes(k)) order.push(k); });
  const hidden = new Set(S.home.hidden || []);
  const main = shell('homepage', '<h2 class="ad-h2">Homepage</h2>' +
    '<p class="cx-label">Sections, in order</p><ul class="ad-list" id="ad-secs"></ul>' +
    '<div class="ad-sticky"><button class="ad-btn" type="button" id="ad-home-save">Save homepage</button><span class="ad-status" role="status"></span></div>');
  const ul = main.querySelector('#ad-secs');
  const draw = () => {
    ul.innerHTML = order.map((k, i) => '<li class="ad-item" data-k="' + k + '"><span class="ad-order"><button type="button" data-a="up" aria-label="Move up"' + (i ? '' : ' disabled') + '>↑</button><button type="button" data-a="down" aria-label="Move down"' + (i < order.length - 1 ? '' : ' disabled') + '>↓</button></span>' +
      '<span class="ad-item-title">' + HOME_SECTIONS[k] + '</span><label class="ad-check"><input type="checkbox"' + (hidden.has(k) ? '' : ' checked') + '>Shown</label></li>').join('');
  };
  draw();
  ul.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-a]'); if (!b) return;
    const i = order.indexOf(b.closest('[data-k]').dataset.k), j = i + (b.dataset.a === 'up' ? -1 : 1);
    [order[i], order[j]] = [order[j], order[i]]; draw();
  });
  ul.addEventListener('change', (e) => { const k = e.target.closest('[data-k]').dataset.k; if (e.target.checked) hidden.delete(k); else hidden.add(k); });
  main.querySelector('#ad-home-save').onclick = async () => {
    const status = main.querySelector('.ad-status');
    try {
      must(await sb.from('settings').upsert({ key: 'homepage', value: { sections: order, hidden: [...hidden] } }));
      await refresh(); status.textContent = 'Saved.';
    } catch (err) { fail(err, status); }
  };
}

// ---------- backup ----------

const TABLES = ['rooms', 'artworks', 'artwork_private', 'artwork_rooms', 'reflections', 'exhibitions', 'favorites', 'settings'];
const KEYS = { artwork_private: 'artwork_id', artwork_rooms: 'artwork_id,room_id', favorites: 'artwork_id', settings: 'key' };

function backupView() {
  const main = shell('backup', '<h2 class="ad-h2">Backup</h2>' +
    '<div class="ad-card"><p class="cx-label">Export</p><p class="ad-note">Downloads everything, private notes included, as one JSON file. Keep it somewhere private. Images stay in Supabase Storage; their addresses are in the file.</p><div><button class="ad-btn" type="button" id="ad-export">Export everything</button></div></div>' +
    '<div class="ad-card"><p class="cx-label">Restore</p><p class="ad-note">Brings back an export. Entries with the same id are overwritten; nothing else is removed.</p><label class="cx-field"><span>Export file</span><input type="file" accept="application/json,.json" id="ad-import"></label></div>' +
    '<div class="ad-card"><p class="cx-label">Your first entries</p><p class="ad-note">Adds the works from the starter file (<em>On the Yacht “Namouna,” Venice</em> and the others already on the site) with their images, and the five rooms (I Wonder, I Dream, I Remember, I Feel, I See). Works arrive as private drafts and rooms as private: make each Public when it’s ready. Anything already in your collection is skipped.</p><div><button class="ad-btn ghost" type="button" id="ad-seed">Add starter entries</button></div></div>' +
    '<p class="ad-msg" role="status"></p>');
  const out = main.querySelector('.ad-msg');
  main.querySelector('#ad-export').onclick = async () => {
    try {
      const dump = { exported_at: new Date().toISOString(), version: 1 };
      for (const t of TABLES) dump[t] = must(await sb.from(t).select('*'));
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' }));
      a.download = 'ria-collection-' + dump.exported_at.slice(0, 10) + '.json';
      a.click(); URL.revokeObjectURL(a.href);
      out.textContent = 'Exported.';
    } catch (e) { fail(e, out); }
  };
  main.querySelector('#ad-import').onchange = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try {
      const dump = JSON.parse(await file.text());
      if (!confirm('Restore ' + (dump.artworks || []).length + ' entries from ' + (dump.exported_at || 'this file') + '?')) return;
      for (const t of TABLES) if ((dump[t] || []).length) must(await sb.from(t).upsert(dump[t], { onConflict: KEYS[t] || 'id' }));
      await refresh(); out.textContent = 'Restored.';
    } catch (err) { fail(err, out); }
  };
  main.querySelector('#ad-seed').onclick = async () => {
    try {
      const seed = await (await fetch('/assets/collection/seed.json', { cache: 'no-cache' })).json();
      const ids = {};
      let added = 0;
      for (const r of seed.rooms) {
        const have = S.rooms.find((x) => x.slug === r.slug);
        ids[r.id] = have ? have.id : must(await sb.from('rooms').insert({ name: r.name, slug: r.slug, description: r.description, position: S.rooms.length + added++ }).select().single()).id;
      }
      let n = 0;
      for (const w of seed.artworks) {
        if (S.works.some((x) => x.slug === w.slug)) continue;
        const row = { ...w };
        ['id', 'rooms', 'related', 'created_at', 'updated_at', 'last_contemplated_at'].forEach((k) => delete row[k]);
        Object.assign(row, { status: 'draft', visibility: 'private', featured: false, position: S.works.length + n });
        const saved = must(await sb.from('artworks').insert(row).select().single());
        const rl = (w.rooms || []).filter((id) => ids[id]).map((id) => ({ artwork_id: saved.id, room_id: ids[id] }));
        if (rl.length) must(await sb.from('artwork_rooms').insert(rl));
        n++;
      }
      await refresh();
      out.textContent = n ? 'Added ' + n + (n === 1 ? ' entry' : ' entries') + ' as private drafts. Find them under Artworks.' : 'The starter entries are already in your collection.';
    } catch (e) { fail(e, out); }
  };
}

boot().catch((e) => { console.error(e); host.innerHTML = '<p class="cx-empty">The dashboard could not open: ' + esc(e.message || e) + '</p>'; });
