/* ==========================================================================
   Plantillas de bahía reutilizadas por las 10 configuraciones.
   ========================================================================== */
import { Builder, GND, type ChainItem } from './model';

export type CircuitKind = 'line' | 'trafo';

const sgnOf = (ang: number) => {
  const a = ((ang % 360) + 360) % 360;
  if (a === 0) return { vertical: true, s: 1 };
  if (a === 180) return { vertical: true, s: -1 };
  if (a === 270) return { vertical: false, s: 1 };  // -90 → derecha
  return { vertical: false, s: -1 };                // 90 → izquierda
};

/**
 * Salida de un circuito a partir del nodo `n` en (x, y), en la dirección `ang`.
 * Dibuja el seccionador de línea 89-ID-L (salvo `noDisc`) y la cola:
 *  - línea: puesta a tierra 57, TP capacitivo, trampa de onda, DPS y flecha (fuente)
 *  - transformador: DPS y transformador con su carga MT
 * `lead` agrega un tramo de conductor antes del seccionador; `crossAt` dibuja ese
 * tramo por encima de una barra o conductor (halo) en la coordenada indicada.
 */
export function circuit(b: Builder, kind: CircuitKind, id: string, n: string, x: number, y: number, ang: number,
  o: { lead?: number; noDisc?: boolean; crossAt?: number; post?: number } = {}) {
  const { vertical, s } = sgnOf(ang);
  const P = (d: number): [number, number] => vertical ? [x, y + s * d] : [x + s * d, y];

  let d = 0;
  if (o.lead) {
    const pts = [P(0), P(o.lead)];
    if (o.crossAt !== undefined) {
      b.wireOver(n, ...pts);
      const c = o.crossAt;
      if (vertical) b.halo([x, c - 7], [x, c + 7]); else b.halo([c - 7, y], [c + 7, y]);
    } else b.wire(n, ...pts);
    d = o.lead;
  }
  let node = n;
  if (!o.noDisc) {
    const items: ChainItem[] = [{ k: 'disc', id: `89-${id}-L`, gap: 12, name: `Seccionador de línea 89-${id}-L`,
      ...(vertical && s < 0 ? { lx: -22 } : {}) }];
    const r = b.chain(node, ...P(d), ang, items);
    node = r.n;
    d += Builder.span(items);
  }
  if (o.post) { b.wire(node, P(d), P(d + o.post)); d += o.post; }

  if (kind === 'trafo') {
    const d1 = d + 14;
    b.wire(node, P(d), P(d1));
    shuntAt(b, 'dps', node, ...P(d1), vertical, -1, 'DPS');
    b.wire(node, P(d1), P(d1 + 18));
    b.load(id, node, ...P(d1 + 18), ang, id);
    return { node, end: d1 + 18 + 100 };
  }

  // Línea
  const d1 = d + 16;
  b.wire(node, P(d), P(d1));
  b.dot(node, ...P(d1));
  // 57
  const [ex, ey] = P(d1);
  if (vertical) {
    b.wire(node, [ex, ey], [ex + 36, ey], [ex + 36, ey + 8]);
    b.sw('earth', `57-${id}`, node, GND, ex + 36, ey + 22, 0, { open: true, label: `57-${id}`, lx: 22, ly: 6, name: `Puesta a tierra de línea 57-${id}` });
  } else {
    b.wire(node, [ex, ey], [ex, ey + 8]);
    b.sw('earth', `57-${id}`, node, GND, ex, ey + 22, 0, { open: true, label: `57-${id}`, lx: 22, ly: 6, name: `Puesta a tierra de línea 57-${id}` });
  }
  // TP capacitivo
  const d2 = vertical ? d1 : d1 + 52;
  if (!vertical) b.wire(node, P(d1), P(d2));
  shuntAt(b, 'vt', node, ...P(d2), vertical, -1, 'TP');
  // Trampa de onda (serie)
  const t0 = d2 + 14;
  b.wire(node, P(d2), P(t0));
  b.wire(node, P(t0), P(t0 + 32));
  b.deco('to', node, ...P(t0 + 16), ang, 'TO');
  // DPS
  const d3 = t0 + 32 + 16;
  b.wire(node, P(t0 + 32), P(d3));
  shuntAt(b, 'dps', node, ...P(d3), vertical, -1, 'DPS');
  b.source(id, node, ...P(d3), ang, 38, id);
  return { node, end: d3 + 60 };
}

/** TP o DPS en derivación: a un lado si la salida es vertical, colgando abajo si es horizontal. */
function shuntAt(b: Builder, kind: 'vt' | 'dps', n: string, x: number, y: number, vertical: boolean, side: 1 | -1, label: string) {
  b.dot(n, x, y);
  if (vertical) {
    const ex = x + 36 * side;
    b.wire(n, [x, y], [ex, y], [ex, y + 6]);
    b.deco(kind, n, ex, y + 26, 0, label);
  } else {
    b.wire(n, [x, y], [x, y + 6]);
    b.deco(kind, n, x, y + 26, 0, label);
  }
}

/** Puesta a tierra de barra (57-Bx) colgando del extremo izquierdo de la barra. */
export function busEarth(b: Builder, bus: string, x: number, y: number, dx = -40) {
  b.dot(bus, x, y);
  b.wire(bus, [x, y], [x + dx, y], [x + dx, y + 8]);
  b.sw('earth', `57-${bus}`, bus, GND, x + dx, y + 22, 0, { open: true, label: `57-${bus}`, lx: dx < 0 ? -24 : 22, ly: 6, name: `Puesta a tierra de la barra ${bus}` });
}

/**
 * Selectores de doble barra: seccionador desde B1 (izquierda, cruza B2) y desde B2
 * (derecha), unidos en un nodo de bahía bajo ellos. Devuelve el nodo y su y.
 */
export function selectors(b: Builder, id: string, x: number, yB1: number, yB2: number, cy: number, onBus: 0 | 1 | 2, dx = 18) {
  const xl = x - dx, xr = x + dx;
  b.dot('B1', xl, yB1);
  b.wireOver('B1', [xl, yB1], [xl, cy - 14]);
  b.halo([xl, yB2 - 8], [xl, yB2 + 8]);
  b.dot('B2', xr, yB2);
  b.wire('B2', [xr, yB2], [xr, cy - 14]);
  const j = b.node('j');
  b.sw('disc', `89-${id}-B1`, 'B1', j, xl, cy, 0, { open: onBus !== 1, label: `89-${id}-B1`, lx: -24, ly: -12, name: `Seccionador selector de B1 del circuito ${id}` });
  b.sw('disc', `89-${id}-B2`, 'B2', j, xr, cy, 0, { open: onBus !== 2, label: `89-${id}-B2`, lx: 22, ly: 12, name: `Seccionador selector de B2 del circuito ${id}` });
  const jy = cy + 26;
  b.wire(j, [xl, cy + 14], [xl, jy], [xr, jy], [xr, cy + 14]);
  b.wire(j, [x, jy], [x, jy + 2]);
  b.dot(j, x, jy);
  return { n: j, y: jy };
}

/** Acople de barras B1–B2: 89 – 52 – 89 dibujado en U. */
export function coupler(b: Builder, xl: number, xr: number, yB1: number, yB2: number, cy: number, yb: number, id = 'AC') {
  b.dot('B1', xl, yB1);
  b.wireOver('B1', [xl, yB1], [xl, cy - 14]);
  b.halo([xl, yB2 - 8], [xl, yB2 + 8]);
  b.dot('B2', xr, yB2);
  b.wire('B2', [xr, yB2], [xr, cy - 14]);
  const nl = b.node('ac'), nr = b.node('ac');
  b.sw('disc', `89-${id}-B1`, 'B1', nl, xl, cy, 0, { label: `89-${id}-B1`, lx: -24, ly: -12, name: `Seccionador del acople lado B1` });
  b.sw('disc', `89-${id}-B2`, 'B2', nr, xr, cy, 0, { label: `89-${id}-B2`, lx: 22, ly: 12, name: `Seccionador del acople lado B2` });
  const xm = (xl + xr) / 2;
  b.wire(nl, [xl, cy + 14], [xl, yb], [xm - 14, yb]);
  b.wire(nr, [xm + 14, yb], [xr, yb], [xr, cy + 14]);
  b.sw('brk', `52-${id}`, nl, nr, xm, yb, -90, { label: `52-${id}`, ly: 26, name: 'Interruptor de acople 52-AC' });
  b.text(xm, yb + 52, 'Acople', 'bay-lbl');
}
