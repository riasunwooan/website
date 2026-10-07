// Research timeline tag filter: single-select chips; hides non-matching cards and empty years/eras.
(function () {
  var chips = Array.prototype.slice.call(document.querySelectorAll('.rs-filters .wp-chip'));
  if (!chips.length) return;
  var all = document.querySelector('.rs-filters .wp-all');
  var cards = Array.prototype.slice.call(document.querySelectorAll('.timeline .card'));
  function apply(tag) {
    chips.forEach(function (c) { c.setAttribute('aria-pressed', String(tag ? c.dataset.tag === tag : c === all)); });
    cards.forEach(function (c) { c.hidden = !!tag && (c.dataset.tags || '').split('|').indexOf(tag) < 0; });
    document.querySelectorAll('.timeline .tl-year').forEach(function (y) {
      y.hidden = !y.querySelector('.card:not([hidden])');
    });
    document.querySelectorAll('.timeline .tl-era').forEach(function (e) {
      e.hidden = !e.querySelector('.tl-year:not([hidden])');
    });
  }
  chips.forEach(function (c) {
    c.addEventListener('click', function () {
      var on = c !== all && c.getAttribute('aria-pressed') !== 'true';
      apply(on ? c.dataset.tag : null);
    });
  });
})();
