/* ==========================================================================
   Zoom y desplazamiento del diagrama: rueda del ratón o pellizco para acercar,
   arrastrar para moverse. Se cambia el viewBox del SVG, así el dibujo sigue
   nítido y todo lo que usa coordenadas del SVG (tarjetas, efectos) se mantiene.
   ========================================================================== */

export interface Zoom {
  zoomBy(f: number, at?: [number, number]): void;
  reset(): void;
  /** Si el punto (coordenadas del SVG) quedó fuera de la vista, la centra en él. */
  ensureVisible(x: number, y: number): void;
}

const MAX = 4;
const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function enableZoom(svg: SVGSVGElement, host: HTMLElement, onChange: (scale: number) => void): Zoom {
  const [bx, by, bw, bh] = svg.getAttribute('viewBox')!.split(/[\s,]+/).map(Number);
  let v = { x: bx, y: by, w: bw, h: bh };
  let anim = 0;
  let wasDrag = false;

  const scale = () => bw / v.w;
  const clamp = (n: { x: number; y: number; w: number; h: number }) => {
    const w = Math.min(bw, Math.max(bw / MAX, n.w)), h = w * (bh / bw);
    // El centro de la vista no puede salir del diagrama
    const cx = Math.min(bx + bw - w / 2, Math.max(bx + w / 2, n.x + n.w / 2));
    const cy = Math.min(by + bh - h / 2, Math.max(by + h / 2, n.y + n.h / 2));
    return { x: cx - w / 2, y: cy - h / 2, w, h };
  };
  const set = (n: typeof v) => {
    v = clamp(n);
    svg.setAttribute('viewBox', `${v.x} ${v.y} ${v.w} ${v.h}`);
    host.classList.toggle('is-zoomed', scale() > 1.001);
    onChange(scale());
  };
  const tween = (to: typeof v) => {
    cancelAnimationFrame(anim);
    const from = { ...v }, end = clamp(to);
    if (reduce()) return set(end);
    const t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 260), e = 1 - Math.pow(1 - k, 3);
      set({ x: from.x + (end.x - from.x) * e, y: from.y + (end.y - from.y) * e, w: from.w + (end.w - from.w) * e, h: from.h + (end.h - from.h) * e });
      if (k < 1) anim = requestAnimationFrame(step);
    };
    anim = requestAnimationFrame(step);
  };
  /** Pantalla → coordenadas del SVG */
  const toSvg = (cx: number, cy: number): [number, number] => {
    const m = svg.getScreenCTM();
    if (!m) return [v.x + v.w / 2, v.y + v.h / 2];
    const p = new DOMPoint(cx, cy).matrixTransform(m.inverse());
    return [p.x, p.y];
  };
  /** Nueva vista ampliada f veces manteniendo fijo el punto p */
  const scaled = (f: number, p: [number, number]) => {
    const w = Math.min(bw, Math.max(bw / MAX, v.w / f)), r = w / v.w;
    return { x: p[0] - (p[0] - v.x) * r, y: p[1] - (p[1] - v.y) * r, w, h: v.h * r };
  };

  /* ---------- Rueda y pellizco del panel táctil ---------- */
  svg.addEventListener('wheel', e => {
    e.preventDefault();
    cancelAnimationFrame(anim);
    const d = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    set(scaled(Math.exp(-d * (e.ctrlKey ? .01 : .0018)), toSvg(e.clientX, e.clientY)));
  }, { passive: false });

  /* ---------- Arrastre y pellizco táctil ---------- */
  const pts = new Map<number, [number, number]>();
  let start: { x: number; y: number; dist: number; mid: [number, number]; v: typeof v } | null = null;
  const snapshot = () => {
    const a = [...pts.values()];
    const mid: [number, number] = a.length > 1 ? [(a[0][0] + a[1][0]) / 2, (a[0][1] + a[1][1]) / 2] : a[0];
    start = { x: mid[0], y: mid[1], dist: a.length > 1 ? Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]) : 0, mid: toSvg(...mid), v: { ...v } };
  };
  svg.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    pts.set(e.pointerId, [e.clientX, e.clientY]);
    wasDrag = false;
    snapshot();
  });
  svg.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId) || !start) return;
    pts.set(e.pointerId, [e.clientX, e.clientY]);
    const a = [...pts.values()];
    const mid = a.length > 1 ? [(a[0][0] + a[1][0]) / 2, (a[0][1] + a[1][1]) / 2] : a[0];
    const moved = Math.hypot(mid[0] - start.x, mid[1] - start.y);
    if (!wasDrag && moved < 5 && a.length < 2) return;
    if (!wasDrag) { wasDrag = true; svg.setPointerCapture(e.pointerId); host.classList.add('is-panning'); cancelAnimationFrame(anim); }
    const k = (svg.getScreenCTM()?.a ?? 1) * (v.w / start.v.w); // px de pantalla por unidad del SVG al iniciar
    let n = { ...start.v };
    if (a.length > 1 && start.dist > 0) {
      const f = Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]) / start.dist;
      const w = Math.min(bw, Math.max(bw / MAX, start.v.w / f)), r = w / start.v.w;
      n = { x: start.mid[0] - (start.mid[0] - start.v.x) * r, y: start.mid[1] - (start.mid[1] - start.v.y) * r, w, h: start.v.h * r };
    }
    const kk = k * (start.v.w / n.w);
    n.x -= (mid[0] - start.x) / kk; n.y -= (mid[1] - start.y) / kk;
    set(n);
  });
  const end = (e: PointerEvent) => {
    if (!pts.delete(e.pointerId)) return;
    if (pts.size) snapshot(); else { start = null; host.classList.remove('is-panning'); }
  };
  svg.addEventListener('pointerup', end);
  svg.addEventListener('pointercancel', end);
  // Un arrastre no debe contar como clic sobre un equipo
  svg.addEventListener('click', e => { if (wasDrag) { e.stopImmediatePropagation(); e.preventDefault(); wasDrag = false; } }, true);

  const center = (): [number, number] => [v.x + v.w / 2, v.y + v.h / 2];
  return {
    zoomBy: (f, at) => tween(scaled(f, at ?? center())),
    reset: () => tween({ x: bx, y: by, w: bw, h: bh }),
    ensureVisible(x, y) {
      if (scale() <= 1.001) return;
      const m = Math.min(v.w, v.h) * .12;
      if (x > v.x + m && x < v.x + v.w - m && y > v.y + m && y < v.y + v.h - m) return;
      tween({ ...v, x: x - v.w / 2, y: y - v.h / 2 });
    },
  };
}
