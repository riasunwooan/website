// Publications shelf: a book opens a panel; flipbooks load in an iframe only when opened.
(function () {
  var dlg = document.querySelector('.bk-dialog');
  if (!dlg) return;
  var body = dlg.querySelector('.bk-body');
  function open(id) {
    var t = document.getElementById('bk-' + id);
    if (!t) return;
    body.innerHTML = '';
    body.appendChild(t.content.cloneNode(true));
    var f = body.querySelector('.bkp-flip');
    if (f) {
      var fr = document.createElement('iframe');
      fr.src = f.dataset.src; fr.title = 'Flipbook'; fr.allowFullscreen = true; fr.setAttribute('allow', 'fullscreen');
      f.appendChild(fr);
    }
    dlg.showModal();
  }
  document.querySelectorAll('.bk').forEach(function (b) {
    b.addEventListener('click', function () { open(b.dataset.id); history.replaceState(null, '', '#' + b.dataset.id); });
  });
  dlg.querySelector('.bk-x').addEventListener('click', function () { dlg.close(); });
  dlg.addEventListener('click', function (e) {
    var r = dlg.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dlg.close();
  });
  dlg.addEventListener('close', function () { body.innerHTML = ''; history.replaceState(null, '', location.pathname); });
  var OLD = { 'loom-spring-2026': 'loom26s', 'loom-fall-2026': 'loom26f' };  // keep old links working
  if (location.hash) { var h = location.hash.slice(1); open(OLD[h] || h); }
})();
