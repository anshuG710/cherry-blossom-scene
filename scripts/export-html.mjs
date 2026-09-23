import { build } from 'esbuild';
import { readFile, mkdir, writeFile } from 'node:fs/promises';

// Bundle as a classic script so the shared file can run from file:// without module requests.
const result = await build({
  entryPoints: ['src/main.js'], bundle: true, minify: true,
  format: 'iife', target: 'es2020', outfile: 'app.js', write: false,
  loader: { '.png': 'dataurl', '.jpg': 'dataurl', '.svg': 'dataurl', '.mp3': 'dataurl' },
});
const script = result.outputFiles.find(file => file.path.endsWith('.js')).text;
const css = result.outputFiles.find(file => file.path.endsWith('.css')).text
  .replace(/@import\s*(?:url\([^)]*\)|"[^"]*"|'[^']*');?/g, '');
let html = await readFile('index.html', 'utf8');
html = html.replace('</head>', () => `<style>${css}</style></head>`)
  .replace('<script type="module" src="/src/main.js"></script>',
    () => `<script>${script.replace(/<\/script/gi, '<\\/script')}</script>`)
  .replace('href="./"', 'href="#"');
await mkdir('share', { recursive: true });
await writeFile('share/Safe Place.html', html);
console.log(`Created share/Safe Place.html (${Math.round(Buffer.byteLength(html) / 1024)} KB).`);
