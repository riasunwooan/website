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
