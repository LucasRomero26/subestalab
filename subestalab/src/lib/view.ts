/* ==========================================================================
   Aplica el estado eléctrico calculado por el motor sobre el SVG renderizado.
   ========================================================================== */
import type { Model } from './model';
import { hopDistance, solve, type SimState, type Solution } from './engine';

export interface ApplyOpts {
  /** Equipos que acaban de cambiar: la recoloración se propaga en cascada desde ellos. */
  from?: string[];
  instant?: boolean;
}

let prev = new WeakMap<SVGSVGElement, Record<string, string>>();

export function applyState(svg: SVGSVGElement, m: Model, st: SimState, o: ApplyOpts = {}): Solution {
  const sol = solve(m, st);
  const last = prev.get(svg) ?? {};

  // Retardo en cascada (saltos de equipo desde los equipos operados)
  let dist: Record<string, number> = {};
  if (o.from?.length && !o.instant) {
    const start = o.from.flatMap(id => { const s = m.switches.find(x => x.id === id); return s ? [s.a, s.b] : [id]; });
    dist = hopDistance(m, start);
  }
  const delay = (n: string) => (o.instant || dist[n] === undefined ? 0 : Math.min(dist[n], 8) * 90);

  svg.querySelectorAll<SVGElement>('[data-n]').forEach(el => {
    const n = el.dataset.n!;
    const s = sol.node[n] ?? 'D';
    if (el.dataset.s !== s) {
      el.style.setProperty('--d', `${last[n] !== undefined && last[n] !== s ? delay(n) : 0}ms`);
      el.dataset.s = s;
    }
  });
  svg.querySelectorAll<SVGElement>('[data-deco-n]').forEach(el => { el.dataset.s = sol.node[el.dataset.decoN!] ?? 'D'; });
  svg.querySelectorAll<SVGElement>('[data-load]').forEach(el => { el.dataset.s = sol.served[el.dataset.load!] ? 'E' : 'D'; });

  for (const s of m.switches) {
    const g = svg.querySelector<SVGGElement>(`.sw[data-id="${s.id}"]`);
    g?.classList.toggle('is-open', !!st.open[s.id]);
    const ov = svg.querySelector<SVGGElement>(`.sw-over[data-over="${s.id}"]`);
    ov?.classList.toggle('is-locked', st.locked.includes(s.id) || st.couplerLock.includes(s.id));
    ov?.classList.toggle('has-pat', st.pat.includes(s.id));
    const ch = svg.querySelector<SVGGElement>(`[data-chip="${s.id}"]`);
    ch?.classList.toggle('tripped', !!st.tripped[s.id]);
  }

  prev.set(svg, { ...sol.node });
  return sol;
}

export function resetView(svg: SVGSVGElement) { prev.delete(svg); }

/** Centro de un elemento (equipo, barra, carga, fuente o nodo) en coordenadas del SVG. */
export function anchorOf(m: Model, id: string): [number, number] | null {
  const s = m.switches.find(x => x.id === id);
  if (s) return [s.x, s.y];
  const b = m.buses.find(x => x.id === id);
  if (b) return [(b.x1 + b.x2) / 2, b.y];
  const l = m.loads.find(x => x.id === id);
  if (l) return [l.x, l.y + Math.cos((l.rot * Math.PI) / 180) * 34];
  const src = m.sources.find(x => x.id === id);
  if (src) return [src.x, src.y];
  const w = m.wires.find(x => x.n === id);
  if (w) return w.pts[0];
  return null;
}
