// Flipbook: turns a list of page images into a book with 3D page turns.
// Wide screens show two-page spreads (the cover opens on the right); narrow screens show one page at a time.
// Markup: <div class="fb" data-pages="a.jpg,,b.jpg"> — an empty entry is a blank page.
(function () {
  Array.prototype.forEach.call(document.querySelectorAll('.fb'), init);

  function init(root) {
    var all = root.dataset.pages.split(',').map(function (s) { return s.trim(); });
    var real = all.filter(Boolean);
    var label = root.dataset.title || 'Book';
    var single = null, t = 0, startX = null;

    root.innerHTML =
      '<div class="fb-stage"><div class="fb-book"></div></div>' +
      '<div class="fb-bar">' +
        '<button class="fb-btn fb-prev" type="button" aria-label="Previous page">←</button>' +
        '<span class="fb-count" aria-live="polite"></span>' +
        '<button class="fb-btn fb-next" type="button" aria-label="Next page">→</button>' +
        '<button class="fb-btn fb-full" type="button" aria-label="Full screen">⤢</button>' +
      '</div>';
    var book = root.querySelector('.fb-book');
    var count = root.querySelector('.fb-count');
    var prev = root.querySelector('.fb-prev'), next = root.querySelector('.fb-next');
    root.setAttribute('role', 'region');
    root.setAttribute('aria-label', label + ' flipbook');
    root.tabIndex = 0;

    function face(src, side) {
      var f = '<div class="fb-face fb-' + side + '">';
      if (src) f += '<img src="' + src + '" alt="" draggable="false" decoding="async">';
      return f + '</div>';
    }

    // The page number (1-based, blanks skipped) of the current position, used to keep place across layouts.
    function pageAt() {
      if (single) return t + 1;
      var seq = all.slice(0, 2 * t + 1);
      for (var i = seq.length - 1; i >= 0; i--) if (seq[i]) return real.indexOf(seq[i]) + 1;
      return 1;
    }

    function build() {
      var want = window.matchMedia('(max-width: 720px)').matches;
      if (want === single) return;
      var page = single === null ? 1 : pageAt();
      single = want;
      root.classList.toggle('fb-single', single);
      var html = '';
      if (single) {
        real.forEach(function (src) { html += '<div class="fb-sheet">' + face(src, 'front') + face('', 'back') + '</div>'; });
        t = page - 1;
      } else {
        for (var i = 0; i < all.length; i += 2) html += '<div class="fb-sheet">' + face(all[i], 'front') + face(all[i + 1], 'back') + '</div>';
        var src = real[page - 1], idx = all.indexOf(src);
        t = idx <= 0 ? 0 : Math.ceil(idx / 2);
      }
      book.innerHTML = html;
      render(false);
    }

    function sheets() { return book.children; }
    function max() { return single ? sheets().length - 1 : sheets().length; }

    function render(animate) {
      var s = sheets(), n = s.length;
      book.classList.toggle('fb-still', !animate);
      for (var i = 0; i < n; i++) {
        var turned = i < t;
        s[i].classList.toggle('fb-turned', turned);
        s[i]._z = turned ? i + 1 : n - i;
        if (!s[i]._fb) s[i].style.zIndex = s[i]._z;
      }
      if (!single) {
        // Closed book: cover centred; finished book: back centred.
        book.style.transform = t === 0 ? 'translateX(-25%)' : t === n ? 'translateX(25%)' : '';
      }
      prev.disabled = t === 0;
      next.disabled = t >= max();
      count.textContent = describe();
      if (!animate) { void book.offsetWidth; book.classList.remove('fb-still'); }
    }

    function describe() {
      if (single) return (t === 0 ? 'Cover · ' : '') + (t + 1) + ' / ' + real.length;
      if (t === 0) return 'Cover';
      if (t === sheets().length) return 'The end';
      var nums = [all[2 * t - 1], all[2 * t]].filter(Boolean).map(function (s) { return real.indexOf(s) + 1; });
      return nums.join('–') + ' / ' + real.length;
    }

    function go(d) {
      var nt = Math.max(0, Math.min(max(), t + d));
      if (nt === t) return;
      // Keep the moving sheet on top while it turns.
      var moving = sheets()[d > 0 ? t : nt];
      t = nt;
      render(true);
      clearTimeout(moving._fb);
      moving.style.zIndex = 900 + t;
      moving._fb = setTimeout(function () { moving._fb = 0; moving.style.zIndex = moving._z; }, 750);
    }

    prev.addEventListener('click', function () { go(-1); });
    next.addEventListener('click', function () { go(1); });
    root.querySelector('.fb-full').addEventListener('click', function () {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (root.requestFullscreen) root.requestFullscreen();
    });

    // Tap the left or right side of the book to turn; swipe on touch screens.
    book.addEventListener('pointerdown', function (e) { startX = e.clientX; });
    book.addEventListener('pointerup', function (e) {
      if (startX === null) return;
      var dx = e.clientX - startX; startX = null;
      if (Math.abs(dx) > 40) return go(dx < 0 ? 1 : -1);
      var r = book.getBoundingClientRect();
      go(e.clientX - r.left > r.width / 2 ? 1 : -1);
    });
    root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { go(1); e.preventDefault(); }
      else if (e.key === 'ArrowLeft') { go(-1); e.preventDefault(); }
    });

    build();
    window.addEventListener('resize', build);
  }
})();
