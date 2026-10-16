/* ==========================================================================
   Diagramas unifilares de las 10 configuraciones (modelo de la app).
   Nomenclatura y estado normal: conocimiento/SubestaLab_Base_Conocimiento.md §6–§7
   ========================================================================== */
import { Builder, type Model } from '../lib/model';
import { busEarth, circuit, coupler, selectors, type CircuitKind } from '../lib/bays';

type Bay = [id: string, kind: CircuitKind, x: number];

/* 1. Barra sencilla ------------------------------------------------------- */
export function barraSencilla(): Model {
  const b = new Builder('barra-sencilla', 1000, 440);
  const yB = 90;
  b.bus('B1', 170, 900, yB);
  busEarth(b, 'B1', 170, yB, -54);
  const bays: Bay[] = [['L1', 'line', 320], ['L2', 'line', 550], ['T1', 'trafo', 780]];
  for (const [id, kind, x] of bays) {
    b.dot('B1', x, yB);
    const r = b.chainV('B1', x, yB, [
      { k: 'disc', id: `89-${id}-B`, gap: 16, name: `Seccionador de barra 89-${id}-B` },
      { k: 'brk', id: `52-${id}`, gap: 18, name: `Interruptor 52-${id}` },
      { k: 'ct', gap: 6 },
    ]);
    circuit(b, kind, id, r.n, x, r.y, 0);
  }
  return b.build();
}

/* 2. Barra principal + barra de transferencia ----------------------------- */
export function barraTransferencia(): Model {
  const b = new Builder('barra-principal-transferencia', 1000, 560);
  const yB = 80, yT = 330;
  b.bus('B1', 150, 900, yB, 'B1');
  b.bus('BT', 150, 900, yT, 'BT', true);
  busEarth(b, 'B1', 150, yB, -50);
  const bays: Bay[] = [['L1', 'line', 270], ['L2', 'line', 470], ['T1', 'trafo', 670]];
  for (const [id, kind, x] of bays) {
    b.dot('B1', x, yB);
    const r = b.chainV('B1', x, yB, [
      { k: 'disc', id: `89-${id}-B`, gap: 16, name: `Seccionador de barra 89-${id}-B` },
      { k: 'brk', id: `52-${id}`, gap: 16, name: `Interruptor 52-${id}` },
      { k: 'ct', gap: 6 },
      { k: 'disc', id: `89-${id}-L`, gap: 12, name: `Seccionador de línea 89-${id}-L` },
    ]);
    // Seccionador de transferencia: del lado del circuito a la BT
    const yj = r.y + 12, xt = x + 46;
    b.wire(r.n, [x, r.y], [x, yj]);
    b.dot(r.n, x, yj);
    b.wire(r.n, [x, yj], [xt, yj], [xt, yj + 14]);
    b.sw('disc', `89-${id}-T`, r.n, 'BT', xt, yj + 28, 0, { open: true, label: `89-${id}-T`, name: `Seccionador de transferencia 89-${id}-T` });
    b.wire('BT', [xt, yj + 42], [xt, yT]);
    b.dot('BT', xt, yT);
    circuit(b, kind, id, r.n, x, yj, 0, { noDisc: true, lead: yT + 22 - yj, crossAt: yT });
  }
  // Bahía de transferencia
  const xr = 850;
  b.dot('B1', xr, yB);
  const r = b.chainV('B1', xr, yB, [
    { k: 'disc', id: '89-TR-B', gap: 16, open: true, name: 'Seccionador del campo de transferencia, lado barra principal' },
    { k: 'brk', id: '52-TR', gap: 34, open: true, name: 'Interruptor de transferencia 52-TR' },
    { k: 'disc', id: '89-TR-T', gap: 30, open: true, to: 'BT', name: 'Seccionador del campo de transferencia, lado BT' },
  ]);
  b.wire('BT', [xr, r.y], [xr, yT]);
  b.dot('BT', xr, yT);
  b.text(xr, yT + 30, 'Transferencia', 'bay-lbl');
  return b.build();
}

/* Bahía de doble barra: selectores + interruptor (+ extras por variante) */
function dbBay(b: Builder, id: string, _kind: CircuitKind, x: number, onBus: 1 | 2, yB1: number, yB2: number) {
  const s = selectors(b, id, x, yB1, yB2, 160, onBus);
  return { s, y0: s.y + 2 };
}

/* 3. Doble barra ---------------------------------------------------------- */
export function dobleBarra(): Model {
  const b = new Builder('doble-barra', 1000, 480);
  const y1 = 70, y2 = 112;
  b.bus('B1', 160, 920, y1);
  b.bus('B2', 160, 920, y2);
  busEarth(b, 'B1', 160, y1, -62);
  busEarth(b, 'B2', 160, y2, -26);
  const bays: [string, CircuitKind, number, 1 | 2][] = [['L1', 'line', 280, 1], ['L2', 'line', 490, 2], ['T1', 'trafo', 700, 1]];
  for (const [id, kind, x, on] of bays) {
    const { s, y0 } = dbBay(b, id, kind, x, on, y1, y2);
    const r = b.chainV(s.n, x, y0, [{ k: 'brk', id: `52-${id}`, gap: 16, name: `Interruptor 52-${id}` }, { k: 'ct', gap: 6 }]);
    circuit(b, kind, id, r.n, x, r.y, 0);
  }
  coupler(b, 836, 896, y1, y2, 160, 206);
  return b.build();
}

/* 4. Doble barra + seccionador de by-pass --------------------------------- */
export function dobleBarraBypass(): Model {
  const b = new Builder('doble-barra-bypass', 1000, 570);
  const y1 = 70, y2 = 112;
  b.bus('B1', 150, 930, y1);
  b.bus('B2', 150, 930, y2);
  busEarth(b, 'B1', 150, y1, -62);
  busEarth(b, 'B2', 150, y2, -26);
  const bays: [string, CircuitKind, number, 1 | 2][] = [['L1', 'line', 260, 1], ['L2', 'line', 480, 1], ['T1', 'trafo', 700, 2]];
  for (const [id, kind, x, on] of bays) {
    const { s, y0 } = dbBay(b, id, kind, x, on, y1, y2);
    const r = b.chainV(s.n, x, y0, [
      { k: 'disc', id: `89-${id}-I`, gap: 14, name: `Seccionador del interruptor 89-${id}-I` },
      { k: 'brk', id: `52-${id}`, gap: 14, name: `Interruptor 52-${id}` },
      { k: 'ct', gap: 6 },
      { k: 'disc', id: `89-${id}-L`, gap: 12, name: `Seccionador de línea 89-${id}-L` },
    ]);
    // By-pass: del nodo de bahía al nodo de línea, en paralelo con 89-I, 52 y 89-L
    const yl = r.y + 14, xb = x + 58, xr = x + 18;
    b.wire(s.n, [xr, s.y], [xb, s.y], [xb, (s.y + yl) / 2 - 14]);
    b.sw('disc', `89-${id}-BP`, s.n, r.n, xb, (s.y + yl) / 2, 0, { open: true, label: `89-${id}-BP`, name: `Seccionador de by-pass 89-${id}-BP` });
    b.wire(r.n, [xb, (s.y + yl) / 2 + 14], [xb, yl], [x, yl]);
    b.wire(r.n, [x, r.y], [x, yl]);
    b.dot(r.n, x, yl);
    circuit(b, kind, id, r.n, x, yl, 0, { noDisc: true });
  }
  coupler(b, 846, 906, y1, y2, 160, 206);
  return b.build();
}

/* 5. Doble barra + seccionador de transferencia --------------------------- */
export function dobleBarraSecTransferencia(): Model {
  const b = new Builder('doble-barra-seccionador-transferencia', 1000, 500);
  const y1 = 70, y2 = 112;
  b.bus('B1', 150, 930, y1);
  b.bus('B2', 150, 930, y2);
  busEarth(b, 'B1', 150, y1, -62);
  busEarth(b, 'B2', 150, y2, -26);
  const bays: [string, CircuitKind, number, 1 | 2][] = [['L1', 'line', 260, 1], ['L2', 'line', 480, 2], ['T1', 'trafo', 700, 1]];
  for (const [id, kind, x, on] of bays) {
    const { s, y0 } = dbBay(b, id, kind, x, on, y1, y2);
    const r = b.chainV(s.n, x, y0, [
      { k: 'brk', id: `52-${id}`, gap: 16, name: `Interruptor 52-${id}` },
      { k: 'ct', gap: 6 },
      { k: 'disc', id: `89-${id}-L`, gap: 12, name: `Seccionador de línea 89-${id}-L` },
    ]);
    // Seccionador de transferencia: de B2 directo al lado de la línea
    const xt = x + 60, yl = r.y + 14;
    b.dot('B2', xt, y2);
    b.wire('B2', [xt, y2], [xt, 206]);
    b.sw('disc', `89-${id}-T`, 'B2', r.n, xt, 220, 0, { open: true, label: `89-${id}-T`, name: `Seccionador de transferencia 89-${id}-T` });
    b.wire(r.n, [xt, 234], [xt, yl], [x, yl]);
    b.wire(r.n, [x, r.y], [x, yl]);
    b.dot(r.n, x, yl);
    circuit(b, kind, id, r.n, x, yl, 0, { noDisc: true });
  }
  coupler(b, 846, 906, y1, y2, 160, 206);
  return b.build();
}

/* 6. Doble barra + barra de transferencia --------------------------------- */
export function dobleBarraTransferencia(): Model {
  const b = new Builder('doble-barra-barra-transferencia', 1040, 600);
  const y1 = 70, y2 = 112, yT = 380;
  b.bus('B1', 140, 980, y1);
  b.bus('B2', 140, 980, y2);
  b.bus('BT', 140, 980, yT, 'BT', true);
  busEarth(b, 'B1', 140, y1, -62);
  busEarth(b, 'B2', 140, y2, -26);
  const bays: [string, CircuitKind, number, 1 | 2][] = [['L1', 'line', 250, 1], ['L2', 'line', 440, 2], ['T1', 'trafo', 630, 1]];
  for (const [id, kind, x, on] of bays) {
    const { s, y0 } = dbBay(b, id, kind, x, on, y1, y2);
    const r = b.chainV(s.n, x, y0, [
      { k: 'brk', id: `52-${id}`, gap: 16, name: `Interruptor 52-${id}` },
      { k: 'ct', gap: 6 },
      { k: 'disc', id: `89-${id}-L`, gap: 12, name: `Seccionador de línea 89-${id}-L` },
    ]);
    const yj = r.y + 12, xt = x + 46;
    b.wire(r.n, [x, r.y], [x, yj]);
    b.dot(r.n, x, yj);
    b.wire(r.n, [x, yj], [xt, yj], [xt, yj + 14]);
    b.sw('disc', `89-${id}-T`, r.n, 'BT', xt, yj + 28, 0, { open: true, label: `89-${id}-T`, name: `Seccionador de transferencia 89-${id}-T` });
    b.wire('BT', [xt, yj + 42], [xt, yT]);
    b.dot('BT', xt, yT);
    circuit(b, kind, id, r.n, x, yj, 0, { noDisc: true, lead: yT + 22 - yj, crossAt: yT });
  }
  coupler(b, 720, 780, y1, y2, 160, 206);
  // Bahía de transferencia: selectores a B1/B2 → 52-TR → 89-TR-T → BT
  const xr = 900;
  const s = selectors(b, 'TR', xr, y1, y2, 160, 0);
  const r = b.chainV(s.n, xr, s.y + 2, [
    { k: 'brk', id: '52-TR', gap: 18, open: true, name: 'Interruptor de transferencia 52-TR' },
    { k: 'disc', id: '89-TR-T', gap: 22, open: true, to: 'BT', name: 'Seccionador del campo de transferencia, lado BT' },
  ]);
  b.wire('BT', [xr, r.y], [xr, yT]);
  b.dot('BT', xr, yT);
  b.text(xr, yT + 30, 'Transferencia', 'bay-lbl');
  return b.build();
}

/* 7. Anillo --------------------------------------------------------------- */
export function anillo(): Model {
  const b = new Builder('anillo', 1000, 790);
  const xl = 320, xr = 680, yt = 350, yb = 550;
  const sp = Builder.span([{ k: 'disc', id: '' }, { k: 'brk', id: '' }, { k: 'disc', id: '' }], 0);
  const gh = (xr - xl - sp) / 4, gv = (yb - yt - sp) / 4;
  const side = (n: string, x: number, y: number, ang: number, k: string, to: string, g: number, len: number, lbl: { lx?: number; ly?: number }) => {
    const r = b.chain(n, x, y, ang, [
      { k: 'disc', id: `89-${k}a`, gap: g, name: `Seccionador 89-${k}a`, ...lbl },
      { k: 'brk', id: `52-${k}`, gap: g, name: `Interruptor del anillo 52-${k}`, ...lbl },
      { k: 'disc', id: `89-${k}b`, gap: g, to, name: `Seccionador 89-${k}b`, ...lbl },
    ]);
    const a = (ang * Math.PI) / 180;
    b.wire(to, [r.x, r.y], [Math.round(x - Math.sin(a) * len), Math.round(y + Math.cos(a) * len)]);
  };
  side('N1', xl, yt, -90, '1', 'N2', gh, xr - xl, {});
  side('N2', xr, yt, 0, '2', 'N3', gv, yb - yt, {});
  side('N4', xl, yb, -90, '3', 'N3', gh, xr - xl, { ly: 26 });
  side('N1', xl, yt, 0, '4', 'N4', gv, yb - yt, { lx: -22 });
  for (const [n, x, y] of [['N1', xl, yt], ['N2', xr, yt], ['N3', xr, yb], ['N4', xl, yb]] as const) b.dot(n, x, y);
  circuit(b, 'line', 'L1', 'N1', xl, yt, 180, { lead: 96 });
  circuit(b, 'trafo', 'T1', 'N2', xr, yt, 180, { lead: 60 });
  circuit(b, 'line', 'L2', 'N3', xr, yb, 0);
  circuit(b, 'trafo', 'T2', 'N4', xl, yb, 0);
  return b.build();
}

/* 8. Interruptor y medio -------------------------------------------------- */
export function interruptorYMedio(): Model {
  const b = new Builder('interruptor-y-medio', 1000, 690);
  const y1 = 80, y2 = 600;
  b.bus('B1', 220, 800, y1);
  b.bus('B2', 220, 800, y2);
  busEarth(b, 'B1', 220, y1, -50);
  busEarth(b, 'B2', 220, y2, -50);
  const diam = (k: number, x: number, up: [string, CircuitKind], down: [string, CircuitKind], ang: number) => {
    const trip = (L: string, from: string, y: number, to?: string) => b.chain(from, x, y, 0, [
      { k: 'disc', id: `89-${k}${L}-1`, gap: 16, name: `Seccionador 89-${k}${L}-1` },
      { k: 'brk', id: `52-${k}${L}`, gap: 10, name: `Interruptor 52-${k}${L}${L === 'B' ? ' (central)' : ''}` },
      { k: 'disc', id: `89-${k}${L}-2`, gap: 10, to, name: `Seccionador 89-${k}${L}-2` },
    ]);
    b.dot('B1', x, y1);
    const a = trip('A', 'B1', y1);
    const nU = a.n;
    b.wire(nU, [x, a.y], [x, a.y + 55]);
    b.dot(nU, x, a.y + 28);
    circuit(b, up[1], up[0], nU, x, a.y + 28, ang);
    const m = trip('B', nU, a.y + 55);
    const nD = m.n;
    b.wire(nD, [x, m.y], [x, m.y + 55]);
    b.dot(nD, x, m.y + 28);
    circuit(b, down[1], down[0], nD, x, m.y + 28, ang);
    const c = trip('C', nD, m.y + 55, 'B2');
    b.wire('B2', [x, c.y], [x, y2]);
    b.dot('B2', x, y2);
    b.text(x, y1 - 24, `Diámetro ${k}`, 'bay-lbl');
  };
  diam(1, 410, ['L1', 'line'], ['T1', 'trafo'], 90);
  diam(2, 610, ['T2', 'trafo'], ['L2', 'line'], -90);
  return b.build();
}

/* 9. Doble interruptor ---------------------------------------------------- */
export function dobleInterruptor(): Model {
  const b = new Builder('doble-interruptor', 1000, 660);
  const y1 = 80, y2 = 576;
  b.bus('B1', 150, 920, y1);
  b.bus('B2', 150, 920, y2);
  busEarth(b, 'B1', 150, y1, -50);
  busEarth(b, 'B2', 150, y2, -50);
  const bays: Bay[] = [['L1', 'line', 210], ['L2', 'line', 470], ['T1', 'trafo', 730]];
  for (const [id, kind, x] of bays) {
    b.dot('B1', x, y1);
    const u = b.chainV('B1', x, y1, [
      { k: 'disc', id: `89-${id}-1-B`, gap: 22, name: `Seccionador 89-${id}-1-B (lado B1)` },
      { k: 'brk', id: `52-${id}-1`, gap: 16, name: `Interruptor 52-${id}-1 (hacia B1)` },
      { k: 'ct', gap: 6 },
      { k: 'disc', id: `89-${id}-1-L`, gap: 16, name: `Seccionador 89-${id}-1-L` },
    ]);
    const n = u.n, yn = u.y + 52;
    b.wire(n, [x, u.y], [x, yn + 30]);
    b.dot(n, x, yn);
    circuit(b, kind, id, n, x, yn, -90);
    const d = b.chainV(n, x, yn + 30, [
      { k: 'disc', id: `89-${id}-2-L`, gap: 16, name: `Seccionador 89-${id}-2-L` },
      { k: 'brk', id: `52-${id}-2`, gap: 16, name: `Interruptor 52-${id}-2 (hacia B2)` },
      { k: 'disc', id: `89-${id}-2-B`, gap: 16, to: 'B2', name: `Seccionador 89-${id}-2-B (lado B2)` },
    ]);
    b.wire('B2', [x, d.y], [x, y2]);
    b.dot('B2', x, y2);
  }
  return b.build();
}

/* 10. Anillo cruzado (topología del Manual UTP, fig. 9; validada por el docente) */
export function anilloCruzado(): Model {
  const b = new Builder('anillo-cruzado', 1000, 930);
  const xs = [260, 500, 740], yU = 340, yL = 590, rU = 250, rL = 680, xL = 150, xR = 950;
  const sp = Builder.span([{ k: 'disc', id: '' }, { k: 'brk', id: '' }, { k: 'disc', id: '' }], 0);
  const trio = (from: string, x: number, y: number, ang: number, k: string, to: string, g: number, lbl: { lx?: number; ly?: number } = {}) => b.chain(from, x, y, ang, [
    { k: 'disc', id: `89-${k}-a`, gap: g, name: `Seccionador 89-${k}-a`, ...lbl },
    { k: 'brk', id: `52-${k}`, gap: g, name: `Interruptor 52-${k}`, ...lbl },
    { k: 'disc', id: `89-${k}-b`, gap: g, to, name: `Seccionador 89-${k}-b`, ...lbl },
  ]);
  const ring = (y: number, yr: number, nodes: string[], pre: 'S' | 'I') => {
    const gh = (xs[1] - xs[0] - sp) / 4;
    const lbl = pre === 'I' ? { ly: 26 } : {};
    for (let i = 0; i < 2; i++) {
      const r = trio(nodes[i], xs[i], y, -90, `${pre}${i + 1}`, nodes[i + 1], gh, lbl);
      b.wire(nodes[i + 1], [r.x, y], [xs[i + 1], y]);
    }
    // Retorno: del último nodo al primero, por fuera
    const r = trio(nodes[2], xs[2], y, -90, `${pre}3`, nodes[0], 18, lbl);
    b.wire(nodes[0], [r.x, y], [xR, y], [xR, yr], [xL, yr], [xL, y], [xs[0], y]);
    nodes.forEach((n, i) => b.dot(n, xs[i], y));
  };
  ring(yU, rU, ['N1', 'N2', 'N3'], 'S');
  ring(yL, rL, ['N4', 'N5', 'N6'], 'I');
  const gv = (yL - yU - sp) / 4;
  ['V1', 'V2', 'V3'].forEach((k, i) => {
    const r = trio(`N${i + 1}`, xs[i], yU, 0, k, `N${i + 4}`, gv, { lx: -22 });
    b.wire(`N${i + 4}`, [xs[i], r.y], [xs[i], yL]);
  });
  const up: [string, CircuitKind][] = [['L1', 'line'], ['T1', 'trafo'], ['L2', 'line']];
  const dn: [string, CircuitKind][] = [['T2', 'trafo'], ['L3', 'line'], ['T3', 'trafo']];
  up.forEach(([id, k], i) => circuit(b, k, id, `N${i + 1}`, xs[i], yU, 180, { lead: 116, crossAt: rU }));
  dn.forEach(([id, k], i) => circuit(b, k, id, `N${i + 4}`, xs[i], yL, 0, { lead: 112, crossAt: rL }));
  b.text(xL - 12, (yU + rU) / 2 + 4, 'Anillo superior', 'bay-lbl', 'end');
  b.text(xL - 12, (yL + rL) / 2 + 4, 'Anillo inferior', 'bay-lbl', 'end');
  return b.build();
}
