/* ==========================================================================
   Modo interactivo: diseñar una configuración propia y simularla.
   El diseño se convierte en un Model y reutiliza el render y el motor eléctrico.
   ========================================================================== */
import { GND, type Model } from '../lib/model';
import { renderModel } from '../lib/render';
import { checkOperation, faultNode, initialState, solve, type SimState } from '../lib/engine';
import { applyState, anchorOf, resetView } from '../lib/view';
import { CONFIGS } from '../data/configs';
import * as fx from './fx';
import { publishContext } from './chat';

type LType = 'bus' | 'bust' | 'brk' | 'disc' | 'earth' | 'ct' | 'vt' | 'dps' | 'to' | 'line' | 'trafo';
interface LEl { id: string; type: LType; x: number; y: number; rot: number; len?: number; open?: boolean; label: string }
interface LTerm { el: string; t: number }
interface LWire { id: string; a: LTerm; b: LTerm }
interface Design { els: LEl[]; wires: LWire[]; seq: Record<string, number> }

const W = 960, H = 620, GRID = 20;
const STORE = 'subestalab:laboratorio';
const NS = 'http://www.w3.org/2000/svg';
const snap = (v: number) => Math.round(v / (GRID / 2)) * (GRID / 2);

const META: Record<LType, { name: string; prefix: string; terms: [number, number][] }> = {
  bus: { name: 'Barra', prefix: 'B', terms: [] },
  bust: { name: 'Barra de transferencia', prefix: 'BT', terms: [] },
  brk: { name: 'Interruptor 52', prefix: '52-', terms: [[0, -14], [0, 14]] },
  disc: { name: 'Seccionador 89', prefix: '89-', terms: [[0, -14], [0, 14]] },
  earth: { name: 'Puesta a tierra 57', prefix: '57-', terms: [[0, -14]] },
  ct: { name: 'Transformador de corriente', prefix: 'TC', terms: [[0, -10], [0, 10]] },
  vt: { name: 'Transformador de potencial', prefix: 'TP', terms: [[0, -20]] },
  dps: { name: 'Descargador (DPS)', prefix: 'DPS', terms: [[0, -20]] },
  to: { name: 'Trampa de onda', prefix: 'TO', terms: [[0, -16], [0, 16]] },
  line: { name: 'Línea (fuente)', prefix: 'L', terms: [[0, 0]] },
  trafo: { name: 'Transformador (carga)', prefix: 'T', terms: [[0, 0]] },
};
const HANDLE: Record<LType, [number, number, number, number]> = {
  bus: [0, -10, 0, 20], bust: [0, -10, 0, 20], brk: [-20, -20, 40, 40], disc: [-20, -20, 40, 40], earth: [-20, -20, 40, 60],
  ct: [-14, -16, 28, 32], vt: [-16, -22, 32, 50], dps: [-16, -22, 32, 50], to: [-12, -18, 24, 36], line: [-14, -4, 28, 46], trafo: [-20, -4, 40, 84],
};

const rotP = ([x, y]: [number, number], r: number): [number, number] => {
  const a = (r * Math.PI) / 180, c = Math.round(Math.cos(a)), s = Math.round(Math.sin(a));
  return [x * c - y * s, x * s + y * c];
};

/* ---------- Diseño → modelo eléctrico ---------- */
function termPos(e: LEl, t: number): [number, number] {
  if (e.type === 'bus' || e.type === 'bust') return [e.x + t, e.y];
  const [dx, dy] = rotP(META[e.type].terms[t], e.rot);
  return [e.x + dx, e.y + dy];
}
const termKey = (d: Design, t: LTerm) => {
  const e = d.els.find(x => x.id === t.el);
  if (!e) return `?${t.el}`;
  if (e.type === 'bus' || e.type === 'bust') return `${e.id}:bus`;
  if (e.type === 'ct' || e.type === 'to') return `${e.id}:0`;
  return `${e.id}:${t.t}`;
};

function toModel(d: Design): { m: Model } {
  const p = new Map<string, string>();
  const find = (k: string): string => { if (!p.has(k)) p.set(k, k); let r = k; while (p.get(r) !== r) r = p.get(r)!; p.set(k, r); return r; };
  const union = (a: string, b: string) => { const ra = find(a), rb = find(b); if (ra !== rb) p.set(ra, rb); };
  for (const w of d.wires) union(termKey(d, w.a), termKey(d, w.b));
  const nodeOf = (el: LEl, t: number) => {
    const k = termKey(d, { el: el.id, t });
    return 'n' + find(k).replace(/[^A-Za-z0-9]/g, '_');
  };
  const m: Model = { id: 'laboratorio', viewBox: [0, 0, W, H], buses: [], wires: [], halos: [], switches: [], decos: [], sources: [], loads: [], dots: [], texts: [] };
  for (const e of d.els) {
    switch (e.type) {
      case 'bus': case 'bust':
        m.buses.push({ id: nodeOf(e, 0), x1: e.x, x2: e.x + (e.len ?? 300), y: e.y, label: e.label, transfer: e.type === 'bust' }); break;
      case 'brk': case 'disc': {
        const vert = e.rot % 180 === 0;
        m.switches.push({ id: e.label, kind: e.type, a: nodeOf(e, 0), b: nodeOf(e, 1), x: e.x, y: e.y, rot: e.rot, open: !!e.open, label: e.label,
          lx: vert ? 20 : 0, ly: vert ? 0 : -26, name: `${META[e.type].name} ${e.label}` });
        break;
      }
      case 'earth':
        m.switches.push({ id: e.label, kind: 'earth', a: nodeOf(e, 0), b: GND, x: e.x, y: e.y, rot: e.rot, open: e.open ?? true, label: e.label, lx: 20, ly: 4, name: `Puesta a tierra ${e.label}` });
        break;
      case 'ct': case 'to': {
        const n = nodeOf(e, 0);
        m.wires.push({ n, pts: [termPos(e, 0), termPos(e, 1)] });
        m.decos.push({ kind: e.type, n, x: e.x, y: e.y, rot: e.rot }); break;
      }
      case 'vt': case 'dps':
        m.decos.push({ kind: e.type, n: nodeOf(e, 0), x: e.x, y: e.y, rot: e.rot }); break;
      case 'line':
        m.sources.push({ id: e.label, n: nodeOf(e, 0), x: e.x, y: e.y, rot: e.rot, len: 34, label: e.label }); break;
      case 'trafo':
        m.loads.push({ id: e.label, n: nodeOf(e, 0), x: e.x, y: e.y, rot: e.rot, label: e.label }); break;
    }
  }
  for (const w of d.wires) {
    const ea = d.els.find(x => x.id === w.a.el), eb = d.els.find(x => x.id === w.b.el);
    if (!ea || !eb) continue;
    const A = termPos(ea, w.a.t), B = termPos(eb, w.b.t);
    const n = nodeOf(ea, w.a.t);
    const pts: [number, number][] = A[0] === B[0] || A[1] === B[1] ? [A, B] : [A, [A[0], B[1]], B];
    m.wires.push({ n, pts });
    if (ea.type === 'bus' || ea.type === 'bust') m.dots.push({ n, x: A[0], y: A[1] });
    if (eb.type === 'bus' || eb.type === 'bust') m.dots.push({ n, x: B[0], y: B[1] });
  }
  return { m };
}

/* ---------- Validación y reconocimiento ---------- */
interface Check { level: 'ok' | 'warn' | 'tip'; text: string }

function validate(d: Design, m: Model): { checks: Check[]; guess: string | null } {
  const checks: Check[] = [];
  const connected = new Set<string>();
  d.wires.forEach(w => { connected.add(`${w.a.el}:${w.a.t}`); connected.add(`${w.b.el}:${w.b.t}`); });
  const isConn = (e: LEl, t: number) => connected.has(`${e.id}:${t}`);
  if (!d.els.length) return { checks: [{ level: 'tip', text: 'Arrastra elementos desde la paleta para empezar. Une sus terminales (puntos) para conectarlos.' }], guess: null };
  if (!m.sources.length) checks.push({ level: 'warn', text: 'No hay ninguna fuente: agrega al menos una línea.' });
  for (const e of d.els) {
    const n = META[e.type].terms.length;
    for (let t = 0; t < n; t++) if (!isConn(e, t)) { checks.push({ level: 'warn', text: `${e.label} tiene un terminal sin conectar.` }); break; }
  }
  // Interruptores con seccionador a ambos lados
  const discNodes = new Set(m.switches.filter(s => s.kind === 'disc').flatMap(s => [s.a, s.b]));
  for (const s of m.switches.filter(s => s.kind === 'brk')) {
    const miss = [s.a, s.b].filter(n => !discNodes.has(n)).length;
    if (miss) checks.push({ level: 'warn', text: `${s.label}: falta un seccionador ${miss === 2 ? 'a cada lado' : 'a un lado'} para poder aislarlo.` });
  }
  // Circuitos conectados a barra sin interruptor
  const adjNoBrk = new Map<string, string[]>();
  const add = (a: string, b: string) => { (adjNoBrk.get(a) ?? adjNoBrk.set(a, []).get(a)!).push(b); };
  m.switches.filter(s => s.kind === 'disc').forEach(s => { add(s.a, s.b); add(s.b, s.a); });
  const busNodes = new Set(m.buses.map(b => b.id));
  for (const c of [...m.sources, ...m.loads]) {
    const seen = new Set([c.n]), q = [c.n];
    while (q.length) { const n = q.shift()!; for (const nb of adjNoBrk.get(n) ?? []) if (!seen.has(nb)) { seen.add(nb); q.push(nb); } }
    if ([...seen].some(n => busNodes.has(n))) checks.push({ level: 'warn', text: `${c.id} llega a una barra sin pasar por un interruptor.` });
  }
  // Puesta a tierra de línea
  for (const s of m.sources) {
    const has = m.switches.some(w => w.kind === 'earth' && w.a === s.n);
    if (!has) checks.push({ level: 'tip', text: `Sugerencia: agrega una puesta a tierra 57 en la salida de ${s.id}.` });
  }
  const sol = solve(m, initialState(m));
  for (const l of m.loads) if (!sol.served[l.id]) checks.push({ level: 'tip', text: `${l.id} está sin servicio con la posición actual de los equipos.` });
  if (!checks.some(c => c.level === 'warn')) checks.unshift({ level: 'ok', text: 'Sin problemas de conexión. Pasa a «Simular» para maniobrar.' });

  // Reconocimiento aproximado
  const nb = d.els.filter(e => e.type === 'bus').length, nbt = d.els.filter(e => e.type === 'bust').length;
  const nbrk = m.switches.filter(s => s.kind === 'brk').length, nc = m.sources.length + m.loads.length;
  let guess: string | null = null;
  if (nc >= 2 && nbrk >= 2) {
    if (nb === 0 && nbt === 0 && nbrk >= nc) guess = 'Anillo';
    else if (nb === 1 && nbt === 0) guess = 'Barra sencilla';
    else if (nb === 1 && nbt === 1) guess = 'Barra principal y de transferencia';
    else if (nb === 2 && nbt === 1) guess = 'Doble barra más barra de transferencia';
    else if (nb === 2 && nbt === 0) guess = nbrk === 2 * nc ? 'Doble interruptor' : nbrk * 2 === 3 * nc ? 'Interruptor y medio' : 'Doble barra';
  }
  return { checks, guess };
}

/* ---------- Ejemplo inicial: barra sencilla con dos bahías ---------- */
function example(): Design {
  const els: LEl[] = [{ id: 'e1', type: 'bus', x: 220, y: 120, rot: 0, len: 520, label: 'B1' }];
  const wires: LWire[] = [];
  let k = 2;
  const bay = (x: number, kind: 'line' | 'trafo', n: number) => {
    const ids = { d1: `e${k++}`, b: `e${k++}`, d2: `e${k++}`, c: `e${k++}` };
    els.push({ id: ids.d1, type: 'disc', x, y: 190, rot: 0, label: `89-${n}a` }, { id: ids.b, type: 'brk', x, y: 260, rot: 0, label: `52-${n}` },
      { id: ids.d2, type: 'disc', x, y: 330, rot: 0, label: `89-${n}b` }, { id: ids.c, type: kind, x, y: 390, rot: 0, label: kind === 'line' ? 'L1' : 'T1' });
    wires.push({ id: `w${k++}`, a: { el: 'e1', t: x - 220 }, b: { el: ids.d1, t: 0 } }, { id: `w${k++}`, a: { el: ids.d1, t: 1 }, b: { el: ids.b, t: 0 } },
      { id: `w${k++}`, a: { el: ids.b, t: 1 }, b: { el: ids.d2, t: 0 } }, { id: `w${k++}`, a: { el: ids.d2, t: 1 }, b: { el: ids.c, t: 0 } });
  };
  bay(360, 'line', 1);
  bay(600, 'trafo', 2);
  return { els, wires, seq: { e: k, B: 1, '52-': 2, '89-': 2, L: 1, T: 1 } };
}

/* ========================================================================== */
export function startLab(root: HTMLElement) {
  const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
  const host = $('lab-canvas'), checksEl = $('lab-checks'), guessEl = $('lab-guess'), propsEl = $('lab-props'), toastEl = $('lab-toast');
  let d: Design = load() ?? example();
  let mode: 'design' | 'sim' = 'design';
  let preset: string | null = null;     // slug de una configuración cargada para simular
  let model: Model;
  let st: SimState;
  let sel: { kind: 'el' | 'wire'; id: string } | null = null;
  let wiring: { from: LTerm; click: boolean } | null = null;
  let drag: { id: string; dx: number; dy: number; resize?: boolean } | null = null;
  let simTool: 'hand' | 'fault' = 'hand';
  let arcStops: (() => void)[] = [];
  const undo: string[] = [];

  function save() { if (!preset) try { localStorage.setItem(STORE, JSON.stringify(d)); } catch { /* sin almacenamiento */ } }
  function load(): Design | null { try { const s = localStorage.getItem(STORE); return s ? JSON.parse(s) : null; } catch { return null; } }
  const pushUndo = () => { undo.push(JSON.stringify(d)); if (undo.length > 60) undo.shift(); };
  const nextLabel = (t: LType) => {
    const pre = META[t].prefix;
    if (t === 'ct' || t === 'vt' || t === 'dps' || t === 'to') return pre;
    d.seq[pre] = (d.seq[pre] ?? 0) + 1;
    return t === 'bust' ? (d.seq[pre] > 1 ? `BT${d.seq[pre]}` : 'BT') : `${pre}${d.seq[pre]}`;
  };
  const newId = () => { d.seq.e = (d.seq.e ?? 1) + 1; return `e${d.seq.e}`; };

  function toast(html: string, ms = 2600) {
    toastEl.innerHTML = html; toastEl.classList.add('is-on');
    clearTimeout((toast as any).t); (toast as any).t = setTimeout(() => toastEl.classList.remove('is-on'), ms);
  }

  function svgPoint(e: PointerEvent | MouseEvent): [number, number] {
    const svg = host.querySelector('svg')!;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM()!.inverse());
    return [p.x, p.y];
  }

  /* ---------- Render ---------- */
  function render() {
    arcStops.forEach(s => s()); arcStops = [];
    if (preset) {
      model = CONFIGS.find(c => c.slug === preset)!.build();
    } else model = toModel(d).m;
    host.innerHTML = renderModel(model, { title: preset ? 'Configuración cargada' : 'Diseño propio' });
    const svg = host.querySelector('svg')!;
    resetView(svg);
    if (!preset) svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    if (mode === 'sim') { applyState(svg, model, st, { instant: true }); }
    else applyState(svg, model, initialState(model), { instant: true });
    if (mode === 'design' && !preset) drawOverlay(svg);
    const v = preset ? null : validate(d, model);
    checksEl.innerHTML = v ? v.checks.map(c => `<li class="${c.level}">${c.text}</li>`).join('') : '<li class="ok">Configuración de referencia: maniobra libremente sus equipos o inyecta fallas.</li>';
    guessEl.textContent = preset ? CONFIGS.find(c => c.slug === preset)!.name : v?.guess ? `Parece: ${v.guess}` : 'Configuración libre';
    guessEl.classList.toggle('is-known', !!(preset || v?.guess));
    renderProps();
    renderLoads();
  }

  function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>, parent: Element) {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
    parent.appendChild(e);
    return e;
  }

  function drawOverlay(svg: SVGSVGElement) {
    const grid = document.createElementNS(NS, 'g');
    grid.setAttribute('class', 'lab-grid');
    const defs = svg.querySelector('defs')!;
    defs.after(grid);
    defs.insertAdjacentHTML('beforeend', `<pattern id="lab-grid" width="${GRID}" height="${GRID}" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#D6D3D1"/></pattern>`);
    el('rect', { x: 0, y: 0, width: W, height: H, fill: 'url(#lab-grid)' }, grid);
    const g = el('g', { class: 'lab-ov' }, svg);
    // Conductores seleccionables
    for (const w of d.wires) {
      const ea = d.els.find(x => x.id === w.a.el), eb = d.els.find(x => x.id === w.b.el);
      if (!ea || !eb) continue;
      const A = termPos(ea, w.a.t), B = termPos(eb, w.b.t);
      const pts = A[0] === B[0] || A[1] === B[1] ? [A, B] : [A, [A[0], B[1]], B];
      el('path', { class: `wire-hit${sel?.kind === 'wire' && sel.id === w.id ? ' is-sel' : ''}`, 'data-wire': w.id, d: 'M' + pts.map(p => p.join(' ')).join('L') }, g);
    }
    for (const e of d.els) {
      const isBus = e.type === 'bus' || e.type === 'bust';
      const [hx, hy, hw, hh] = HANDLE[e.type];
      const grp = el('g', { class: `h${sel?.kind === 'el' && sel.id === e.id ? ' is-sel' : ''}`, 'data-el': e.id,
        transform: isBus ? `translate(${e.x} ${e.y})` : `translate(${e.x} ${e.y}) rotate(${e.rot})` }, g);
      el('rect', { class: 'h-box', x: hx, y: hy, width: isBus ? (e.len ?? 300) : hw, height: hh, rx: 8 }, grp);
      if (isBus) el('rect', { class: 'h-resize', 'data-resize': e.id, x: (e.len ?? 300) - 6, y: -9, width: 12, height: 18, rx: 3 }, grp);
    }
    for (const e of d.els) {
      META[e.type].terms.forEach((_, t) => {
        const [x, y] = termPos(e, t);
        const used = d.wires.some(w => (w.a.el === e.id && w.a.t === t) || (w.b.el === e.id && w.b.t === t));
        el('circle', { class: `term${used ? ' used' : ''}`, cx: x, cy: y, r: 6, 'data-term': `${e.id}:${t}` }, g);
      });
    }
    el('path', { class: 'rubber', id: 'rubber', d: '' }, g);
  }

  function renderProps() {
    if (preset) { propsEl.innerHTML = `<p class="muted">Haz clic en un interruptor o seccionador para operarlo. Con la herramienta <b>Falla</b>, haz clic en una barra o línea.</p>`; return; }
    if (!sel) { propsEl.innerHTML = `<p class="muted">Selecciona un elemento para ver sus propiedades. <kbd>R</kbd> rota, <kbd>Supr</kbd> elimina.</p>`; return; }
    if (sel.kind === 'wire') { propsEl.innerHTML = `<p><b>Conductor</b></p><button class="btn btn-outline btn-sm" data-p="del">Eliminar conductor</button>`; return; }
    const e = d.els.find(x => x.id === sel!.id);
    if (!e) { propsEl.innerHTML = ''; return; }
    const sw = e.type === 'brk' || e.type === 'disc' || e.type === 'earth';
    const editable = e.type !== 'ct' && e.type !== 'vt' && e.type !== 'dps' && e.type !== 'to';
    propsEl.innerHTML = `
      <p class="p-name">${META[e.type].name}</p>
      ${editable ? `<label class="p-field">Nombre<input id="p-label" value="${e.label}" maxlength="12"></label>` : ''}
      ${sw ? `<label class="p-check"><input type="checkbox" id="p-open" ${(e.type === 'earth' ? e.open ?? true : e.open) ? 'checked' : ''}> Normalmente abierto</label>` : ''}
      <div class="p-actions">
        ${e.type !== 'bus' && e.type !== 'bust' ? '<button class="btn btn-outline btn-sm" data-p="rot">Rotar 90°</button>' : ''}
        <button class="btn btn-outline btn-sm" data-p="del">Eliminar</button>
      </div>`;
    propsEl.querySelector<HTMLInputElement>('#p-label')?.addEventListener('change', ev => {
      pushUndo(); e.label = (ev.target as HTMLInputElement).value.trim() || e.label; save(); render();
    });
    propsEl.querySelector<HTMLInputElement>('#p-open')?.addEventListener('change', ev => {
      pushUndo(); e.open = (ev.target as HTMLInputElement).checked; save(); render();
    });
  }
  propsEl.addEventListener('click', ev => {
    const b = (ev.target as HTMLElement).closest<HTMLButtonElement>('[data-p]');
    if (!b) return;
    if (b.dataset.p === 'del') removeSel();
    if (b.dataset.p === 'rot') rotateSel();
  });

  function renderLoads() {
    const list = $('lab-loads');
    const sol = solve(model, mode === 'sim' ? st : initialState(model));
    list.innerHTML = model.loads.length
      ? model.loads.map(l => `<li class="${sol.served[l.id] ? 'on' : 'off'}"><i></i><b>${l.id}</b> ${sol.served[l.id] ? 'En servicio' : 'Sin servicio'}</li>`).join('')
      : '<li class="muted">Sin cargas</li>';
  }

  /* ---------- Edición ---------- */
  function addEl(type: LType, x: number, y: number) {
    pushUndo();
    const e: LEl = { id: newId(), type, x: snap(x), y: snap(y), rot: 0, label: nextLabel(type) };
    if (type === 'bus' || type === 'bust') { e.len = 400; e.x = snap(x - 200); }
    if (type === 'earth') e.open = true;
    d.els.push(e);
    sel = { kind: 'el', id: e.id };
    save(); render();
  }
  function removeSel() {
    if (!sel) return;
    pushUndo();
    if (sel.kind === 'wire') d.wires = d.wires.filter(w => w.id !== sel!.id);
    else { const id = sel.id; d.els = d.els.filter(e => e.id !== id); d.wires = d.wires.filter(w => w.a.el !== id && w.b.el !== id); }
    sel = null; save(); render();
  }
  function rotateSel() {
    if (sel?.kind !== 'el') return;
    const e = d.els.find(x => x.id === sel!.id);
    if (!e || e.type === 'bus' || e.type === 'bust') return;
    pushUndo(); e.rot = (e.rot + 90) % 360; save(); render();
  }

  function termFromTarget(t: Element | null, pt?: [number, number]): LTerm | null {
    const term = t?.closest<SVGElement>('[data-term]');
    if (term) { const [el, ti] = term.dataset.term!.split(':'); return { el, t: +ti }; }
    const h = t?.closest<SVGElement>('[data-el]');
    if (h && pt) {
      const e = d.els.find(x => x.id === h.dataset.el);
      if (e && (e.type === 'bus' || e.type === 'bust')) return { el: e.id, t: Math.max(0, Math.min(e.len ?? 300, snap(pt[0] - e.x))) };
    }
    return null;
  }

  host.addEventListener('pointerdown', ev => {
    if (mode !== 'design' || preset) return;
    const t = ev.target as Element;
    const pt = svgPoint(ev);
    // Terminar un conductor en modo clic
    if (wiring?.click) {
      finishWire(termFromTarget(t, pt));
      return;
    }
    const term = t.closest<SVGElement>('[data-term]');
    if (term) {
      const [elId, ti] = term.dataset.term!.split(':');
      wiring = { from: { el: elId, t: +ti }, click: false };
      host.setPointerCapture(ev.pointerId);
      return;
    }
    const rs = t.closest<SVGElement>('[data-resize]');
    if (rs) { pushUndo(); drag = { id: rs.dataset.resize!, dx: 0, dy: 0, resize: true }; host.setPointerCapture(ev.pointerId); return; }
    const h = t.closest<SVGElement>('[data-el]');
    if (h) {
      const e = d.els.find(x => x.id === h.dataset.el)!;
      sel = { kind: 'el', id: e.id };
      pushUndo();
      drag = { id: e.id, dx: pt[0] - e.x, dy: pt[1] - e.y };
      host.setPointerCapture(ev.pointerId);
      render();
      return;
    }
    const w = t.closest<SVGElement>('[data-wire]');
    if (w) { sel = { kind: 'wire', id: w.dataset.wire! }; render(); return; }
    sel = null; render();
  });

  let raf = 0;
  host.addEventListener('pointermove', ev => {
    if (mode !== 'design' || preset) return;
    const pt = svgPoint(ev);
    if (wiring) {
      const e = d.els.find(x => x.id === wiring!.from.el);
      if (!e) return;
      const A = termPos(e, wiring.from.t);
      host.querySelector('#rubber')?.setAttribute('d', `M${A[0]} ${A[1]}L${A[0]} ${pt[1]}L${pt[0]} ${pt[1]}`);
      return;
    }
    if (!drag) return;
    const e = d.els.find(x => x.id === drag!.id);
    if (!e) return;
    if (drag.resize) e.len = Math.max(80, snap(pt[0] - e.x));
    else { e.x = snap(pt[0] - drag.dx); e.y = snap(pt[1] - drag.dy); }
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(render);
  });

  host.addEventListener('pointerup', ev => {
    if (mode !== 'design' || preset) return;
    if (drag) { drag = null; save(); render(); return; }
    if (wiring) {
      const target = document.elementFromPoint(ev.clientX, ev.clientY);
      const to = termFromTarget(target, svgPoint(ev));
      if (to && !(to.el === wiring.from.el && to.t === wiring.from.t)) finishWire(to);
      else wiring.click = true; // modo clic: espera el segundo terminal
    }
  });

  function finishWire(to: LTerm | null) {
    const from = wiring?.from;
    wiring = null;
    host.querySelector('#rubber')?.setAttribute('d', '');
    if (!from || !to || (to.el === from.el && to.t === from.t)) return;
    pushUndo();
    d.wires.push({ id: newId(), a: from, b: to });
    save(); render();
  }

  /* ---------- Paleta (arrastrar o clic) ---------- */
  root.querySelectorAll<HTMLElement>('[data-add]').forEach(btn => {
    btn.addEventListener('pointerdown', ev => {
      if (mode !== 'design' || preset) { toast('Cambia a <b>Diseñar</b> con un lienzo propio para agregar elementos.'); return; }
      const type = btn.dataset.add as LType;
      const ghost = btn.cloneNode(true) as HTMLElement;
      ghost.classList.add('ghost');
      document.body.appendChild(ghost);
      const move = (e: PointerEvent) => { ghost.style.left = `${e.clientX}px`; ghost.style.top = `${e.clientY}px`; };
      move(ev);
      let moved = false;
      const mv = (e: PointerEvent) => { moved = true; move(e); };
      const up = (e: PointerEvent) => {
        window.removeEventListener('pointermove', mv);
        ghost.remove();
        const r = host.getBoundingClientRect();
        if (e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom) { const [x, y] = svgPoint(e); addEl(type, x, y); }
        else if (!moved) addEl(type, W / 2, H / 2);
      };
      window.addEventListener('pointermove', mv);
      window.addEventListener('pointerup', up, { once: true });
    });
  });

  /* ---------- Simulación ---------- */
  host.addEventListener('click', ev => {
    if (mode !== 'sim') return;
    const t = ev.target as Element;
    const svg = host.querySelector('svg')!;
    if (simTool === 'fault') {
      const bus = t.closest<SVGElement>('[data-bus], .hit-bus');
      const src = t.closest<SVGElement>('[data-src]');
      const id = bus ? ((bus as SVGElement).dataset.bus ?? (bus as SVGElement).dataset.target) : src?.dataset.src;
      if (id) injectFault(id);
      return;
    }
    const sw = t.closest<SVGElement>('.sw[data-id]');
    if (!sw) return;
    const s = model.switches.find(x => x.id === sw.dataset.id)!;
    const toOpen = !st.open[s.id];
    const v = checkOperation(model, st, s, toOpen);
    if (v.level === 'arc' || v.level === 'short') {
      const stop = fx.arc(svg, s.x, s.y, { ms: 1400, ground: v.level === 'short' });
      arcStops.push(stop);
      fx.shake(host);
      toast(`<b>${v.level === 'short' ? '¡Cortocircuito!' : '¡Arco eléctrico!'}</b> ${v.msg} Maniobra revertida.`, 4200);
      return;
    }
    if (v.level === 'warn') { toast(v.msg); return; }
    const before = solve(model, st);
    st.open[s.id] = toOpen;
    if (s.kind === 'brk' && toOpen && before.node[s.a] === 'E' && before.node[s.b] === 'E') fx.spark(svg, s.id);
    applyState(svg, model, st, { from: [s.id] });
    renderLoads();
  });

  /** Falla en una barra o línea: dispara los interruptores que rodean la zona fallada. */
  async function injectFault(id: string) {
    const svg = host.querySelector('svg')!;
    st.faults.push(id);
    applyState(svg, model, st, { from: [faultNode(model, id)] });
    const p = anchorOf(model, id);
    const stop = p ? fx.arc(svg, p[0], p[1], { size: 30 }) : () => {};
    arcStops.push(stop);
    fx.shake(host);
    await new Promise(r => setTimeout(r, 900));
    const zone = new Set([faultNode(model, id)]);
    const q = [...zone];
    while (q.length) {
      const n = q.shift()!;
      for (const s of model.switches) {
        if (s.kind !== 'disc' || st.open[s.id]) continue;
        const o = s.a === n ? s.b : s.b === n ? s.a : null;
        if (o && !zone.has(o)) { zone.add(o); q.push(o); }
      }
    }
    const trips = model.switches.filter(s => s.kind === 'brk' && !st.open[s.id] && (zone.has(s.a) || zone.has(s.b)));
    for (const s of trips) { st.open[s.id] = true; st.tripped[s.id] = 'PROT'; fx.spark(svg, s.id); fx.tag(svg, s.x, s.y - 34, 'TRIP', 'trip-tag', 3500); }
    const src = model.sources.find(x => x.id === id);
    if (src) st.remoteOff.push(src.id);
    applyState(svg, model, st, { from: trips.map(s => s.id) });
    const sol = solve(model, st);
    if (sol.node[faultNode(model, id)] !== 'F') { stop(); }
    renderLoads();
    const lost = model.loads.filter(l => !sol.served[l.id]).map(l => l.id);
    toast(`Protección: ${trips.length ? `disparo de ${trips.map(s => s.label).join(', ')}` : 'ningún interruptor rodea la falla'}. ${lost.length ? `Sin servicio: <b>${lost.join(', ')}</b>.` : 'Ninguna carga perdió el servicio.'}`, 5000);
  }

  /* ---------- Controles ---------- */
  function setMode(md: 'design' | 'sim') {
    mode = md;
    root.classList.toggle('is-sim', md === 'sim');
    root.classList.toggle('is-design', md === 'design');
    root.querySelector('.board')?.classList.toggle('is-free', md === 'sim');
    root.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(b => b.classList.toggle('is-on', b.dataset.mode === md));
    sel = null; wiring = null;
    if (md === 'sim') { st = initialState(preset ? CONFIGS.find(c => c.slug === preset)!.build() : toModel(d).m); }
    render();
    publishContext({ config: preset ? CONFIGS.find(c => c.slug === preset)!.name : 'Diseño libre', mode: 'interactivo', step: undefined });
  }
  root.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.mode === 'design' && preset) { preset = null; ($('lab-preset') as HTMLSelectElement).value = ''; }
    setMode(b.dataset.mode as 'design' | 'sim');
  }));
  root.querySelectorAll<HTMLButtonElement>('[data-simtool]').forEach(b => b.addEventListener('click', () => {
    simTool = b.dataset.simtool as 'hand' | 'fault';
    root.querySelectorAll('[data-simtool]').forEach(x => x.classList.toggle('is-on', x === b));
  }));
  $('lab-reset-sim').addEventListener('click', () => { if (mode === 'sim') setMode('sim'); });
  $('lab-undo').addEventListener('click', () => { const s = undo.pop(); if (s) { d = JSON.parse(s); sel = null; save(); render(); } });
  $('lab-clear').addEventListener('click', () => { if (!confirm('¿Borrar todo el diseño?')) return; pushUndo(); d = { els: [], wires: [], seq: { e: 1 } }; sel = null; save(); render(); });
  $('lab-example').addEventListener('click', () => { pushUndo(); d = example(); sel = null; save(); render(); });
  ($('lab-preset') as HTMLSelectElement).addEventListener('change', ev => {
    const v = (ev.target as HTMLSelectElement).value;
    preset = v || null;
    setMode(preset ? 'sim' : 'design');
  });
  document.addEventListener('keydown', ev => {
    if ((ev.target as HTMLElement).closest('input, textarea, select')) return;
    if (mode !== 'design' || preset) return;
    if (ev.key === 'Delete' || ev.key === 'Backspace') { ev.preventDefault(); removeSel(); }
    if (ev.key === 'r' || ev.key === 'R') rotateSel();
    if (ev.key === 'Escape') { wiring = null; host.querySelector('#rubber')?.setAttribute('d', ''); }
    if ((ev.ctrlKey || ev.metaKey) && ev.key === 'z') { ev.preventDefault(); $('lab-undo').click(); }
  });

  setMode('design');
}
