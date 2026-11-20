// "How Art Does": a choose-your-own-adventure essay in a dialog.
// Path mode shows one step at a time; essay mode shows every path in order.
(function () {
  var dlg = document.getElementById('how-art-does-guide');
  if (!dlg) return;
  var src = dlg.querySelector('.cy-src'), stage = dlg.querySelector('.cy-stage'), trail = dlg.querySelector('.cy-trail');
  var steps = {};
  Array.prototype.forEach.call(src.querySelectorAll('section[data-step]'), function (s) { steps[s.dataset.step] = s; });
  var order = ['intro', 'q1', '1a', '1b', 'q2', '2a', '2b', 'q3', '3a', '3b', 'q4', 'q5'];
  var path = [], read = {}, round = 1;

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function btn(label, cls, fn) { var b = el('button', 'cy-btn' + (cls ? ' ' + cls : ''), label); b.type = 'button'; b.onclick = fn; return b; }
  function clone(id) { var c = steps[id].cloneNode(true); c.removeAttribute('data-step'); return c; }

  function drawTrail() {
    trail.innerHTML = '';
    trail.hidden = !path.length;
    path.forEach(function (p) { trail.appendChild(el('li', p.loop ? 'cy-loop' : '', p.text)); });
  }


  function show(id) {
    dlg.classList.remove('cy-essay');
    stage.innerHTML = '';
    var s = steps[id], node = clone(id), wrap = el('div', 'cy-page');
    if (s.dataset.q) {
      wrap.appendChild(el('p', 'cy-num', 'Question ' + s.dataset.q + (s.dataset.q === '1' && round > 1 ? ' · round ' + round : '')));
      wrap.appendChild(node);
      Array.prototype.forEach.call(node.querySelectorAll('[data-go]'), function (b) {
        var go = b.dataset.go;
        if (read[go]) b.appendChild(el('span', 'cy-read', 'read'));
        b.onclick = function () {
          if (s.dataset.q === '4') {
            path.push({ text: '4 · ' + b.dataset.pick + (go === 'q1' ? ' ↺' : ''), loop: go === 'q1' });
            if (go === 'q1') round++;
          } else {
            path.push({ text: steps[go].dataset.label });
          }
          drawTrail(); show(go);
        };
      });
      if (id === 'q5') {
        var row = el('div', 'cy-row');
        row.appendChild(btn('Start over', '', start));
        row.appendChild(btn('Read every path as one essay', 'cy-ghost', essay));
        wrap.appendChild(row);
      }
    } else if (id === 'intro') {
      wrap.appendChild(node);
      var r = el('div', 'cy-row');
      r.appendChild(btn('I’ve found an artwork. Begin →', '', function () { show('q1'); }));
      r.appendChild(btn('Read every path as one essay', 'cy-ghost', essay));
      wrap.appendChild(r);
    } else {
      read[id] = true;
      wrap.appendChild(el('p', 'cy-num', s.dataset.label));
      wrap.appendChild(node);
      var nx = s.dataset.next, r2 = el('div', 'cy-row');
      r2.appendChild(btn('Question ' + nx.slice(1) + ' →', '', function () { show(nx); }));
      wrap.appendChild(r2);
    }
    stage.appendChild(wrap);
    dlg.scrollTop = 0;
    var f = wrap.querySelector('[data-go], .cy-btn');
    if (f && f.focus) f.focus({ preventScroll: true });
  }

  function essay() {
    dlg.classList.add('cy-essay');
    path = []; drawTrail();
    stage.innerHTML = '';
    var wrap = el('div', 'cy-page');
    order.forEach(function (id) {
      var s = steps[id], node = clone(id);
      if (s.dataset.q) {
        wrap.appendChild(el('p', 'cy-num', 'Question ' + s.dataset.q));
        Array.prototype.forEach.call(node.querySelectorAll('.cy-choices'), function (c) {
          var list = el('p', 'cy-opts');
          list.textContent = Array.prototype.map.call(c.querySelectorAll('button'), function (b) {
            return b.textContent.replace(/^([A-C])\s*/, '$1. ').replace(/(Yes|No|Uncertain)\s*(Return|Proceed)/, '$1: $2');
          }).join('   ');
          c.parentNode.replaceChild(list, c);
        });
      } else if (s.dataset.label) {
        wrap.appendChild(el('p', 'cy-num cy-num-a', s.dataset.label));
      }
      wrap.appendChild(node);
    });
    var row = el('div', 'cy-row');
    row.appendChild(btn('Choose your own path instead', '', start));
    wrap.appendChild(row);
    stage.appendChild(wrap);
    dlg.scrollTop = 0;
  }

  function start() { path = []; read = {}; round = 1; drawTrail(); show('intro'); }

  function open(mode) {
    if (mode === 'essay') essay(); else start();
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    document.documentElement.classList.add('cy-lock');
    dlg.scrollTop = 0;
  }
  dlg.addEventListener('close', function () { document.documentElement.classList.remove('cy-lock'); });
  dlg.querySelector('.cy-x').onclick = function () { dlg.close(); };
  dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });

  Array.prototype.forEach.call(document.querySelectorAll('[data-cy]'), function (b) {
    b.addEventListener('click', function () { open(b.dataset.cy); });
  });
  if (location.hash === '#how-art-does-guide') open('path');
})();
