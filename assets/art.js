// Art portfolio: cards burst out of the boxer's fist; tabs swap categories; cards open a chalk dialog.
(function () {
  var stage = document.querySelector('.ap-stage');
  if (!stage) return;
  var img = stage.querySelector('.ap-bg');
  var cards = Array.prototype.slice.call(stage.querySelectorAll('.ap-card'));
  var tabs = Array.prototype.slice.call(stage.querySelectorAll('.ap-tab'));
  var data = JSON.parse(document.getElementById('ap-data').textContent);
  var burst = document.createElement('span');
  burst.className = 'ap-burst';
  stage.appendChild(burst);
  var FIST = [0.83, 0.463]; // fist position as a fraction of the drawing

  function aimAtFist() {
    var W = stage.clientWidth, H = stage.clientHeight;
    var iw = img.naturalWidth || 2000, ih = img.naturalHeight || 1382;
    var s = Math.max(W / iw, H / ih);
    stage.style.setProperty('--fx', (FIST[0] * iw * s) + 'px');
    stage.style.setProperty('--fy', ((H - ih * s) / 2 + FIST[1] * ih * s) + 'px');
  }

  function show(cat) {
    tabs.forEach(function (t) { t.setAttribute('aria-pressed', String(t.dataset.cat === cat)); });
    cards.forEach(function (c) { c.hidden = c.dataset.cat !== cat; });
    aimAtFist();
    void stage.offsetWidth;
    requestAnimationFrame(function () {
      stage.classList.add('out');
      burst.classList.remove('go'); void burst.offsetWidth; burst.classList.add('go');
    });
  }

  tabs.forEach(function (t) {
    t.addEventListener('click', function () {
      if (t.getAttribute('aria-pressed') === 'true') return;
      stage.classList.remove('out');
      setTimeout(function () { show(t.dataset.cat); }, 420);
    });
  });

  var dlg = document.querySelector('.ap-dialog');
  cards.forEach(function (c) {
    c.addEventListener('click', function () {
      var d = data[+c.dataset.i];
      dlg.querySelector('.ap-d-doodle').innerHTML = d.doodle;
      dlg.querySelector('.ap-d-meta').textContent = d.meta + (d.soon ? ' · coming soon' : '');
      dlg.querySelector('.ap-d-title').textContent = d.title;
      dlg.querySelector('.ap-d-desc').textContent = d.desc;
      dlg.showModal();
    });
  });
  dlg.querySelector('.ap-x').addEventListener('click', function () { dlg.close(); });
  dlg.addEventListener('click', function (e) {
    var r = dlg.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dlg.close();
  });

  window.addEventListener('resize', aimAtFist);
  var first = tabs[0].dataset.cat;
  if (img.complete) setTimeout(function () { show(first); }, 250);
  else img.addEventListener('load', function () { show(first); });
})();
