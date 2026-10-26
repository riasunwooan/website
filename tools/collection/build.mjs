// Bundles the browser modules used by /art/collection/ into /assets/collection/vendor/.
// Run `npm install && npm run build` here after changing src/ or upgrading a dependency.
import { build } from 'esbuild';

const out = new URL('../../assets/collection/vendor/', import.meta.url).pathname;
await build({
  entryPoints: { supabase: 'src/supabase.js', editor: 'src/editor.js' },
  bundle: true,
  format: 'esm',
  minify: true,
  target: 'es2020',
  outdir: out,
  legalComments: 'none',
  logLevel: 'info',
});
