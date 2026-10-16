/* ==========================================================================
   Render de un Model a SVG (string). Se usa en el servidor (Astro) y en el
   cliente (modo interactivo). El estado eléctrico se aplica después en el
   cliente cambiando atributos data-s sobre las piezas con data-n.
   ========================================================================== */
import type { Model } from './model';
import { SYM, chip, place, pathD, r2 } from './symbols';
import { initialState, solve } from './engine';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

/** Render con el estado eléctrico normal ya aplicado (para HTML estático). */
export function renderEnergized(m: Model, opts: { title?: string; thumb?: boolean } = {}): string {
  const sol = solve(m, initialState(m));
  return renderModel(m, opts)
    .replace(/data-n="([^"]+)"/g, (all, n) => `${all} data-s="${sol.node[n] ?? 'D'}"`)
    .replace(/data-deco-n="([^"]+)"/g, (all, n) => `${all} data-s="${sol.node[n] ?? 'D'}"`)
    .replace(/data-load="([^"]+)"/g, (all, l) => `${all} data-s="${sol.served[l] ? 'E' : 'D'}"`);
}

export function renderModel(m: Model, opts: { title?: string; thumb?: boolean } = {}): string {
  const [vx, vy, vw, vh] = m.viewBox;
  const L = { hatch: [] as string[], bus: [] as string[], halo: [] as string[], wire: [] as string[], flow: [] as string[],
    deco: [] as string[], sw: [] as string[], src: [] as string[], dot: [] as string[], lbl: [] as string[], text: [] as string[] };

  for (const b of m.buses) {
    const d = pathD([[b.x1, b.y], [b.x2, b.y]]);
    L.hatch.push(`<path class="hatch bus-hatch" data-n="${b.id}" d="${d}"/>`);
    L.bus.push(b.transfer
      ? `<rect class="bus bus--t" data-n="${b.id}" data-bus="${b.id}" x="${b.x1}" y="${b.y - 4}" width="${b.x2 - b.x1}" height="8" rx="4"/>`
      : `<rect class="bus" data-n="${b.id}" data-bus="${b.id}" x="${b.x1}" y="${b.y - 5}" width="${b.x2 - b.x1}" height="10" rx="5"/>`);
    L.flow.push(`<path class="flow bus-flow" data-n="${b.id}" d="${d}"/>`);
    L.lbl.push(`<text class="bus-lbl" x="${b.x1 + 6}" y="${b.y - 11}">${esc(b.label)}</text>`);
    if (!opts.thumb) L.lbl.push(`<rect class="hit hit-bus" data-target="${b.id}" x="${b.x1}" y="${b.y - 12}" width="${b.x2 - b.x1}" height="24"/>`);
  }

  for (const h of m.halos) L.halo.push(`<path class="halo" d="${pathD(h.pts)}"/>`);

  // Orden: conductores normales → huecos blancos (halos) → conductores que pasan por encima.
  const over: string[] = [];
  for (const w of m.wires) {
    const d = pathD(w.pts);
    L.hatch.push(`<path class="hatch" data-n="${w.n}" d="${d}"/>`);
    (w.over ? over : L.wire).push(`<path class="w" data-n="${w.n}" d="${d}"/>`);
    L.flow.push(`<path class="flow" data-n="${w.n}" d="${d}"/>`);
  }

  for (const s of m.sources) {
    const len = s.len;
    const inner =
      `<path class="w" data-n="${s.n}" d="M0 0V${len}"/><path class="flow" data-n="${s.n}" d="M0 0V${len}"/>` +
      `<path class="arrow" data-n="${s.n}" d="M-6 ${len - 8}L0 ${len}L6 ${len - 8}"/>` +
      `<circle class="src-pulse" data-n="${s.n}" cy="${len}" r="6"/>` +
      (opts.thumb ? '' : `<rect class="hit" x="-14" y="4" width="28" height="${len + 6}" rx="6"/>`);
    L.src.push(place(inner, s.x, s.y, s.rot, ` class="src" data-src="${s.id}"`));
    // etiqueta en el extremo de la flecha
    const rad = (s.rot * Math.PI) / 180;
    const ex = s.x - Math.sin(rad) * (len + 16), ey = s.y + Math.cos(rad) * (len + 16);
    L.lbl.push(chip(ex, ey, s.label, 'chip--src'));
  }

  for (const l of m.loads) {
    const inner =
      `<path class="w" data-n="${l.n}" d="M0 0V12"/>` +
      place(SYM.trafo(l.n, l.id), 0, 34) +
      `<path class="w load-w" data-load="${l.id}" d="M0 56V78"/><path class="flow load-flow" data-load="${l.id}" d="M0 56V78"/>` +
      `<path class="arrow load-arrow" data-load="${l.id}" d="M-6 70L0 78L6 70"/>` +
      (opts.thumb ? '' : `<rect class="hit" x="-18" y="14" width="36" height="66" rx="8"/>`);
    L.src.push(place(inner, l.x, l.y, l.rot, ` class="load" data-load-g="${l.id}"`));
    const a = (l.rot * Math.PI) / 180;
    const at = (dx: number, dy: number): [number, number] => [l.x + dx * Math.cos(a) - dy * Math.sin(a), l.y + dx * Math.sin(a) + dy * Math.cos(a)];
    const [cx, cy] = at(30, 34);
    L.lbl.push(chip(cx + (Math.abs(Math.sin(a)) > .5 ? 0 : 6), cy, l.label, 'chip--load'));
    if (!opts.thumb) {
      const horiz = Math.abs(Math.sin(a)) > .5;
      const [mx, my] = horiz ? at(0, 76) : at(0, 96);
      L.lbl.push(`<g class="mt" data-load="${l.id}" transform="translate(${r2(mx)} ${r2(horiz ? my + 26 : my + 4)})">` +
        `<path class="bolt" d="M-34 -10l-5 8h4l-2 7 6-9h-4z"/><text class="mt-txt" x="6" text-anchor="middle">Carga MT</text></g>`);
    }
  }

  for (const d of m.decos) {
    let inner = '';
    if (d.kind === 'ct') inner = SYM.ct();
    else if (d.kind === 'to') inner = SYM.to(d.n);
    else if (d.kind === 'vt') inner = SYM.vt(d.n);
    else inner = SYM.dps(d.n);
    L.deco.push(place(inner, d.x, d.y, d.rot, ` class="deco deco-${d.kind}" data-deco-n="${d.n}"`));
    if (!opts.thumb) {
      const horiz = Math.abs(d.rot % 180) > 1;
      const name = d.label ?? (d.kind === 'ct' ? 'TC' : d.kind.toUpperCase());
      const [tx, ty, anchor] = (d.kind === 'ct' || d.kind === 'to')
        ? (horiz ? [d.x, d.y - 15, 'middle'] : [d.x + 15, d.y + 4, 'start'])
        : [d.x + 12, d.y + 2, 'start'];
      L.lbl.push(`<text class="deco-lbl" x="${r2(tx as number)}" y="${r2(ty as number)}" text-anchor="${anchor}">${name}</text>`);
    }
  }

  for (const s of m.switches) {
    const inner = s.kind === 'brk' ? SYM.brk(s.a, s.b) : s.kind === 'disc' ? SYM.disc(s.a, s.b) : SYM.earth(s.a);
    const cls = `sw sw-${s.kind}${s.open ? ' is-open' : ''}`;
    const hit = opts.thumb ? '' : `<rect class="hit" x="-20" y="-20" width="40" height="40" rx="8"/>`;
    const ring = `<rect class="focus-ring" x="-21" y="-21" width="42" height="42" rx="10"/>`;
    const lock = `<g class="lock-ico" transform="translate(-24 -16) scale(.8)">${SYM.lock()}</g>`;
    const pat = s.kind === 'brk' ? `<g class="pat-ico" transform="translate(14 -26)">${SYM.pat()}</g><g class="pat-ico" transform="translate(14 22)">${SYM.pat()}</g>` : '';
    L.sw.push(place(ring + inner + hit, s.x, s.y, s.rot, ` class="${cls}" data-id="${s.id}" data-kind="${s.kind}" data-target="${s.id}" role="button" tabindex="-1" aria-label="${esc(s.name)}"`));
    L.sw.push(place(lock + pat, s.x, s.y, 0, ` class="sw-over" data-over="${s.id}"`));
    if (!opts.thumb) L.lbl.push(chip(s.x + s.lx + (s.lx > 0 ? s.label.length * 3.2 + 4 : s.lx < 0 ? -(s.label.length * 3.2 + 4) : 0), s.y + s.ly, s.label, `chip--sw" data-chip="${s.id}`));
  }

  for (const d of m.dots) L.dot.push(`<circle class="node-dot" data-n="${d.n}" cx="${r2(d.x)}" cy="${r2(d.y)}" r="3.6"/>`);
  for (const t of m.texts) L.text.push(`<text class="${t.cls ?? 'lbl'}" x="${t.x}" y="${t.y}" text-anchor="${t.anchor ?? 'middle'}">${esc(t.t)}</text>`);

  const title = opts.title ? `<title>${esc(opts.title)}</title>` : '';
  const defs = `<defs><pattern id="sl-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">` +
    `<rect width="6" height="6" fill="#FFE27A"/><line x1="0" y1="0" x2="0" y2="6" stroke="#C99700" stroke-width="2.4"/></pattern></defs>`;
  return `<svg class="sld${opts.thumb ? ' sld--thumb' : ''}" viewBox="${vx} ${vy} ${vw} ${vh}" role="img" xmlns="http://www.w3.org/2000/svg">${title}${defs}` +
    `<g class="layer-hatch">${L.hatch.join('')}</g>` +
    `<g class="layer-bus">${L.bus.join('')}</g>` +
    `<g class="layer-wire">${L.wire.join('')}${L.halo.join('')}${over.join('')}</g>` +
    `<g class="layer-flow">${L.flow.join('')}</g>` +
    `<g class="layer-deco">${L.deco.join('')}</g>` +
    `<g class="layer-src">${L.src.join('')}</g>` +
    `<g class="layer-sw">${L.sw.join('')}</g>` +
    `<g class="layer-dot">${L.dot.join('')}</g>` +
    (opts.thumb ? '' : `<g class="layer-lbl">${L.lbl.join('')}${L.text.join('')}</g>`) +
    `<g class="layer-fx"></g>` +
    `</svg>`;
}
