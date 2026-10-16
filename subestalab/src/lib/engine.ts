/* ==========================================================================
   Motor eléctrico de SubestaLab.
   - solve(): qué nodos están energizados (E), desenergizados (D), puestos a
     tierra (T) o en falla (F), y qué cargas tienen servicio.
   - checkOperation(): consecuencia física de abrir/cerrar un equipo
     (maniobra segura, arco por operar un seccionador con carga, cortocircuito).
   ========================================================================== */
import { GND, type Model, type Switch } from './model';

export type NodeState = 'E' | 'D' | 'T' | 'F';

export interface SimState {
  /** Estado abierto/cerrado de cada equipo de maniobra. */
  open: Record<string, boolean>;
  /** Equipos bloqueados con candado (LOTO). */
  locked: string[];
  /** Interruptores con puestas a tierra temporales a ambos lados. */
  pat: string[];
  /** Nodos o cargas con falla activa (arco). */
  faults: string[];
  /** Interruptores que no abren (falla de interruptor). */
  stuck: string[];
  /** Interruptor que tiene transferidas las protecciones de un circuito. */
  prot: Record<string, string>;
  /** Interruptores de acople bloqueados en cerrado. */
  couplerLock: string[];
  /** Nodos en los que se verificó ausencia de tensión. */
  verified: string[];
  /** Interruptores disparados por protección (para etiqueta TRIP). */
  tripped: Record<string, string>;
  /** Líneas abiertas en el extremo remoto (dejan de ser fuente). */
  remoteOff: string[];
  handed: boolean;
}

export interface Solution {
  node: Record<string, NodeState>;
  served: Record<string, boolean>;
  comp: Record<string, number>;
}

export function initialState(m: Model): SimState {
  const open: Record<string, boolean> = {};
  for (const s of m.switches) open[s.id] = s.open;
  return { open, locked: [], pat: [], faults: [], stuck: [], prot: {}, couplerLock: [], verified: [], tripped: {}, remoteOff: [], handed: false };
}

export function cloneState(s: SimState): SimState {
  return JSON.parse(JSON.stringify(s));
}

/* ---------- Union-find ---------- */
class DSU {
  p = new Map<string, string>();
  find(x: string): string {
    if (!this.p.has(x)) this.p.set(x, x);
    let r = x;
    while (this.p.get(r) !== r) r = this.p.get(r)!;
    let c = x;
    while (this.p.get(c) !== r) { const n = this.p.get(c)!; this.p.set(c, r); c = n; }
    return r;
  }
  union(a: string, b: string) { const ra = this.find(a), rb = this.find(b); if (ra !== rb) this.p.set(ra, rb); }
}

export function allNodes(m: Model): string[] {
  const s = new Set<string>([GND]);
  m.buses.forEach(b => s.add(b.id));
  m.wires.forEach(w => s.add(w.n));
  m.switches.forEach(w => { s.add(w.a); s.add(w.b); });
  m.sources.forEach(w => s.add(w.n));
  m.loads.forEach(w => s.add(w.n));
  return [...s];
}

/** Construye la conectividad con un conjunto de equipos cerrados (opcionalmente forzando uno). */
function connectivity(m: Model, st: SimState, override?: { id: string; open: boolean }) {
  const d = new DSU();
  for (const n of allNodes(m)) d.find(n);
  for (const s of m.switches) {
    const isOpen = override && override.id === s.id ? override.open : st.open[s.id];
    if (!isOpen) d.union(s.a, s.b);
  }
  for (const id of st.pat) {
    const s = m.switches.find(x => x.id === id);
    if (s) { d.union(s.a, GND); d.union(s.b, GND); }
  }
  return d;
}

export function solveWith(m: Model, st: SimState, override?: { id: string; open: boolean }): Solution {
  const d = connectivity(m, st, override);
  const nodes = allNodes(m);
  const live = new Set(m.sources.filter(s => !st.remoteOff.includes(s.id)).map(s => d.find(s.n)));
  const gnd = d.find(GND);
  const faultNodes = new Set(st.faults.map(f => faultNode(m, f)));
  const node: Record<string, NodeState> = {};
  const comp: Record<string, number> = {};
  const ids = new Map<string, number>();
  for (const n of nodes) {
    const r = d.find(n);
    if (!ids.has(r)) ids.set(r, ids.size);
    comp[n] = ids.get(r)!;
    // Cortocircuito a tierra: toda la zona en falla. Falla puntual: sólo el nodo fallado.
    if (live.has(r) && r === gnd) node[n] = 'F';
    else if (live.has(r)) node[n] = faultNodes.has(n) ? 'F' : 'E';
    else if (r === gnd) node[n] = 'T';
    else node[n] = 'D';
  }
  const served: Record<string, boolean> = {};
  for (const l of m.loads) served[l.id] = node[l.n] === 'E' && !st.faults.includes(l.id);
  return { node, served, comp };
}

export const solve = (m: Model, st: SimState) => solveWith(m, st);

/** Una falla puede indicarse por id de carga, de línea o de nodo. */
export function faultNode(m: Model, f: string): string {
  return m.loads.find(x => x.id === f)?.n ?? m.sources.find(x => x.id === f)?.n ?? f;
}

/** ¿Instalar puestas a tierra temporales en este interruptor produciría un cortocircuito? */
export function checkPat(m: Model, st: SimState, brkId: string): Verdict {
  const s = m.switches.find(x => x.id === brkId);
  if (!s) return { level: 'ok' };
  const sol = solveWith(m, st);
  if (sol.node[s.a] === 'E' || sol.node[s.b] === 'E')
    return { level: 'short', msg: `Hay tensión en un lado de ${s.label}: instalar tierras portátiles provocaría un cortocircuito.` };
  if (!st.open[s.id]) return { level: 'warn', msg: `${s.label} debe estar abierto y aislado antes de instalar tierras.` };
  return { level: 'ok' };
}

/* ---------- Consecuencia de una maniobra ---------- */

export type Verdict =
  | { level: 'ok'; note?: string }
  | { level: 'warn'; msg: string }
  | { level: 'arc'; msg: string }      // seccionador operado con carga / diferencia de potencial
  | { level: 'short'; msg: string };   // cierre sobre tierra o falla

function sideHas(m: Model, sol: Solution, comp: number) {
  const nodes = Object.keys(sol.comp).filter(n => sol.comp[n] === comp);
  const set = new Set(nodes);
  return {
    source: m.sources.some(s => set.has(s.n)),
    load: m.loads.some(l => set.has(l.n)),
    gnd: set.has(GND),
    energized: nodes.some(n => sol.node[n] === 'E' || sol.node[n] === 'F'),
  };
}

export function checkOperation(m: Model, st: SimState, sw: Switch, toOpen: boolean): Verdict {
  if (st.locked.includes(sw.id)) return { level: 'warn', msg: `${sw.label} está bloqueado (LOTO). Retira el bloqueo antes de operarlo.` };
  if (st.couplerLock.includes(sw.id)) return { level: 'warn', msg: `${sw.label} está bloqueado en cerrado mientras se cambian circuitos de barra. Desbloquéalo primero.` };
  const before = solveWith(m, st);

  if (sw.kind === 'brk') {
    if (toOpen && st.stuck.includes(sw.id)) return { level: 'warn', msg: `${sw.label} no responde: falla de interruptor.` };
    if (!toOpen) {
      const after = solveWith(m, st, { id: sw.id, open: false });
      if (Object.values(after.node).includes('F') && !Object.values(before.node).includes('F'))
        return { level: 'short', msg: `Cerrar ${sw.label} une una zona energizada con una zona puesta a tierra o en falla: cortocircuito y disparo inmediato.` };
    }
    return { level: 'ok' };
  }

  if (sw.kind === 'earth') {
    if (!toOpen && before.node[sw.a] === 'E')
      return { level: 'short', msg: `¡Puesta a tierra cerrada con tensión! El tramo de ${sw.label} está energizado: cortocircuito franco a tierra.` };
    return { level: 'ok' };
  }

  // Seccionador
  if (toOpen) {
    const after = solveWith(m, st, { id: sw.id, open: true });
    if (after.comp[sw.a] === after.comp[sw.b]) return { level: 'ok', note: 'equipotencial' };
    const A = sideHas(m, after, after.comp[sw.a]);
    const B = sideHas(m, after, after.comp[sw.b]);
    const lostLoad = m.loads.some(l => before.served[l.id] && !after.served[l.id]);
    const splitSources = A.source && B.source && (before.node[sw.a] === 'E');
    if (lostLoad || splitSources)
      return { level: 'arc', msg: `${sw.label} se abrió con corriente circulando: un seccionador no puede interrumpir carga. Se forma un arco eléctrico.` };
    return { level: 'ok' };
  } else {
    if (before.comp[sw.a] === before.comp[sw.b]) return { level: 'ok', note: 'equipotencial' };
    const A = sideHas(m, before, before.comp[sw.a]);
    const B = sideHas(m, before, before.comp[sw.b]);
    if ((A.energized && B.gnd) || (B.energized && A.gnd))
      return { level: 'short', msg: `Cerrar ${sw.label} conecta una zona energizada con una zona puesta a tierra: cortocircuito.` };
    if (A.energized && B.energized)
      return { level: 'arc', msg: `Cerrar ${sw.label} une dos zonas energizadas que no están en paralelo: el seccionador cerraría con diferencia de potencial y se formaría un arco.` };
    if ((A.energized && B.load) || (B.energized && A.load))
      return { level: 'arc', msg: `Cerrar ${sw.label} energizaría una carga con un seccionador. Los circuitos siempre se energizan cerrando el interruptor.` };
    return { level: 'ok' };
  }
}

/** Distancia (saltos de equipo) de cada nodo a un conjunto de nodos, para animaciones en cascada. */
export function hopDistance(m: Model, from: string[]): Record<string, number> {
  const adj = new Map<string, string[]>();
  const add = (a: string, b: string) => { (adj.get(a) ?? adj.set(a, []).get(a)!).push(b); };
  for (const s of m.switches) { add(s.a, s.b); add(s.b, s.a); }
  const dist: Record<string, number> = {};
  const q = [...from];
  from.forEach(n => (dist[n] = 0));
  while (q.length) {
    const n = q.shift()!;
    for (const nb of adj.get(n) ?? []) if (dist[nb] === undefined) { dist[nb] = dist[n] + 1; q.push(nb); }
  }
  return dist;
}
