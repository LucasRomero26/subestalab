/* ==========================================================================
   Efectos visuales sobre el diagrama (capa .layer-fx del SVG).
   ========================================================================== */
const NS = 'http://www.w3.org/2000/svg';
const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>, parent?: Element) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  parent?.appendChild(e);
  return e;
}

export const fxLayer = (svg: SVGSVGElement) => svg.querySelector<SVGGElement>('.layer-fx')!;

/** Rayo quebrado entre dos puntos. */
function boltPath(x1: number, y1: number, x2: number, y2: number, segs = 7, amp = 9) {
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
  let d = `M${x1} ${y1}`;
  for (let i = 1; i < segs; i++) {
    const t = i / segs, o = (Math.random() - .5) * 2 * amp;
    d += `L${(x1 + dx * t + nx * o).toFixed(1)} ${(y1 + dy * t + ny * o).toFixed(1)}`;
  }
  return d + `L${x2} ${y2}`;
}

/**
 * Arco eléctrico en (x, y). Si `ms` es 0 queda activo hasta llamar a la función que devuelve.
 * `ground` dibuja el arco hacia abajo (cortocircuito a tierra).
 */
export function arc(svg: SVGSVGElement, x: number, y: number, o: { ms?: number; size?: number; ground?: boolean } = {}) {
  const size = o.size ?? 26;
  const g = el('g', { class: 'arc', transform: `translate(${x} ${y})` }, fxLayer(svg));
  el('circle', { class: 'flash', r: size * 2.4 }, g);
  const glow = el('path', { class: 'bolt-glow', d: '' }, g);
  const hot = el('path', { class: 'bolt-hot', d: '' }, g);
  const core = el('path', { class: 'bolt-core', d: '' }, g);
  const ring = () => { const r = el('circle', { class: 'ring', r: size }, g); setTimeout(() => r.remove(), 700); };
  const embers = () => {
    for (let i = 0; i < 7; i++) {
      const a = Math.random() * Math.PI * 2, d = size * (1.2 + Math.random() * 1.6);
      const c = el('circle', { class: 'ember', r: 1.4 + Math.random() * 1.6, cx: 0, cy: 0 }, g);
      c.style.setProperty('--ex', `${Math.cos(a) * d}px`);
      c.style.setProperty('--ey', `${Math.sin(a) * d + (o.ground ? size : 0)}px`);
      setTimeout(() => c.remove(), 950);
    }
  };
  const draw = () => {
    const pts: [number, number, number, number][] = o.ground
      ? [[0, -size * .4, (Math.random() - .5) * 8, size * 1.3]]
      : [[-size * .7, -size * .5, size * .7, size * .5], [-size * .6, size * .4, size * .5, -size * .6]];
    const d = pts.map(p => boltPath(...p, 6, size * .28)).join(' ');
    glow.setAttribute('d', d); hot.setAttribute('d', d); core.setAttribute('d', d);
    g.setAttribute('opacity', String(.75 + Math.random() * .25));
  };
  draw(); ring(); embers();
  if (reduce()) { const t = setTimeout(() => g.remove(), o.ms || 1200); return () => { clearTimeout(t); g.remove(); }; }
  const iv = setInterval(draw, 55);
  const iv2 = setInterval(() => { ring(); embers(); }, 520);
  let done = false;
  const stop = () => { if (done) return; done = true; clearInterval(iv); clearInterval(iv2); g.style.transition = 'opacity .35s'; g.setAttribute('opacity', '0'); setTimeout(() => g.remove(), 380); };
  if (o.ms) setTimeout(stop, o.ms);
  return stop;
}

/** Chispa breve dentro de un interruptor que abre con corriente. */
export function spark(svg: SVGSVGElement, id: string) {
  const g = svg.querySelector(`.sw[data-id="${id}"]`);
  if (!g) return;
  g.classList.remove('go-spark');
  void (g as SVGGraphicsElement).getBBox();
  g.classList.add('go-spark');
  setTimeout(() => g.classList.remove('go-spark'), 650);
}

/** Etiqueta temporal o persistente sobre un punto (TRIP, medidor, aviso). */
export function tag(svg: SVGSVGElement, x: number, y: number, text: string, cls: string, ms = 0) {
  const w = Math.round(16 + text.length * 6.3);
  const g = el('g', { class: cls, transform: `translate(${x - w / 2} ${y - 11})` }, fxLayer(svg));
  el('rect', { width: w, height: 22, rx: 6 }, g);
  const t = el('text', { x: w / 2, y: 15 }, g);
  t.textContent = text;
  if (ms) setTimeout(() => { g.style.transition = 'opacity .4s'; g.setAttribute('opacity', '0'); setTimeout(() => g.remove(), 420); }, ms);
  return g;
}

/** Cinta de zona de trabajo (franjas amarillas y negras) alrededor de un rectángulo. */
export function zone(svg: SVGSVGElement, x: number, y: number, w: number, h: number) {
  const g = el('g', { class: 'zone' }, fxLayer(svg));
  el('rect', { x, y, width: w, height: h, rx: 10, class: 'zone-fill' }, g);
  el('rect', { x, y, width: w, height: h, rx: 10, class: 'zone-tape' }, g);
  el('rect', { x, y, width: w, height: h, rx: 10, class: 'zone-tape2' }, g);
  const t = el('g', { class: 'zone-lbl', transform: `translate(${x + 8} ${y - 9})` }, g);
  el('rect', { width: 132, height: 18, rx: 4 }, t);
  const tx = el('text', { x: 66, y: 13 }, t);
  tx.textContent = 'ZONA DE TRABAJO';
  return g;
}

/** Pulso que viaja por un conductor (p. ej. orden al extremo remoto o señal de protección). */
export function pulse(svg: SVGSVGElement, from: [number, number], to: [number, number], cls = 'pulse-dot', ms = 900) {
  const c = el('circle', { class: cls, r: 5, cx: from[0], cy: from[1] }, fxLayer(svg));
  if (reduce()) { setTimeout(() => c.remove(), 300); return; }
  const t0 = performance.now();
  const step = (t: number) => {
    const r = Math.min(1, (t - t0) / ms), k = r < .5 ? 2 * r * r : 1 - (-2 * r + 2) ** 2 / 2;
    c.setAttribute('opacity', String(1 - .7 * r));
    c.setAttribute('cx', String(from[0] + (to[0] - from[0]) * k));
    c.setAttribute('cy', String(from[1] + (to[1] - from[1]) * k));
    if (r < 1) requestAnimationFrame(step); else c.remove();
  };
  requestAnimationFrame(step);
}

export function clearFx(svg: SVGSVGElement) { fxLayer(svg).replaceChildren(); }

/** Sacudida del tablero (impacto de una falla). */
export function shake(target: HTMLElement) {
  if (reduce()) return;
  target.classList.remove('is-shaking');
  void target.offsetWidth;
  target.classList.add('is-shaking');
  setTimeout(() => target.classList.remove('is-shaking'), 600);
}
