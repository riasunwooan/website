// Art project pages: Instagram post tabs + Instagram's embed script (only if a post is on the page).
(function () {
  if (!document.querySelector('.instagram-media')) return;
  var sc = document.createElement('script');
  sc.async = true; sc.src = 'https://www.instagram.com/embed.js';
  document.body.appendChild(sc);
  document.querySelectorAll('.art-ptab').forEach(function (t) {
    t.addEventListener('click', function () {
      document.querySelectorAll('.art-ptab').forEach(function (b) { b.setAttribute('aria-pressed', String(b === t)); });
      document.querySelectorAll('.art-embed').forEach(function (p) { p.hidden = p.dataset.k !== t.dataset.k; });
      if (window.instgrm) window.instgrm.Embeds.process();
    });
  });
})();
// Photo strips: arrow buttons scroll one photo at a time
document.querySelectorAll('.strip-wrap').forEach(function (w) {
  var s = w.querySelector('.strip'); if (!s) return;
  function step(d) { var li = s.querySelector('li'); s.scrollBy({ left: d * (li ? li.offsetWidth + 14 : 240), behavior: 'smooth' }); }
  var p = w.querySelector('.strip-prev'), n = w.querySelector('.strip-next');
  if (p) p.addEventListener('click', function () { step(-1); });
  if (n) n.addEventListener('click', function () { step(1); });
});
