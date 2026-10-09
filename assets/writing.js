// Writing page: draws the winding road through each piece's stop, and the medium filters.
(function () {
  var road = document.querySelector('.wp-road');
  if (!road) return;
  var svg = road.querySelector('.wp-svg'), track = road.querySelector('.wp-track');
  var items = Array.prototype.slice.call(road.querySelectorAll('.wp-item'));

  function draw() {
    var box = road.getBoundingClientRect();
    svg.setAttribute('width', box.width); svg.setAttribute('height', box.height);
    var pts = items.map(function (it) {
      var r = it.querySelector('.wp-stop').getBoundingClientRect();
      return [r.left + r.width / 2 - box.left, r.top + r.height / 2 - box.top];
    });
    if (!pts.length) return;
    var L = 6, E = box.width - 6, mid = box.width / 2;
    var single = pts.length > 1 && Math.abs(pts[1][0] - pts[0][0]) < 4;
    var d = single ? 'M' + pts[0][0] + ' ' + (pts[0][1] - 40) + ' V' + pts[0][1]
                   : 'M' + Math.max(0, pts[0][0] - 90) + ' ' + pts[0][1] + ' H' + pts[0][0];
    for (var i = 1; i < pts.length; i++) {
      var a = pts[i - 1], b = pts[i];
      if (Math.abs(b[1] - a[1]) < 4) { d += ' H' + b[0]; continue; }
      if (single) { d += ' V' + b[1]; continue; }
      var R = Math.min(40, (b[1] - a[1]) / 2);
      if (a[0] > mid) {
        d += ' H' + (E - R) + ' A' + R + ' ' + R + ' 0 0 1 ' + E + ' ' + (a[1] + R) +
             ' V' + (b[1] - R) + ' A' + R + ' ' + R + ' 0 0 1 ' + (E - R) + ' ' + b[1] + ' H' + b[0];
      } else {
        d += ' H' + (L + R) + ' A' + R + ' ' + R + ' 0 0 0 ' + L + ' ' + (a[1] + R) +
             ' V' + (b[1] - R) + ' A' + R + ' ' + R + ' 0 0 0 ' + (L + R) + ' ' + b[1] + ' H' + b[0];
      }
    }
    var last = pts[pts.length - 1];
    d += single ? ' V' + (last[1] + 30) : ' H' + (last[0] + (last[0] > mid ? 60 : -60));
    track.setAttribute('d', d);
  }

  // "More" on long blurbs
  items.forEach(function (it) {
    var b = it.querySelector('.wp-blurb'), btn = it.querySelector('.wp-more');
    if (!btn) return;
    if (b.scrollHeight > b.clientHeight + 4) {
      btn.hidden = false;
      btn.textContent = 'Read more ↓';
      btn.onclick = function () {
        var open = b.classList.toggle('open');
        btn.textContent = open ? 'Show less ↑' : 'Read more ↓';
        draw();
      };
    } else {
      b.classList.add('fits');
    }
  });

  // Filters: medium chips combine with OR; "Awarded" narrows further.
  var chips = Array.prototype.slice.call(document.querySelectorAll('.wp-chip[data-medium]'));
  var all = document.querySelector('.wp-all'), award = document.querySelector('.wp-award-chip'), rec = document.querySelector('.wp-rec-chip');
  function apply() {
    var on = chips.filter(function (c) { return c.getAttribute('aria-pressed') === 'true'; })
                  .map(function (c) { return c.dataset.medium; });
    var aw = award.getAttribute('aria-pressed') === 'true', rc = rec.getAttribute('aria-pressed') === 'true';
    all.setAttribute('aria-pressed', on.length || aw || rc ? 'false' : 'true');
    var any = on.length || aw || rc;
    road.classList.toggle('filtering', !!any);
    items.forEach(function (it) {
      var ok = (!on.length || on.indexOf(it.dataset.medium) > -1) && (!aw || it.dataset.awarded === '1') && (!rc || it.dataset.rec === '1');
      it.classList.toggle('lit', !!any && ok);
      it.classList.toggle('dim', !!any && !ok);
    });
  }
  chips.concat([award, rec]).forEach(function (c) {
    c.onclick = function () {
      var turningOn = c.getAttribute('aria-pressed') !== 'true';
      // one filter at a time: switching on one switches the others off
      chips.concat([award, rec]).forEach(function (o) { o.setAttribute('aria-pressed', 'false'); });
      c.setAttribute('aria-pressed', turningOn ? 'true' : 'false');
      apply();
      // jump to the newest piece that is now lit (the road runs newest → oldest)
      var first = road.querySelector('.wp-item.lit');
      if (turningOn && first) {
        var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        var y = first.getBoundingClientRect().top + window.pageYOffset - 24;
        window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
      }
    };
  });
  all.onclick = function () { chips.concat([award, rec]).forEach(function (c) { c.setAttribute('aria-pressed', 'false'); }); apply(); };

  draw();
  window.addEventListener('resize', draw);
  if (window.ResizeObserver) new ResizeObserver(draw).observe(road);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
})();
// Arriving via /writing/#piece: scroll to it and flash it
(function () {
  if (!location.hash) return;
  var el = document.getElementById(location.hash.slice(1));
  if (!el || !el.classList.contains('wp-item')) return;
  setTimeout(function () {
    el.scrollIntoView({ block: 'center' });
    el.classList.add('wp-flash');
    setTimeout(function () { el.classList.remove('wp-flash'); }, 2400);
  }, 300);
})();
