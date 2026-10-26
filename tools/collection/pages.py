# Writes the static page shells for /art/collection/. Run: python3 tools/collection/pages.py
# (Content is rendered in the browser by the matching /assets/collection/*.js module.)
import os
ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
V = '2'

NAV = '''  <nav>
    <a class="logo" href="/">Ria Sunwoo An</a>
    <ul class="nav-links">
      <li><a href="/">Home</a></li>
      <li><a href="/research/">Research</a></li>
      <li><a href="/work/">Work</a></li>
      <li><a aria-current="page" href="/art/">Art</a></li>
      <li><a href="/writing/">Writing</a></li>
      <li><a href="/pub/">Publications</a></li>
      <li><a href="/cv/">CV</a></li>
    </ul>
  </nav>'''

BAR = '''      <header class="cx-bar">
        <a class="cx-mark" href="/art/collection/">The Ria Collection</a>
        <ul class="cx-bar-links">
          <li><a href="/art/collection/#collection">Collection</a></li>
          <li><a href="/art/collection/#rooms">Rooms</a></li>
          <li><a href="/art/collection/timeline/">Timeline</a></li>
        </ul>
        <button type="button" class="cx-lightbtn" data-cx-theme aria-pressed="false"><span class="cx-beam" aria-hidden="true"></span><span class="cx-theme-label">Dim the lights</span><svg class="cx-torch" viewBox="0 0 28 14" aria-hidden="true"><rect x="10" y="4" width="17" height="6" rx="1.5" fill="currentColor"/><path d="M10 2.5 L4 1 L4 13 L10 11.5 Z" fill="currentColor"/><rect x="2" y="1.5" width="2" height="11" rx="1" class="cx-torch-lens"/></svg></button>
      </header>'''

def page(path, title, desc, body, script, canonical=None, noindex=False, bar=True):
    head = ['<!DOCTYPE html>', '<html lang="en">', '<head>',
            '  <meta charset="utf-8">',
            '  <meta name="viewport" content="width=device-width, initial-scale=1">',
            '  <title>%s</title>' % title,
            '  <meta name="description" content="%s">' % desc]
    if noindex:
        head.append('  <meta name="robots" content="noindex, nofollow">')
    if canonical:
        head.append('  <link rel="canonical" href="https://riasunwooan.com%s">' % canonical)
        head.append('  <meta property="og:title" content="%s">' % title)
        head.append('  <meta property="og:description" content="%s">' % desc)
    head += [
        '''  <script>try{var t=localStorage.getItem('cx-theme');if(t)document.documentElement.dataset.theme=t}catch(e){}</script>''',
        '  <link rel="preconnect" href="https://fonts.googleapis.com">',
        '  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
        '  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">',
        '  <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@600&text=%EC%95%88%EC%84%A0%EC%9A%B0%EB%B3%B5&display=swap" rel="stylesheet">',
        '  <link rel="stylesheet" href="/assets/style.css?v=116">',
        '  <link rel="stylesheet" href="/assets/collection/collection.css?v=%s">' % V,
        '</head>', '<body class="cx">', NAV, '',
        '  <main class="page cx-page" id="main">',
        '    <div class="cx-wrap">']
    if bar:
        head.append(BAR)
    tail = ['    </div>', '  </main>', '',
            '  <footer>', '    <span>© 2026 Ria Sunwoo An</span>', '  </footer>',
            '  <script type="module" src="/assets/collection/%s?v=%s"></script>' % (script, V),
            '</body>', '</html>', '']
    out = os.path.join(ROOT, path)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, 'w') as f:
        f.write('\n'.join(head) + '\n' + body.rstrip() + '\n' + '\n'.join(tail))

LOADING = '<p class="cx-loading" role="status">Opening the galleries…</p>'

page('art/collection/index.html', 'The Ria Collection — Through My Eyes — Ria Sunwoo An',
     'The Ria Collection: a personal museum and commonplace book of artworks I have loved, with their histories, my readings of them, and the worlds I keep returning to.',
     '''      <section class="cx-hero" aria-labelledby="cx-title">
        <p class="cx-label">Through My Eyes</p>
        <h1 class="cx-title" id="cx-title">The Ria Collection</h1>
        <div class="cx-hero-text">
          <p>A collection of artworks I have loved, questions I have carried, and worlds I keep returning to.</p>
          <p>Part museum, part commonplace book, part conversations with the artist, but everything me.</p>
          <p class="cx-hero-note">I&rsquo;m starting this after falling in love with contemplating about art, in hopes that I will continue to fall in love.</p>
          <button type="button" class="cx-choice" data-cx-choice aria-pressed="false"><svg class="cx-pouch" viewBox="0 0 60 64" aria-hidden="true"><defs><clipPath id="cx-pouch-hem"><path d="M15.5 44 L30 49 L44.5 44 L50 55 Q30 64 10 55 Z"/></clipPath></defs><g stroke="#3a2416" stroke-width="1.4" stroke-linejoin="round"><path d="M18 23 L4.5 42 Q6 58.5 30 60.5 Q54 58.5 55.5 42 L42 23 Z" fill="#a8383a"/><path d="M18.5 23 L15.5 44 L30 49 L44.5 44 L41.5 23 Z" fill="#f6d9cb"/><g clip-path="url(#cx-pouch-hem)" stroke="none"><rect x="8" y="40" width="11" height="26" fill="#f0d79a"/><rect x="19" y="40" width="10" height="26" fill="#a46ab5"/><rect x="29" y="40" width="10" height="26" fill="#d9566b"/><rect x="39" y="40" width="13" height="26" fill="#4f9ac2"/></g><path d="M15.5 44 L30 49 L44.5 44 L50 55 Q30 64 10 55 Z" fill="none"/><path d="M18 6 H42 L41.5 22 H18.5 Z" fill="#f6d9cb"/><path d="M18 6 L10 8.5 L18.5 22 Z M42 6 L50 8.5 L41.5 22 Z" fill="#a8383a"/><rect x="15" y="20.5" width="30" height="3.2" fill="#a8383a"/><rect x="27.2" y="19" width="5.6" height="6" rx="1" fill="#a8383a"/><path d="M32 24 L37 30 M33 23 L39 27.5" stroke-width="2.4" stroke-linecap="round"/><circle cx="30" cy="34.5" r="7.2" fill="#e7a33a"/></g><text x="30" y="38" text-anchor="middle" font-family="'Noto Serif KR', 'Nanum Myeongjo', serif" font-size="9" font-weight="600" fill="#6b2416">복</text></svg><span class="cx-choice-text"><span class="cx-choice-title">Curator’s Choice</span><span class="cx-choice-sub">Pieces I love, simply because</span></span></button>
        </div>
      </section>
      <div id="cx-home">
        %s
      </div>''' % LOADING, 'home.js', canonical='/art/collection/')

page('art/collection/work/index.html', 'Artwork — The Ria Collection — Ria Sunwoo An',
     'An entry in The Ria Collection: an artwork, its history, and a personal reading of it.',
     '      <div id="cx-work">\n        %s\n      </div>' % LOADING, 'work.js')

page('art/collection/room/index.html', 'Rooms — The Ria Collection — Ria Sunwoo An',
     'A curated room of The Ria Collection.',
     '      <div id="cx-room">\n        %s\n      </div>' % LOADING, 'room.js')

page('art/collection/exhibition/index.html', 'Exhibition — The Ria Collection — Ria Sunwoo An',
     'An exhibition from The Ria Collection.',
     '      <div id="cx-exhibition">\n        %s\n      </div>' % LOADING, 'exhibition.js')

page('art/collection/timeline/index.html', 'Timeline — The Ria Collection — Ria Sunwoo An',
     'An archive timeline of The Ria Collection: when each artwork found me, and each time I returned to it.',
     '      <div id="cx-timeline">\n        %s\n      </div>' % LOADING, 'timeline.js', canonical='/art/collection/timeline/')

page('art/collection/share/index.html', 'Shared entry — The Ria Collection',
     'A privately shared entry from The Ria Collection.',
     '      <div id="cx-work">\n        %s\n      </div>' % LOADING, 'share.js', noindex=True)

page('art/collection/admin/index.html', 'Dashboard — The Ria Collection',
     'Private dashboard for The Ria Collection.',
     '      <div id="cx-admin" class="cx-admin">\n        <p class="cx-loading" role="status">Opening the dashboard…</p>\n      </div>', 'admin.js', noindex=True, bar=False)
