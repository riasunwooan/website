// Art portfolio: the boom in the drawing explodes (shake, flash, rings, sparks) and project
// cards fly out of it to land on the tips of the starburst. Tabs swap folders; tap the boom to punch again.
(function () {
  var stage = document.querySelector('.ap-stage');
  if (!stage) return;
  var img = stage.querySelector('.ap-bg');
  var fx = stage.querySelector('.ap-fx');
  var cards = Array.prototype.slice.call(stage.querySelectorAll('.ap-card'));
  var tabs = Array.prototype.slice.call(stage.querySelectorAll('.ap-tab'));
    var BOOM = stage.dataset.boom.split(',').map(Number);
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mobile = window.matchMedia('(max-width: 720px)');
  var cat = tabs[0].dataset.cat, busy = false;

  // Map a point in the drawing (fractions) to stage pixels, matching object-fit: cover; object-position: 0 50%.
  function toStage(fx_, fy_) {
    var r = img.getBoundingClientRect(), s0 = stage.getBoundingClientRect();
    var iw = img.naturalWidth || 1756, ih = img.naturalHeight || 896;
    var s = Math.max(r.width / iw, r.height / ih);
    return [r.left - s0.left + fx_ * iw * s, r.top - s0.top + (r.height - ih * s) / 2 + fy_ * ih * s];
  }

  function layout() {
    var b = toStage(BOOM[0], BOOM[1]);
    stage.style.setProperty('--bx', b[0] + 'px');
    stage.style.setProperty('--by', b[1] + 'px');
    var W = stage.clientWidth, H = stage.clientHeight;
    cards.forEach(function (c) {
      if (c.hidden) return;
      var cx, cy;
      if (mobile.matches) {
        c.style.removeProperty('--x'); c.style.removeProperty('--y');
        cx = c.offsetLeft + c.offsetWidth / 2; cy = c.offsetTop + c.offsetHeight / 2; // ignores transforms
      } else {
        var p = toStage(+c.dataset.sx, +c.dataset.sy);
        var hw = c.offsetWidth / 2 + 12, hh = c.offsetHeight / 2 + 12;
        cx = Math.min(Math.max(p[0], hw), W - hw); cy = Math.min(Math.max(p[1], hh), H - hh);
        c.style.setProperty('--x', cx + 'px'); c.style.setProperty('--y', cy + 'px');
      }
      c._c = [cx, cy];
    });
    if (!mobile.matches) {
      // nudge apart cards that were clamped into each other at the right edge
      var vis = cards.filter(function (c) { return !c.hidden; }).sort(function (a, z) { return z._c[0] - a._c[0]; });
      for (var i = 0; i < vis.length; i++) for (var j = i + 1; j < vis.length; j++) {
        var A = vis[i], B = vis[j];
        if (Math.abs(A._c[1] - B._c[1]) > (A.offsetHeight + B.offsetHeight) / 2 + 10) continue;
        var need = (A.offsetWidth + B.offsetWidth) / 2 + 18 - (A._c[0] - B._c[0]);
        if (need > 0) { B._c[0] -= need; B.style.setProperty('--x', B._c[0] + 'px'); }
      }
    }
    cards.forEach(function (c) {
      if (c.hidden) return;
      c.style.setProperty('--ox', (b[0] - c._c[0]) + 'px');
      c.style.setProperty('--oy', (b[1] - c._c[1]) + 'px');
    });
  }

  function sparks() {
    if (calm) return;
    for (var i = 0; i < 22; i++) {
      var sp = document.createElement('span');
      sp.className = 'ap-spark';
      sp.style.setProperty('--a', (i / 22 * 360 + Math.random() * 14) + 'deg');
      sp.style.setProperty('--len', (30 + Math.random() * 60) + 'px');
      sp.style.setProperty('--dist', (mobile.matches ? 60 : 140) + Math.random() * (mobile.matches ? 80 : 220) + 'px');
      sp.style.setProperty('--sd', (Math.random() * 90) + 'ms');
      fx.appendChild(sp);
      setTimeout(sp.remove.bind(sp), 1000);
    }
  }

  function punch() {
    cards.forEach(function (c) { c.hidden = c.dataset.cat !== cat; });
    tabs.forEach(function (t) { t.setAttribute('aria-pressed', String(t.dataset.cat === cat)); });
    layout();
    void stage.offsetWidth;
    stage.classList.remove('boom', 'shake'); void stage.offsetWidth;
    stage.classList.add('boom', 'shake');
    sparks();
    setTimeout(function () { stage.classList.add('out'); }, calm ? 0 : 140);
    setTimeout(function () { stage.classList.remove('shake'); busy = false; }, 900);
  }

  function again(next) {
    if (busy) return;
    busy = true;
    if (next) cat = next;
    if (!stage.classList.contains('out')) return punch();
    stage.classList.remove('out');
    setTimeout(punch, calm ? 0 : 430);
  }

  tabs.forEach(function (t) {
    t.addEventListener('click', function () { if (t.dataset.cat !== cat) again(t.dataset.cat); });
  });
  stage.querySelector('.ap-boom-hit').addEventListener('click', function () { again(); });

  var dlg = document.querySelector('.ap-dialog'), body = dlg.querySelector('.ap-d-body');
  // Instagram's official embed script turns .instagram-media blockquotes into posts
  function igEmbeds() {
    if (!body.querySelector('.instagram-media')) return;
    if (window.instgrm) { window.instgrm.Embeds.process(); return; }
    if (document.getElementById('ig-embed-js')) return;
    var sc = document.createElement('script');
    sc.id = 'ig-embed-js'; sc.async = true; sc.src = 'https://www.instagram.com/embed.js';
    sc.onload = function () { if (window.instgrm) window.instgrm.Embeds.process(); };
    document.body.appendChild(sc);
  }
  function openCard(c) {
    body.innerHTML = '';
    body.appendChild(document.getElementById('ap-t-' + c.dataset.i).content.cloneNode(true));
    dlg.showModal();
    setupCarousels(body);
    igEmbeds();
    dlg.scrollTop = 0;
  }
  cards.forEach(function (c) { c.addEventListener('click', function () { openCard(c); }); });
  // Instagram post tabs
  body.addEventListener('click', function (e) {
    var t = e.target.closest('.apd-ptab');
    if (!t) return;
    body.querySelectorAll('.apd-ptab').forEach(function (b) { b.setAttribute('aria-pressed', String(b === t)); });
    body.querySelectorAll('.apd-embed').forEach(function (pn) { pn.hidden = pn.dataset.k !== t.dataset.k; });
    igEmbeds();
  });
  // /art/#slug opens that project (used by links from other pages)
  function fromHash() {
    var c = cards.filter(function (x) { return '#' + x.dataset.slug === location.hash; })[0];
    if (!c) return;
    var go = function () { if (!dlg.open) openCard(c); };
    if (c.dataset.cat !== cat) { again(c.dataset.cat); setTimeout(go, 1500); } else setTimeout(go, 900);
  }
  window.addEventListener('hashchange', fromHash);
  body.addEventListener('click', function (e) {
    var j = e.target.closest('.apd-jump button');
    if (j) body.querySelectorAll('.apd-sec')[+j.dataset.k].scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' });
  });
  // carousels: arrows, swipe (native scroll-snap), keyboard, counter
  function setupCarousels(root) {
    root.querySelectorAll('.apc').forEach(function (c) {
      var track = c.querySelector('.apc-track'), n = track.children.length, count = c.querySelector('.apc-count');
      if (n < 2) return;
      function idx() { return Math.round(track.scrollLeft / track.clientWidth); }
      function go(k) { k = (k + n) % n; track.scrollTo({ left: k * track.clientWidth, behavior: calm ? 'auto' : 'smooth' }); }
      c.querySelector('.apc-prev').addEventListener('click', function () { go(idx() - 1); });
      c.querySelector('.apc-next').addEventListener('click', function () { go(idx() + 1); });
      track.addEventListener('click', function (e) {
        if (e.target.tagName !== 'IMG') return;
        var r = track.getBoundingClientRect();
        go(idx() + (e.clientX - r.left < r.width / 3 ? -1 : 1));
      });
      c.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight') { e.preventDefault(); go(idx() + 1); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); go(idx() - 1); }
      });
      track.addEventListener('scroll', function () { count.textContent = (idx() + 1) + ' / ' + n; }, { passive: true });
    });
  }
  dlg.querySelector('.ap-x').addEventListener('click', function () { dlg.close(); });
  dlg.addEventListener('close', function () { body.innerHTML = ''; });
  dlg.addEventListener('click', function (e) {
    var r = dlg.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dlg.close();
  });

  var t;
  window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(layout, 120); });
  function start() {
    var h = cards.filter(function (x) { return '#' + x.dataset.slug === location.hash; })[0];
    if (h) cat = h.dataset.cat;
    busy = true; setTimeout(punch, 350); setTimeout(fromHash, 400);
  }
  if (img.complete && img.naturalWidth) start(); else img.addEventListener('load', start);
})();
