// Slide viewer: arrows, keyboard, swipe, dots and full screen.
document.querySelectorAll('.deck').forEach(function (deck) {
  var n = +deck.dataset.count, base = deck.dataset.base, i = 0;
  var img = deck.querySelector('.deck-img'), count = deck.querySelector('.deck-count');
  var dots = deck.querySelectorAll('.deck-dot');
  function src(k) { return base + String(k + 1).padStart(2, '0') + '.jpg?v=2'; }
  function go(k) {
    i = (k + n) % n;
    img.src = src(i);
    img.alt = 'Slide ' + (i + 1) + ' of ' + n;
    count.textContent = (i + 1) + ' / ' + n;
    dots.forEach(function (d, j) { d.setAttribute('aria-current', j === i ? 'true' : 'false'); });
    [i + 1, i - 1].forEach(function (k2) { if (k2 >= 0 && k2 < n) new Image().src = src(k2); });
  }
  deck.querySelector('.deck-prev').onclick = function () { go(i - 1); };
  deck.querySelector('.deck-next').onclick = function () { go(i + 1); };
  dots.forEach(function (d, j) { d.onclick = function () { go(j); }; });
  deck.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { go(i + 1); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { go(i - 1); e.preventDefault(); }
  });
  var x0 = null;
  img.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
  img.addEventListener('touchend', function (e) {
    if (x0 === null) return;
    var dx = e.changedTouches[0].clientX - x0; x0 = null;
    if (Math.abs(dx) > 40) go(dx < 0 ? i + 1 : i - 1);
  });
  deck.querySelector('.deck-full').onclick = function () {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (deck.requestFullscreen) deck.requestFullscreen();
    else if (deck.webkitRequestFullscreen) deck.webkitRequestFullscreen();
    deck.focus();
  };
  go(0);
});
