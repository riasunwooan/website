// Lightbox for .lb-grid links: click to enlarge, arrows / swipe / Esc.
(function () {
  var all = Array.prototype.slice.call(document.querySelectorAll('.lb-grid a, a[data-lb]'));
  if (!all.length) return;
  // A .lb-grid with data-lb-group pages only through its own photos.
  function groupOf(a) { return a.closest('[data-lb-group]'); }
  var links = all;
  var i = 0, box = document.createElement('div');
  box.className = 'lb'; box.hidden = true;
  box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
  box.innerHTML = '<button class="lb-x" type="button" aria-label="Close">×</button>' +
    '<button class="lb-nav lb-prev" type="button" aria-label="Previous">‹</button>' +
    '<figure><img alt=""><figcaption></figcaption></figure>' +
    '<button class="lb-nav lb-next" type="button" aria-label="Next">›</button>';
  document.body.appendChild(box);
  var img = box.querySelector('img'), cap = box.querySelector('figcaption');
  function show(k) {
    i = (k + links.length) % links.length;
    img.src = links[i].href; var im = links[i].querySelector('img'); img.alt = im ? im.alt : '';
    cap.textContent = links[i].dataset.caption + '  ·  ' + (i + 1) + ' / ' + links.length;
  }
  function close() { box.hidden = true; document.body.style.overflow = ''; links[i].focus(); }
  all.forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var g = groupOf(a);
      links = all.filter(function (b) { return groupOf(b) === g; });
      show(links.indexOf(a)); box.hidden = false; document.body.style.overflow = 'hidden'; box.querySelector('.lb-x').focus(); });
  });
  box.querySelector('.lb-x').onclick = close;
  box.querySelector('.lb-prev').onclick = function () { show(i - 1); };
  box.querySelector('.lb-next').onclick = function () { show(i + 1); };
  box.addEventListener('click', function (e) { if (e.target === box) close(); });
  document.addEventListener('keydown', function (e) {
    if (box.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') show(i + 1);
    if (e.key === 'ArrowLeft') show(i - 1);
  });
  var x0 = null;
  img.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
  img.addEventListener('touchend', function (e) {
    if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0; x0 = null;
    if (Math.abs(dx) > 40) show(dx < 0 ? i + 1 : i - 1);
  });
})();
