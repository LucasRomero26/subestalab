// Auditoría SEO y técnica del sitio compilado (dist/client). Uso: npm run audit (después de npm run build)
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';

const ROOT = join('dist', 'client');
const files = [];
const walk = d => readdirSync(d).forEach(f => { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : files.push(p); });
walk(ROOT);
const pages = files.filter(p => p.endsWith('.html')).sort();
const titles = new Map(), descs = new Map();
let fails = 0;
const bad = msg => { fails++; console.log(`  ✗ ${msg}`); };
const strip = s => s.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '');

for (const p of pages) {
  const html = readFileSync(p, 'utf-8');
  const body = strip(html);
  const rel = p.slice(ROOT.length).split(sep).join('/');
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1];
  const desc = html.match(/<meta name="description" content="([^"]*)"/)?.[1];
  const h1 = (body.match(/<h1[\s>]/g) ?? []).length;
  const words = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().split(' ').length;
  console.log(`${rel}\n  title: ${title} · H1: ${h1} · palabras en el HTML: ${words}`);
  if (!/<html[^>]*lang="es"/.test(html)) bad('sin lang="es"');
  if (!title) bad('sin <title>'); else titles.set(title, [...(titles.get(title) ?? []), rel]);
  if (!desc) bad('sin meta description'); else descs.set(desc, [...(descs.get(desc) ?? []), rel]);
  if (h1 !== 1) bad(`${h1} H1 (debe ser exactamente 1)`);
  const noindex = /<meta name="robots" content="noindex/.test(html);
  if (noindex) console.log('  (noindex: no se exigen canónica ni JSON-LD)');
  if (!noindex && !/<link rel="canonical" href="https?:\/\//.test(html)) bad('sin canonical absoluto');
  if (noindex && /<link rel="canonical"/.test(html)) bad('página noindex con canonical');
  if (!/<meta property="og:image" content="https?:\/\//.test(html)) bad('sin og:image absoluto');
  if (!/<meta property="og:title"/.test(html)) bad('sin og:title');
  if (!noindex && !/application\/ld\+json/.test(html)) bad('sin datos estructurados JSON-LD');
  for (const m of body.matchAll(/<img\b[^>]*>/g)) if (!/\balt=/.test(m[0])) bad(`img sin alt: ${m[0].slice(0, 90)}`);
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(m[1]); } catch { bad('JSON-LD inválido'); }
  }
}
for (const [t, ps] of titles) if (ps.length > 1) { fails++; console.log(`✗ title repetido "${t}": ${ps.join(', ')}`); }
for (const [, ps] of descs) if (ps.length > 1) { fails++; console.log(`✗ meta description repetida en: ${ps.join(', ')}`); }
for (const f of ['404.html', 'robots.txt', 'sitemap.xml', 'llms.txt']) if (!existsSync(join(ROOT, f))) { fails++; console.log(`✗ falta /${f}`); }
const maps = files.filter(p => p.endsWith('.map') || (/\.(js|css)$/.test(p) && /sourceMappingURL/.test(readFileSync(p, 'utf-8'))));
if (maps.length) { fails++; console.log(`✗ source maps expuestos: ${maps.join(', ')}`); } else console.log('✓ sin source maps en dist/client');
const ogs = new Set(pages.flatMap(p => [...readFileSync(p, 'utf-8').matchAll(/og:image" content="https?:\/\/[^/]+(\/[^"]+)"/g)].map(m => m[1])));
for (const og of ogs) if (!existsSync(join(ROOT, og))) { fails++; console.log(`✗ la imagen OG no existe: ${og}`); }
console.log(fails ? `\n${fails} problema(s)` : '\nTodo en orden.');
process.exit(fails ? 1 : 0);
