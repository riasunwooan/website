# riasunwooan.com

Static personal site. Currently contains only the Research section, shown as a vertical timeline.

- `index.html` — Home. `research/`, `art/`, `writing/` each hold an `index.html` for that page (served at /research, /art, /writing). Editing instructions are in comments inside each page.
- `assets/style.css` — styles.
- `CNAME` — custom domain (`riasunwooan.com`) for GitHub Pages.

## Hosting on GitHub Pages

1. Repo **Settings → Pages**: deploy from the branch containing these files, folder `/ (root)`.
2. Under **Custom domain**, confirm `riasunwooan.com` and enable **Enforce HTTPS**.
3. At your domain registrar, add DNS records:
   - `A` records for `@` → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - `CNAME` record for `www` → `riasunwooan.github.io`
