/* Genera las imágenes Open Graph (1200×630) en public/og/ con el Chrome instalado.
   Uso: npm run og   (variable opcional CHROME_PATH si Chrome está en otra ruta) */
import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { CONFIGS } from '../src/data/configs';
import { renderEnergized } from '../src/lib/render';
import { LOGO_PATHS, UNIVERSITY } from '../src/lib/brand';

const CHROME = process.env.CHROME_PATH
  ?? ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(existsSync);
if (!CHROME) throw new Error('No se encontró Chrome. Define CHROME_PATH.');

const sld = readFileSync('src/styles/sld.css', 'utf-8');
const hero = `data:image/webp;base64,${readFileSync('public/assets/hero-subestacion.webp').toString('base64')}`;
const pose = `data:image/webp;base64,${readFileSync('public/personaje/pose-2.webp').toString('base64')}`;
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

const CSS = `
:root{--ink:#0E0E0E;--primary:#7BEA6F;--primary-dark:#006E0E;--muted:#6F7A69;--border:#E5E2E1;--border-strong:#D6D3D1;--dot:#E5E7EB;
  --live:#1E9E18;--live-glow:#7BEA6F;--dead:#B9B4AF;--earth:#F5C400;--earth-dark:#9A7600;--fault:#E5484D;--arc:#FF8A00;--text-4:#A8A29E;--ease:ease}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;overflow:hidden;font-family:Poppins,system-ui,sans-serif;color:var(--ink);
  background:#FCF9F8 radial-gradient(circle,#E3E0DD 1.1px,transparent 1.3px) 0 0/22px 22px}
.og{position:relative;width:1200px;height:630px;display:grid;grid-template-columns:560px 1fr;gap:36px;padding:56px 56px 64px 64px}
.left{display:flex;flex-direction:column;min-width:0}
.brand{display:flex;align-items:center;gap:14px}
.brand svg{width:84px;height:56px}
.brand b{font-size:22px;font-weight:700;letter-spacing:-.01em}
.eyebrow{margin-top:44px;font-size:15px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
h1{margin-top:12px;font-size:58px;line-height:1.04;font-weight:700;letter-spacing:-.025em}
h1.sm{font-size:50px}
.sub{margin-top:20px;font-size:22px;line-height:1.4;color:#44403C}
.chips{display:flex;flex-wrap:wrap;gap:10px;margin-top:auto}
.chip{height:38px;padding:0 16px;border-radius:99px;border:1.5px solid var(--border-strong);background:#fff;display:flex;align-items:center;font-size:16px;font-weight:600}
.chip.on{background:var(--ink);color:#fff;border-color:var(--ink)}
.chip.lime{background:var(--primary);border-color:var(--primary)}
.right{position:relative;min-width:0}
.card{position:absolute;inset:0;background:#fff;border:1.5px solid var(--border);border-radius:28px;padding:30px;box-shadow:0 24px 50px -24px rgba(0,0,0,.25);display:grid;place-items:center}
.card svg{width:100%;height:100%}
.grid{position:absolute;inset:0;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr 1fr;gap:14px}
.grid .mini{background:#fff;border:1.5px solid var(--border);border-radius:16px;padding:10px}
.grid .mini svg{width:100%;height:100%}
.hero{position:absolute;right:-60px;bottom:-70px;width:740px;mix-blend-mode:multiply}
.pose{position:absolute;right:-12px;bottom:-64px;width:150px;filter:drop-shadow(0 12px 18px rgba(0,0,0,.2))}
.bar{position:absolute;left:0;right:0;bottom:0;height:12px;background:linear-gradient(90deg,var(--primary),#4FCB43)}
.foot{position:absolute;left:64px;bottom:26px;font-size:15px;color:var(--muted)}
${sld}`;

const logo = `<svg viewBox="140 318 985 654">${LOGO_PATHS}</svg>`;

function page(left: string, right: string) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>${CSS}</style></head><body><div class="og"><div class="left"><div class="brand">${logo}<b>SubestaLab</b></div>${left}</div>
<div class="right">${right}</div></div><div class="foot">${UNIVERSITY} · Subestaciones Eléctricas</div><div class="bar"></div></body></html>`;
}

const jobs: [string, string][] = [];

jobs.push(['home', page(
  `<p class="eyebrow">Maniobras de mantenimiento</p><h1>Maniobra una subestación, paso a paso.</h1>
   <p class="sub">10 configuraciones de barraje con simulación animada, modo práctica y asistente con IA.</p>
   <div class="chips"><span class="chip on">10 configuraciones</span><span class="chip">30 escenarios</span><span class="chip lime">Gratis</span></div>`,
  `<img class="hero" src="${hero}" alt="">`)]);

jobs.push(['configuraciones', page(
  `<p class="eyebrow">Elige una configuración</p><h1>Las 10 configuraciones de barraje</h1>
   <p class="sub">De la barra sencilla al anillo cruzado: mantenimiento de barras e interruptores y respuesta ante fallas.</p>
   <div class="chips"><span class="chip on">Conexión de barras</span><span class="chip">Conexión de interruptores</span></div>`,
  `<div class="grid">${CONFIGS.filter((_, i) => [0, 2, 5, 6, 7, 8].includes(i)).map(c => `<div class="mini">${renderEnergized(c.build(), { thumb: true })}</div>`).join('')}</div>`)]);

jobs.push(['laboratorio', page(
  `<p class="eyebrow">Modo interactivo</p><h1>Diseña y simula tu propia subestación</h1>
   <p class="sub">Arrastra barras, interruptores y seccionadores, conéctalos y mira la energización en vivo.</p>
   <div class="chips"><span class="chip on">Diseñar</span><span class="chip">Simular maniobras</span><span class="chip">Fallas</span></div>`,
  `<div class="card">${renderEnergized(CONFIGS[8].build(), { thumb: true })}</div><img class="pose" src="${pose}" alt="">`)]);

for (const c of CONFIGS) {
  jobs.push([c.slug, page(
    `<p class="eyebrow">Configuración ${String(c.n).padStart(2, '0')} · ${esc(c.trend)}</p><h1 class="${c.name.length > 28 ? 'sm' : ''}">${esc(c.name)}</h1>
     <p class="sub">${c.scenarios[0].short === 'Barra' ? 'Mantenimiento de barra e interruptor' : 'Salida de un circuito, mantenimiento de interruptor'} y respuesta ante una falla, paso a paso.</p>
     <div class="chips"><span class="chip on">${c.level}</span>${c.scenarios.map(s => `<span class="chip">${esc(s.short)}</span>`).join('')}</div>`,
    `<div class="card">${renderEnergized(c.build(), { thumb: true })}</div>`)]);
}

mkdirSync('public/og', { recursive: true });
const browser = await chromium.launch({ executablePath: CHROME });
const pg = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
for (const [name, html] of jobs) {
  await pg.setContent(html, { waitUntil: 'networkidle' });
  await pg.evaluate(() => document.fonts.ready);
  await pg.screenshot({ path: `public/og/${name}.png`, type: 'png' });
  console.log(`✓ public/og/${name}.png`);
}
await browser.close();
