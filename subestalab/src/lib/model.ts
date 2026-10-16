/* ==========================================================================
   Modelo de diagrama unifilar.
   Un diagrama es un grafo: los NODOS son puntos eléctricamente iguales
   (una barra, un tramo de conductor) y los EQUIPOS de maniobra unen dos nodos.
   La geometría (wires, posiciones) sólo sirve para dibujar; el motor eléctrico
   trabaja con nodos y equipos.
   ========================================================================== */

export type Pt = [number, number];
export type SwKind = 'brk' | 'disc' | 'earth';
export type DecoKind = 'ct' | 'vt' | 'dps' | 'to';

/** Equipo de maniobra: interruptor 52, seccionador 89 o puesta a tierra 57. */
export interface Switch {
  id: string;
  kind: SwKind;
  /** Nodo del terminal "superior" (antes de rotar). */
  a: string;
  /** Nodo del terminal "inferior". Para 'earth' es siempre GND. */
  b: string;
  x: number;
  y: number;
  rot: number;
  /** Estado normal de operación. */
  open: boolean;
  label: string;
  /** Desplazamiento de la etiqueta respecto al centro del equipo. */
  lx: number;
  ly: number;
  /** Nombre largo para tarjetas y chat. */
  name: string;
}

/** Elemento pasivo dibujado sobre (o colgado de) un nodo. */
export interface Deco {
  kind: DecoKind;
  n: string;
  x: number;
  y: number;
  rot: number;
  label?: string;
}

export interface Bus {
  id: string;          // también es el id del nodo
  x1: number;
  x2: number;
  y: number;
  label: string;
  transfer?: boolean;  // barra de transferencia (hueca)
}

/** Línea de transmisión: FUENTE energizada desde el extremo remoto. */
export interface Source {
  id: string;          // L1, L2...
  n: string;
  x: number;
  y: number;
  rot: number;         // 0 = flecha hacia abajo
  len: number;
  label: string;
}

/** Transformador de potencia que alimenta una carga MT. */
export interface Load {
  id: string;          // T1, T2...
  n: string;
  x: number;
  y: number;
  rot: number;
  label: string;
}

export interface Wire {
  n: string;
  pts: Pt[];
  /** Conductor que cruza otra barra sin conectarse: se dibuja un hueco blanco. */
  over?: boolean;
}

export interface Halo { pts: Pt[] }

export interface Model {
  id: string;
  viewBox: [number, number, number, number];
  buses: Bus[];
  wires: Wire[];
  halos: Halo[];
  switches: Switch[];
  decos: Deco[];
  sources: Source[];
  loads: Load[];
  /** Nodos visibles (puntos negros de unión). */
  dots: { n: string; x: number; y: number }[];
  /** Etiquetas sueltas (nombres de bahía, nodos de anillo). */
  texts: { x: number; y: number; t: string; cls?: string; anchor?: 'start' | 'middle' | 'end' }[];
}

export const GND = 'GND';

const round = (n: number) => Math.round(n * 100) / 100;

/* ==========================================================================
   Constructor
   ========================================================================== */

export const HALF: Record<SwKind | DecoKind, number> = { brk: 14, disc: 14, earth: 14, ct: 10, to: 16, vt: 0, dps: 0 };

const SW_NAMES: Record<SwKind, string> = { brk: 'Interruptor', disc: 'Seccionador', earth: 'Seccionador de puesta a tierra' };

export type ChainItem =
  | { k: 'brk' | 'disc'; id: string; open?: boolean; label?: string; name?: string; lx?: number; ly?: number; gap?: number; to?: string }
  | { k: 'ct' | 'to'; gap?: number }
  | { k: 'gap'; len: number };

export class Builder {
  m: Model;
  private seq = 0;

  constructor(id: string, w: number, h: number) {
    this.m = { id, viewBox: [0, 0, w, h], buses: [], wires: [], halos: [], switches: [], decos: [], sources: [], loads: [], dots: [], texts: [] };
  }

  node(prefix = 'n'): string { return `${prefix}${++this.seq}`; }

  bus(id: string, x1: number, x2: number, y: number, label = id, transfer = false) {
    this.m.buses.push({ id, x1, x2, y, label, transfer });
    return this;
  }

  wire(n: string, ...pts: Pt[]) { this.m.wires.push({ n, pts }); return this; }

  /** Conductor que pasa por encima de una barra u otro conductor sin conectarse. */
  wireOver(n: string, ...pts: Pt[]) { this.m.wires.push({ n, pts, over: true }); return this; }

  halo(...pts: Pt[]) { this.m.halos.push({ pts }); return this; }

  dot(n: string, x: number, y: number) { this.m.dots.push({ n, x, y }); return this; }

  text(x: number, y: number, t: string, cls = 'lbl', anchor: 'start' | 'middle' | 'end' = 'middle') {
    this.m.texts.push({ x, y, t, cls, anchor }); return this;
  }

  sw(kind: SwKind, id: string, a: string, b: string, x: number, y: number, rot = 0,
     o: { open?: boolean; label?: string; name?: string; lx?: number; ly?: number } = {}) {
    const vertical = Math.abs(rot % 180) < 1;
    const label = o.label ?? id;
    this.m.switches.push({
      id, kind, a, b, x, y, rot, open: o.open ?? false, label,
      lx: o.lx ?? (vertical ? 20 : 0),
      ly: o.ly ?? (vertical ? 0 : -26),
      name: o.name ?? `${SW_NAMES[kind]} ${label}`,
    });
    return this;
  }

  deco(kind: DecoKind, n: string, x: number, y: number, rot = 0, label?: string) {
    this.m.decos.push({ kind, n, x, y, rot, label }); return this;
  }

  source(id: string, n: string, x: number, y: number, rot = 0, len = 34, label = id) {
    this.m.sources.push({ id, n, x, y, rot, len, label }); return this;
  }

  load(id: string, n: string, x: number, y: number, rot = 0, label = id) {
    this.m.loads.push({ id, n, x, y, rot, label }); return this;
  }

  /**
   * Cadena de equipos desde (x, y) en la dirección `ang` (0 = abajo, 180 = arriba,
   * -90 = derecha, 90 = izquierda), empezando en el nodo `n`. Cada equipo de
   * maniobra crea un nodo nuevo; TC y trampa de onda quedan sobre el conductor.
   */
  chain(n: string, x: number, y: number, ang: number, items: ChainItem[], gap = 10): { n: string; x: number; y: number } {
    const a = (ang * Math.PI) / 180;
    const ux = -Math.sin(a), uy = Math.cos(a);
    const at = (d: number): Pt => [round(x + ux * d), round(y + uy * d)];
    let d = 0;
    for (const it of items) {
      if (it.k === 'gap') { this.wire(n, at(d), at(d + it.len)); d += it.len; continue; }
      const g = it.gap ?? gap;
      const h = HALF[it.k];
      this.wire(n, at(d), at(d + g));
      const c = at(d + g + h);
      if (it.k === 'ct' || it.k === 'to') {
        this.wire(n, at(d + g), at(d + g + 2 * h));
        this.deco(it.k, n, c[0], c[1], ang);
      } else {
        const s = it as Extract<ChainItem, { id: string }>;
        const nb = s.to ?? this.node();
        this.sw(s.k, s.id, n, nb, c[0], c[1], ang, s);
        n = nb;
      }
      d += g + 2 * h;
    }
    const [ex, ey] = at(d);
    return { n, x: ex, y: ey };
  }

  /** Atajo: cadena vertical hacia abajo. */
  chainV(n: string, x: number, y: number, items: ChainItem[], gap = 10) { return this.chain(n, x, y, 0, items, gap); }

  /** Atajo: cadena horizontal hacia la derecha. */
  chainH(n: string, x: number, y: number, items: ChainItem[], gap = 10) { return this.chain(n, x, y, -90, items, gap); }

  /** Longitud que ocupa una cadena (para repartir huecos). */
  static span(items: ChainItem[], gap = 10) {
    return items.reduce((s, it) => s + (it.k === 'gap' ? it.len : (it.gap ?? gap) + 2 * HALF[it.k]), 0);
  }

  /** Puesta a tierra 57 colgando a la derecha de un punto del nodo n. */
  earth(id: string, n: string, x: number, y: number, side: 1 | -1 = 1, o: { label?: string; dx?: number } = {}) {
    const dx = (o.dx ?? 34) * side;
    this.wire(n, [x, y], [x + dx, y], [x + dx, y + 8]);
    this.dot(n, x, y);
    this.sw('earth', id, n, GND, x + dx, y + 22, 0, { open: true, label: o.label ?? id, lx: 20 * side, ly: 4, name: `Puesta a tierra ${o.label ?? id}` });
    return this;
  }

  /** Elemento en derivación (TP o DPS) a un lado del punto (x, y) del nodo n. */
  shunt(kind: 'vt' | 'dps', n: string, x: number, y: number, side: 1 | -1 = -1, dx = 30, label?: string) {
    const ex = x + dx * side;
    this.wire(n, [x, y], [ex, y], [ex, y + 6]);
    this.dot(n, x, y);
    this.deco(kind, n, ex, y + 26, 0, label);
    return this;
  }

  build(): Model { return this.m; }
}
