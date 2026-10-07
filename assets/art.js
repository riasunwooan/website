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
  cards.forEach(function (c) {
    c.addEventListener('click', function () {
      body.innerHTML = '';
      body.appendChild(document.getElementById('ap-t-' + c.dataset.i).content.cloneNode(true));
      dlg.showModal();
      dlg.scrollTop = 0;
    });
  });
  // gallery: thumbnails swap the main photo
  body.addEventListener('click', function (e) {
    var th = e.target.closest('.apd-th');
    if (!th) return;
    var fig = body.querySelector('.apd-main');
    fig.querySelector('img').src = th.dataset.src;
    fig.querySelector('img').alt = th.dataset.cap;
    fig.querySelector('figcaption').textContent = th.dataset.cap;
    body.querySelectorAll('.apd-th').forEach(function (t) { t.classList.toggle('on', t === th); });
  });
  dlg.querySelector('.ap-x').addEventListener('click', function () { dlg.close(); });
  dlg.addEventListener('close', function () { body.innerHTML = ''; });
  dlg.addEventListener('click', function (e) {
    var r = dlg.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dlg.close();
  });

  var t;
  window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(layout, 120); });
  function start() { busy = true; setTimeout(punch, 350); }
  if (img.complete && img.naturalWidth) start(); else img.addEventListener('load', start);
})();
