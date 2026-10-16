/* ==========================================================================
   Tablero de estudio: recorrido guiado y modo práctica de un escenario.
   ========================================================================== */
import { bySlug } from '../data/configs';
import { cloneState, faultNode, initialState, solve, type SimState, type Solution } from '../lib/engine';
import { apply, evaluate, isLive } from '../lib/actions';
import { anchorOf, applyState, resetView } from '../lib/view';
import type { Action, Scenario, Step, Tool } from '../lib/scenario';
import * as fx from './fx';
import { publishContext } from './chat';

type Mode = 'guided' | 'practice';
type ToolSel = Tool | 'hand';

const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const sleep = (ms: number) => new Promise(r => setTimeout(r, reduce() ? Math.min(ms, 60) : ms));
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const KIND_LBL: Record<Step['kind'], string> = { op: 'Maniobra', tool: 'Seguridad', info: 'Coordinación', event: 'Evento' };
const RISK_LBL = { Bajo: 'Riesgo bajo', Medio: 'Riesgo medio', Alto: 'Riesgo alto' } as const;
const STORE = 'subestalab:progreso';

const ICONS = {
  open: '<path d="M5 19 19 5"/><path d="M5 5h4"/><circle cx="5" cy="19" r="2"/>',
  close: '<path d="M12 4v16"/><path d="M8 4h8"/><circle cx="12" cy="20" r="2"/>',
  tool: '<path d="M12 3 5 6v6c0 4.2 3 7.6 7 9 4-1.4 7-4.8 7-9V6z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  event: '<path d="M13 2 5 13h6l-1 9 8-12h-6z"/>',
};

function loadProgress(): Record<string, { guided?: boolean; practice?: { stars: number; errors: number } }> {
  try { return JSON.parse(localStorage.getItem(STORE) || '{}'); } catch { return {}; }
}
function saveProgress(key: string, patch: object) {
  try {
    const p = loadProgress();
    p[key] = { ...p[key], ...patch };
    localStorage.setItem(STORE, JSON.stringify(p));
  } catch { /* almacenamiento no disponible */ }
}

export function startBoard(board: HTMLElement) {
  const cfg = bySlug(board.dataset.slug!)!;
  const m = cfg.build();
  const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
  const svg = board.querySelector<SVGSVGElement>('#canvas svg')!;
  const stage = $('stage'), cards = $('cards'), overlay = $('overlay'), toastEl = $('toast');
  const leaderPath = document.getElementById('leader-path')!, leaderDot = document.getElementById('leader-dot')!;
  const btnNext = $<HTMLButtonElement>('btn-next'), btnPrev = $<HTMLButtonElement>('btn-prev'), nextLbl = $('btn-next-lbl');
  const pips = $('pips'), stepCount = $('step-count'), hudLoads = $('hud-loads'), hudRisk = $('hud-risk');
  const logList = $('log-list'), logCount = $('log-count');
  const tabs = [...board.querySelectorAll<HTMLButtonElement>('.scen-tab')];
  const modeBtns = [...board.querySelectorAll<HTMLButtonElement>('.mode-switch button')];

  let scenIdx = 0;
  let sc: Scenario = cfg.scenarios[0];
  let mode: Mode = 'guided';
  let st: SimState = initialState(m);
  let snaps: SimState[] = [];
  let stepIdx = -1;
  let busy = false;
  let arcStop: (() => void) | null = null;
  let anchorId: string | null = null;
  let clock = 0;
  // práctica
  let pDone = new Set<number>();
  let pErr = 0, pHints = 0, hintLevel = 0, hintFor = -1;
  let tool: ToolSel = 'hand';
  let lockPartial = new Set<string>();

  const key = () => `${cfg.slug}:${sc.key}`;

  /* ---------- Coordenadas y dibujo ---------- */
  function toStage(x: number, y: number): [number, number] {
    const ctm = svg.getScreenCTM();
    const r = stage.getBoundingClientRect();
    if (!ctm) return [0, 0];
    const p = new DOMPoint(x, y).matrixTransform(ctm);
    return [p.x - r.left, p.y - r.top];
  }

  function setFocus(id?: string | null) {
    svg.querySelectorAll('.sw.is-focus').forEach(e => e.classList.remove('is-focus'));
    svg.querySelectorAll('.chip.is-hot').forEach(e => e.classList.remove('is-hot'));
    if (!id) return;
    svg.querySelector(`.sw[data-id="${id}"]`)?.classList.add('is-focus');
    svg.querySelector(`[data-chip="${id}"]`)?.classList.add('is-hot');
  }

  function zoneRect(id: string): [number, number, number, number] | null {
    const s = m.switches.find(x => x.id === id);
    if (s) return [s.x - 40, s.y - 44, 80, 88];
    const b = m.buses.find(x => x.id === id);
    if (b) return [b.x1 - 10, b.y - 26, b.x2 - b.x1 + 20, 52];
    const src = m.sources.find(x => x.id === id);
    if (src) { const a = (src.rot * Math.PI) / 180; const x = src.x - Math.sin(a) * 20, y = src.y + Math.cos(a) * 20; return [x - 36, y - 36, 72, 72]; }
    return null;
  }

  /** Efectos persistentes: marcas de falla, protecciones transferidas, zona de trabajo. */
  function drawPersistent(sol: Solution) {
    const layer = fx.fxLayer(svg);
    layer.querySelectorAll('.persist').forEach(e => e.remove());
    for (const f of st.faults) {
      const n = faultNode(m, f);
      if (sol.node[n] === 'F') continue;
      const a = anchorOf(m, f);
      if (!a) continue;
      const g = fx.tag(svg, a[0], a[1] - 26, '⚡ Falla', 'trip-tag persist');
      g.classList.add('fault-mark');
    }
    for (const [circuit, brk] of Object.entries(st.prot)) {
      const s = m.switches.find(x => x.id === brk);
      if (s) fx.tag(svg, s.x, s.y + (s.rot ? 46 : -38), `🛡 Prot. ${circuit}`, 'prot-tag persist');
    }
    for (const [id, relay] of Object.entries(st.tripped)) {
      const s = m.switches.find(x => x.id === id);
      if (s && st.open[id]) fx.tag(svg, s.x, s.y - 34, `TRIP ${relay}`, 'trip-tag persist');
    }
    if (st.handed) {
      const target = [...sc.steps].reverse().find(s => s.acts.some(a => a.op === 'verify'))?.acts.find(a => a.op === 'verify') as { target: string } | undefined;
      const r = target && zoneRect(target.target);
      if (r) fx.zone(svg, ...r).classList.add('persist');
    }
  }

  function refresh(o: { from?: string[]; instant?: boolean } = {}) {
    const sol = applyState(svg, m, st, o);
    drawPersistent(sol);
    // HUD de continuidad
    hudLoads.innerHTML = m.loads.map(l => {
      const on = sol.served[l.id];
      return `<li class="${on ? 'on' : 'off'}"><i></i><b>${l.id}</b><span>${on ? 'En servicio' : 'Sin servicio'}</span></li>`;
    }).join('');
    // Detener el arco cuando la falla deja de estar alimentada
    if (arcStop && !st.faults.some(f => sol.node[faultNode(m, f)] === 'F')) { arcStop(); arcStop = null; stage.classList.remove('is-fault'); }
    return sol;
  }

  function setRisk(r: Step['risk']) { hudRisk.dataset.risk = r; hudRisk.textContent = r; }

  /* ---------- Tarjetas dentro del tablero ---------- */
  function placeCard(card: HTMLElement, id?: string) {
    anchorId = id ?? null;
    const W = stage.clientWidth, H = stage.clientHeight;
    const cw = card.offsetWidth, ch = card.offsetHeight;
    const a = id ? anchorOf(m, id) : null;
    if (!a) {
      card.style.left = `${Math.max(16, (W - cw) / 2)}px`;
      card.style.top = `78px`;
      leaderPath.setAttribute('d', ''); leaderDot.setAttribute('cx', '-20');
      return;
    }
    const [ax, ay] = toStage(...a);
    // Puntos ocupados por el diagrama: la tarjeta busca la posición que menos tape.
    const busy = [
      ...m.switches.map(s => toStage(s.x, s.y)), ...m.decos.map(d => toStage(d.x, d.y)),
      ...m.sources.map(s => toStage(s.x, s.y)), ...m.loads.map(l => toStage(l.x, l.y + 30)),
      ...m.buses.flatMap(b => Array.from({ length: Math.ceil((b.x2 - b.x1) / 40) + 1 }, (_, i) => toStage(Math.min(b.x2, b.x1 + i * 40), b.y))),
    ];
    const gap = 46;
    const clampX = (x: number) => Math.max(16, Math.min(W - cw - 16, x));
    const clampY = (y: number) => Math.max(70, Math.min(H - ch - 96, y));
    const cands: [number, number][] = [
      [ax + gap, ay - ch / 2], [ax - gap - cw, ay - ch / 2], [ax - cw / 2, ay + gap], [ax - cw / 2, ay - gap - ch],
      [ax + gap, ay - ch + 30], [ax + gap, ay - 30], [ax - gap - cw, ay - ch + 30], [ax - gap - cw, ay - 30],
    ];
    let best: [number, number] = [clampX(cands[0][0]), clampY(cands[0][1])], bestScore = Infinity;
    for (const [cx, cy] of cands) {
      const l = clampX(cx), t = clampY(cy);
      const covers = (x: number, y: number, pad = 10) => x > l - pad && x < l + cw + pad && y > t - pad && y < t + ch + pad;
      const score = (covers(ax, ay, 18) ? 1000 : 0) + busy.filter(([x, y]) => covers(x, y)).length * 10 + Math.hypot(l - cx, t - cy) / 40;
      if (score < bestScore) { bestScore = score; best = [l, t]; }
    }
    const [left, top] = best;
    card.style.left = `${left}px`;
    card.style.top = `${top}px`;
    const sx = Math.max(left, Math.min(left + cw, ax)), sy = Math.max(top, Math.min(top + ch, ay));
    const horiz = ax < left || ax > left + cw;
    card.style.setProperty('--ox', ax < left ? '0%' : ax > left + cw ? '100%' : '50%');
    const mx = (sx + ax) / 2, my = (sy + ay) / 2;
    leaderPath.setAttribute('d', horiz ? `M${sx} ${sy}C${mx} ${sy} ${mx} ${ay} ${ax} ${ay}` : `M${sx} ${sy}C${sx} ${my} ${ax} ${my} ${ax} ${ay}`);
    leaderDot.setAttribute('cx', String(ax)); leaderDot.setAttribute('cy', String(ay));
  }

  function wordsHTML(text: string) {
    return text.split(/\s+/).map((w, i) => `<span style="--w:${i}">${esc(w)}</span>`).join(' ');
  }

  function showCard(step: Step, i: number, o: { variant?: 'ok' | 'error' | 'task'; extra?: string; continueBtn?: boolean; title?: string; text?: string } = {}) {
    cards.querySelectorAll('.step-card').forEach(c => { c.classList.add('is-out'); setTimeout(() => c.remove(), 320); });
    const icoKey = step.kind === 'op' ? (step.acts[0]?.op === 'close' ? 'close' : 'open') : step.kind;
    const card = document.createElement('article');
    card.className = `step-card kind-${step.kind}${o.variant ? ` is-${o.variant}` : ''}`;
    card.innerHTML = `
      <header><span class="sc-num">Paso ${i + 1} / ${sc.steps.length}</span><span class="sc-kind">${o.variant === 'error' ? 'Atención' : KIND_LBL[step.kind]}</span></header>
      <h3><span class="sc-ico"><svg viewBox="0 0 24 24">${ICONS[icoKey as keyof typeof ICONS] ?? ICONS.info}</svg></span><span>${esc(o.title ?? step.title)}</span></h3>
      <p class="sc-text">${wordsHTML(o.text ?? step.text)}</p>
      ${o.extra ?? ''}
      <footer>
        <span class="risk-chip" data-risk="${o.variant === 'error' ? 'Alto' : step.risk}">${RISK_LBL[o.variant === 'error' ? 'Alto' : step.risk]}</span>
        ${o.continueBtn ? '<button class="btn btn-dark btn-sm sc-cont" type="button">Continuar</button>' : '<button class="sc-ask" type="button">¿Por qué?</button>'}
      </footer>
      <img class="sc-avatar" src="/personaje/pose-${o.variant === 'error' ? 3 : 2}.webp" alt="" width="60" height="80">`;
    cards.appendChild(card);
    placeCard(card, step.focus);
    card.querySelector('.sc-ask')?.addEventListener('click', () =>
      window.dispatchEvent(new CustomEvent('subestalab:ask', { detail: `¿Por qué se hace este paso: ${step.title}?` })));
    return card;
  }

  function clearCards() {
    cards.replaceChildren();
    leaderPath.setAttribute('d', ''); leaderDot.setAttribute('cx', '-20');
    anchorId = null;
  }

  function toast(html: string, kind: 'ok' | 'warn' | 'info' = 'info', ms = 2600) {
    toastEl.innerHTML = html;
    toastEl.className = `toast is-on is-${kind}`;
    clearTimeout((toast as any).t);
    (toast as any).t = setTimeout(() => toastEl.classList.remove('is-on'), ms);
  }

  /* ---------- Bitácora ---------- */
  function hhmm() { const t = 8 * 60 + clock * 3; return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; }
  function addLog(step: Step, ok = true) {
    clock++;
    const li = document.createElement('li');
    li.className = ok ? 'ok' : 'bad';
    li.innerHTML = `<time>${hhmm()}</time><span>${esc(step.title)}</span>`;
    logList.appendChild(li);
    logList.scrollTop = logList.scrollHeight;
    logCount.textContent = String(logList.children.length);
  }
  function popLog() { logList.lastElementChild?.remove(); clock = Math.max(0, clock - 1); logCount.textContent = String(logList.children.length); }
  function clearLog() { logList.replaceChildren(); clock = 0; logCount.textContent = '0'; }
  $('log-toggle').addEventListener('click', e => {
    const log = $('log');
    log.classList.toggle('is-open');
    (e.currentTarget as HTMLElement).setAttribute('aria-expanded', String(log.classList.contains('is-open')));
  });

  /* ---------- Ejecución animada de acciones ---------- */
  async function perform(acts: Action[], step?: Step) {
    for (const a of acts) {
      switch (a.op) {
        case 'open':
        case 'close': {
          const sw = m.switches.find(x => x.id === a.id)!;
          const before = solve(m, st);
          const carried = a.op === 'open' && sw.kind === 'brk' && before.node[sw.a] === 'E' && before.node[sw.b] === 'E' && before.comp[sw.a] === before.comp[sw.b];
          apply(m, st, a);
          if (carried) fx.spark(svg, a.id);
          refresh({ from: [a.id] });
          await sleep(520);
          break;
        }
        case 'fault': {
          apply(m, st, a);
          refresh({ from: [faultNode(m, a.at)] });
          const p = anchorOf(m, a.at);
          if (p) { arcStop?.(); arcStop = fx.arc(svg, p[0], p[1], { size: 30 }); }
          stage.classList.add('is-fault');
          fx.shake(stage);
          await sleep(1100);
          break;
        }
        case 'stuck': apply(m, st, a); break;
        case 'trip': {
          for (const id of a.ids) {
            const s = m.switches.find(x => x.id === id);
            if (!s) continue;
            if (st.stuck.includes(id)) {
              fx.tag(svg, s.x, s.y - 34, 'NO ABRE', 'trip-tag no-open', 3800);
              const g = svg.querySelector(`.sw[data-id="${id}"]`);
              g?.classList.add('is-wrong'); setTimeout(() => g?.classList.remove('is-wrong'), 900);
            } else fx.spark(svg, id);
            await sleep(110);
          }
          for (const r of a.remote ?? []) {
            const s = m.sources.find(x => x.id === r);
            if (s) { const ang = (s.rot * Math.PI) / 180; fx.pulse(svg, [s.x, s.y], [s.x - Math.sin(ang) * s.len, s.y + Math.cos(ang) * s.len], 'pulse-dot pulse-trip'); }
          }
          apply(m, st, a);
          refresh({ from: a.ids });
          await sleep(900);
          break;
        }
        case 'remote': {
          const s = m.sources.find(x => x.id === a.id);
          if (s) {
            const ang = (s.rot * Math.PI) / 180, ex = s.x - Math.sin(ang) * s.len, ey = s.y + Math.cos(ang) * s.len;
            fx.pulse(svg, [s.x, s.y], [ex, ey], 'pulse-dot');
            fx.tag(svg, ex - Math.sin(ang) * 44, ey + Math.cos(ang) * 44, 'Extremo remoto abierto', 'meter', 2800);
          }
          await sleep(700);
          apply(m, st, a);
          refresh({ from: [a.id] });
          await sleep(500);
          break;
        }
        case 'verify': {
          const live = isLive(m, st, a.target);
          apply(m, st, a);
          const p = anchorOf(m, a.target);
          if (p) fx.tag(svg, p[0], p[1] - 34, live ? '⚠ ¡Tensión presente!' : '✓ 0 kV', live ? 'meter is-live' : 'meter', 3200);
          await sleep(900);
          break;
        }
        case 'protect': {
          const from = anchorOf(m, a.circuit), to = anchorOf(m, a.to);
          if (from && to) fx.pulse(svg, from, to, 'pulse-dot pulse-prot', 900);
          await sleep(800);
          apply(m, st, a); refresh();
          await sleep(300);
          break;
        }
        default:
          apply(m, st, a);
          refresh();
          await sleep(a.op === 'hand' ? 700 : 450);
      }
    }
    if (step) setRisk(step.risk);
  }

  /* ---------- Recorrido guiado ---------- */
  function renderPips() {
    pips.innerHTML = sc.steps.map((s, i) => `<i class="${i < stepIdx ? 'done' : i === stepIdx ? 'cur' : ''} k-${s.kind}"></i>`).join('');
    stepCount.textContent = `${Math.max(0, stepIdx + 1)} / ${sc.steps.length}`;
    btnPrev.disabled = stepIdx < 0 || busy;
    btnNext.disabled = busy;
    nextLbl.textContent = stepIdx < 0 ? 'Comenzar' : stepIdx >= sc.steps.length - 1 ? 'Finalizar' : 'Avanzar';
    btnNext.classList.toggle('nudge', !busy && stepIdx < 0);
  }

  function context(i: number) {
    const s = sc.steps[i];
    publishContext({ config: cfg.name, mode: mode === 'guided' ? 'guiado' : 'practica', scenario: sc.title,
      step: s ? { n: i + 1, total: sc.steps.length, title: s.title, text: s.text } : undefined });
  }

  async function runStep(i: number) {
    busy = true; renderPips();
    const step = sc.steps[i];
    stepIdx = i;
    renderPips();
    showCard(step, i);
    setFocus(step.focus);
    context(i);
    await sleep(step.kind === 'op' ? 700 : 350);
    await perform(step.acts, step);
    snaps[i] = cloneState(st);
    addLog(step);
    busy = false;
    renderPips();
  }

  async function next() {
    if (busy || mode !== 'guided') return;
    if (stepIdx < 0) { hideOverlay(); }
    if (stepIdx >= sc.steps.length - 1) { finishGuided(); return; }
    await runStep(stepIdx + 1);
  }

  function back() {
    if (busy || mode !== 'guided' || stepIdx < 0) return;
    stepIdx--;
    st = cloneState(stepIdx >= 0 ? snaps[stepIdx] : initialState(m));
    rebuildView();
    popLog();
    if (stepIdx >= 0) {
      const step = sc.steps[stepIdx];
      showCard(step, stepIdx); setFocus(step.focus); setRisk(step.risk); context(stepIdx);
    } else { clearCards(); setFocus(null); setRisk('Bajo'); showIntro(); }
    renderPips();
  }

  /** Redibuja el estado sin animación (al retroceder o reiniciar). */
  function rebuildView() {
    arcStop?.(); arcStop = null;
    fx.clearFx(svg);
    resetView(svg);
    stage.classList.remove('is-fault');
    const sol = refresh({ instant: true });
    for (const f of st.faults) {
      if (sol.node[faultNode(m, f)] !== 'F') continue;
      const p = anchorOf(m, f);
      if (p) arcStop = fx.arc(svg, p[0], p[1], { size: 30 });
      stage.classList.add('is-fault');
    }
  }

  function resetScenario() {
    st = initialState(m);
    snaps = []; stepIdx = -1; busy = false;
    pDone = new Set(); pErr = 0; pHints = 0; hintLevel = 0; hintFor = -1; lockPartial = new Set();
    clearCards(); clearLog(); setFocus(null); setRisk('Bajo');
    rebuildView();
    renderPips(); updatePracticeStats();
  }

  /* ---------- Superposiciones (inicio / fin) ---------- */
  function showOverlay(html: string) {
    overlay.innerHTML = `<div class="ov-card">${html}</div>`;
    overlay.hidden = false;
    requestAnimationFrame(() => overlay.classList.add('is-on'));
  }
  function hideOverlay() { overlay.classList.remove('is-on'); setTimeout(() => { overlay.hidden = true; }, 260); }

  function showIntro() {
    const n = sc.steps.length;
    showOverlay(`
      <img class="ov-avatar" src="/personaje/pose-2.webp" alt="" width="120" height="126">
      <span class="eyebrow">Escenario ${sc.key} · ${esc(sc.short)}</span>
      <h2>${esc(sc.title)}</h2>
      <p>${esc(sc.goal)}</p>
      <ul class="ov-meta"><li><b>${n}</b> pasos</li><li><b>${sc.steps.filter(s => s.kind === 'op').length}</b> maniobras</li><li>Recorrido guiado</li></ul>
      <div class="ov-actions"><button class="btn btn-primary" type="button" data-ov="start">Comenzar recorrido<svg class="btn-arrow" viewBox="0 0 16 16"><path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>
      <p class="ov-tip">Usa <kbd>→</kbd> o la barra espaciadora para avanzar y <kbd>←</kbd> para retroceder.</p>`);
  }

  function finishGuided() {
    saveProgress(key(), { guided: true });
    markTabs(); updateModeLock();
    clearCards(); setFocus(null);
    const sol = solve(m, st);
    const lost = m.loads.filter(l => !sol.served[l.id]).map(l => l.id);
    showOverlay(`
      <img class="ov-avatar" src="/personaje/pose-2.webp" alt="" width="120" height="126">
      <span class="eyebrow">Recorrido completado</span>
      <h2>¡Maniobra completada!</h2>
      <p>${esc(sc.outcome)}</p>
      <ul class="ov-meta"><li><b>${sc.steps.length}</b> pasos</li><li class="${lost.length ? 'bad' : 'good'}">${lost.length ? `Sin servicio: <b>${lost.join(', ')}</b>` : '<b>Continuidad total</b>'}</li></ul>
      <div class="ov-actions">
        <button class="btn btn-primary" type="button" data-ov="practice">Practicar esta maniobra</button>
        <button class="btn btn-outline" type="button" data-ov="repeat">Repetir</button>
        ${scenIdx < cfg.scenarios.length - 1 ? `<button class="btn btn-ghost" type="button" data-ov="nextscen">Siguiente escenario →</button>` : ''}
      </div>`);
    confetti();
  }

  overlay.addEventListener('click', e => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-ov]');
    if (!b) return;
    const act = b.dataset.ov;
    if (act === 'start') { hideOverlay(); runStep(0); }
    else if (act === 'repeat') { hideOverlay(); resetScenario(); setMode('guided'); showIntro(); }
    else if (act === 'practice') { hideOverlay(); setMode('practice'); }
    else if (act === 'pstart') { hideOverlay(); advancePractice(); }
    else if (act === 'nextscen') { hideOverlay(); selectScenario(scenIdx + 1); }
    else if (act === 'prepeat') { hideOverlay(); setMode('practice'); }
  });

  /* ---------- Modo práctica ---------- */
  function updatePracticeStats() {
    $('p-done').textContent = String(pDone.size);
    $('p-total').textContent = String(sc.steps.length);
    $('p-err').textContent = String(pErr);
  }
  const nextPending = () => sc.steps.findIndex((_, i) => !pDone.has(i));
  function currentGroup(): number[] {
    const k = nextPending();
    if (k < 0) return [];
    const g = sc.steps[k].group;
    if (!g) return [k];
    const out: number[] = [];
    for (let i = k; i < sc.steps.length && sc.steps[i].group === g; i++) if (!pDone.has(i)) out.push(i);
    return out;
  }

  function startPractice() {
    resetScenario();
    showOverlay(`
      <img class="ov-avatar" src="/personaje/pose-1.webp" alt="" width="100" height="135">
      <span class="eyebrow">Modo práctica · Escenario ${sc.key}</span>
      <h2>${esc(sc.title)}</h2>
      <p>${esc(sc.goal)}</p>
      <ul class="ov-howto">
        <li><b>Operar:</b> haz clic en un interruptor o seccionador para abrirlo o cerrarlo.</li>
        <li><b>Herramientas:</b> elige Bloquear, Verificar, Tierras, Protección o Acople y haz clic sobre el equipo o la barra.</li>
        <li>Si el orden es inseguro, verás lo que pasaría en una subestación real.</li>
      </ul>
      <div class="ov-actions"><button class="btn btn-primary" type="button" data-ov="pstart">Empezar práctica</button></div>`);
  }

  async function advancePractice() {
    updatePracticeStats();
    const k = nextPending();
    if (k < 0) { finishPractice(); return; }
    const step = sc.steps[k];
    context(k);
    if (step.kind === 'info' || step.kind === 'event') {
      busy = true;
      const card = showCard(step, k, { continueBtn: true });
      setFocus(step.focus);
      await perform(step.acts, step);
      addLog(step);
      card.querySelector<HTMLButtonElement>('.sc-cont')?.addEventListener('click', () => {
        pDone.add(k); busy = false; advancePractice();
      }, { once: true });
      return;
    }
    busy = false;
    setFocus(null);
    hintLevel = hintFor === k ? hintLevel : 0;
    hintFor = k;
    showTask(k);
  }

  function showTask(k: number) {
    cards.querySelectorAll('.step-card').forEach(c => { c.classList.add('is-out'); setTimeout(() => c.remove(), 320); });
    leaderPath.setAttribute('d', ''); leaderDot.setAttribute('cx', '-20');
    let task = cards.querySelector<HTMLElement>('.task');
    if (!task) { task = document.createElement('div'); task.className = 'task'; cards.appendChild(task); }
    const grp = currentGroup();
    task.innerHTML = `<span class="task-n">Paso ${k + 1} de ${sc.steps.length}</span><b>Tu turno:</b> ${grp.length > 1 ? `realiza estas ${grp.length} maniobras (en cualquier orden)` : 'realiza la siguiente maniobra'}`;
  }

  function attemptFor(id: string, kind: 'sw' | 'bus' | 'src' | 'load'): Action | null {
    switch (tool) {
      case 'hand': return kind === 'sw' ? { op: st.open[id] ? 'close' : 'open', id } : null;
      case 'loto': return kind === 'sw' ? { op: 'lock', ids: [id] } : null;
      case 'verify': return { op: 'verify', target: id };
      case 'pat': return kind === 'sw' ? { op: 'pat', id } : null;
      case 'protect': return kind === 'sw' ? { op: 'protect', circuit: '', to: id } : null;
      case 'coupler': return kind === 'sw' ? { op: 'couplerLock', id, on: !st.couplerLock.includes(id) } : null;
    }
  }

  function matches(step: Step, a: Action): boolean {
    const e = step.acts[0];
    if (!e) return false;
    if ((a.op === 'open' || a.op === 'close') && e.op === a.op) return e.id === a.id;
    if (a.op === 'lock' && e.op === 'lock') return e.ids.includes(a.ids[0]) && !lockPartial.has(a.ids[0]);
    if (a.op === 'verify' && e.op === 'verify') return e.target === a.target;
    if (a.op === 'pat' && e.op === 'pat') return e.id === a.id;
    if (a.op === 'protect' && e.op === 'protect') return e.to === a.to;
    if (a.op === 'couplerLock' && e.op === 'couplerLock') return e.id === a.id && e.on === a.on;
    return false;
  }

  function shakeEl(id: string) {
    const g = svg.querySelector(`.sw[data-id="${id}"]`);
    g?.classList.add('is-wrong');
    setTimeout(() => g?.classList.remove('is-wrong'), 700);
  }

  function expectedDescription(step: Step): string {
    const a = step.acts[0];
    if (step.hint) return step.hint;
    if (a && (a.op === 'open' || a.op === 'close')) {
      const s = m.switches.find(x => x.id === a.id)!;
      const what = s.kind === 'brk' ? 'un interruptor' : s.kind === 'earth' ? 'una puesta a tierra' : 'un seccionador';
      return `Ahora corresponde ${a.op === 'open' ? 'abrir' : 'cerrar'} ${what}. Piensa qué equipo debe operarse para que nadie quede expuesto y ningún seccionador opere con carga.`;
    }
    return 'Revisa el objetivo del escenario y las reglas de oro.';
  }

  async function onTarget(id: string, kind: 'sw' | 'bus' | 'src' | 'load') {
    if (mode !== 'practice' || busy || !overlay.hidden) return;
    const att = attemptFor(id, kind);
    if (!att) { toast(tool === 'hand' ? 'Con <b>Operar</b> solo se abren o cierran equipos. Para barras y líneas usa <b>Verificar</b>.' : 'Esa herramienta se usa sobre un equipo de maniobra.', 'info'); return; }
    const grp = currentGroup();
    const hit = grp.find(i => matches(sc.steps[i], att));
    if (hit !== undefined) {
      busy = true;
      const step = sc.steps[hit];
      if (att.op === 'lock') {
        lockPartial.add(att.ids[0]);
        await perform([att]);
        const all = (step.acts[0] as { ids: string[] }).ids;
        if (!all.every(x => lockPartial.has(x))) { toast(`✓ ${att.ids[0]} bloqueado. Faltan ${all.filter(x => !lockPartial.has(x)).join(', ')}.`, 'ok'); busy = false; return; }
      } else {
        showCard(step, hit, { variant: 'ok' });
        setFocus(step.focus);
        await perform(step.acts, step);
      }
      pDone.add(hit);
      addLog(step);
      toast(`✓ ${esc(step.title)}`, 'ok', 1800);
      busy = false;
      await sleep(250);
      advancePractice();
      return;
    }
    // Error: ¿qué pasaría en la realidad?
    const v = evaluate(m, st, att);
    pErr++;
    updatePracticeStats();
    const k = nextPending();
    const step = sc.steps[k];
    if (v.level === 'arc' || v.level === 'short') {
      busy = true;
      const p = anchorOf(m, id);
      if (p) fx.arc(svg, p[0], p[1], { ms: 1500, size: v.level === 'short' ? 34 : 26, ground: v.level === 'short' });
      fx.shake(stage);
      stage.classList.add('is-alarm');
      setTimeout(() => stage.classList.remove('is-alarm'), 1500);
      showCard(step, k, { variant: 'error', title: v.level === 'short' ? '¡Cortocircuito!' : '¡Arco eléctrico!', text: `${v.msg} En la práctica esto destruye el equipo y pone en riesgo la vida del operador. Se revierte la maniobra.` });
      addLog({ ...step, title: `✗ ${att.op === 'open' ? 'Abrir' : att.op === 'close' ? 'Cerrar' : 'Operar'} ${id}` }, false);
      await sleep(1200);
      busy = false;
      return;
    }
    shakeEl(id);
    if (v.level === 'warn') { pErr--; updatePracticeStats(); toast(esc(v.msg), 'warn', 3200); return; }
    showCard(step, k, { variant: 'error', title: 'Ese no es el paso correcto ahora', text: expectedDescription(step) });
    leaderPath.setAttribute('d', ''); leaderDot.setAttribute('cx', '-20');
  }

  function hint() {
    if (mode !== 'practice' || busy) return;
    const k = nextPending();
    if (k < 0) return;
    const step = sc.steps[k];
    pHints++;
    hintLevel++;
    if (hintLevel === 1) {
      showCard(step, k, { variant: 'task', title: 'Pista', text: expectedDescription(step) });
      leaderPath.setAttribute('d', ''); leaderDot.setAttribute('cx', '-20');
    } else {
      const grp = currentGroup();
      const s = sc.steps[grp[0]];
      showCard(s, grp[0], { variant: 'task', title: `Es aquí: ${s.title}`, text: s.tool ? `Usa la herramienta «${toolName(s.tool)}» sobre el elemento resaltado.` : 'Haz clic sobre el equipo resaltado.' });
      setFocus(s.focus);
    }
  }
  const toolName = (t: Tool) => ({ loto: 'Bloquear', verify: 'Verificar', pat: 'Tierras', protect: 'Protección', coupler: 'Acople' })[t];

  function finishPractice() {
    clearCards(); setFocus(null);
    const stars = pErr === 0 && pHints === 0 ? 3 : pErr <= 2 && pHints <= 2 ? 2 : 1;
    const prev = loadProgress()[key()]?.practice;
    if (!prev || stars >= prev.stars) saveProgress(key(), { practice: { stars, errors: pErr } });
    markTabs();
    showOverlay(`
      <img class="ov-avatar" src="/personaje/pose-2.webp" alt="" width="120" height="126">
      <span class="eyebrow">Práctica completada</span>
      <h2>${stars === 3 ? '¡Maniobra perfecta!' : stars === 2 ? '¡Muy bien!' : 'Maniobra completada'}</h2>
      <div class="stars" aria-label="${stars} de 3 estrellas">${[1, 2, 3].map(i => `<span class="${i <= stars ? 'on' : ''}" style="--i:${i}">★</span>`).join('')}</div>
      <ul class="ov-meta"><li><b>${pErr}</b> errores</li><li><b>${pHints}</b> pistas</li><li><b>${sc.steps.length}</b> pasos</li></ul>
      <div class="ov-actions">
        <button class="btn btn-outline" type="button" data-ov="prepeat">Repetir práctica</button>
        ${scenIdx < cfg.scenarios.length - 1 ? `<button class="btn btn-primary" type="button" data-ov="nextscen">Siguiente escenario →</button>` : `<a class="btn btn-primary" href="/configuraciones">Elegir otra configuración</a>`}
      </div>`);
    if (stars >= 2) confetti();
  }

  /* ---------- Modos, escenarios y herramientas ---------- */
  function unlocked() { return !!loadProgress()[key()]?.guided; }
  function updateModeLock() {
    const pb = modeBtns.find(b => b.dataset.mode === 'practice')!;
    pb.classList.toggle('is-locked', !unlocked());
  }
  function markTabs() {
    const p = loadProgress();
    tabs.forEach((t, i) => {
      const s = p[`${cfg.slug}:${cfg.scenarios[i].key}`];
      t.classList.toggle('is-done', !!s?.guided);
      t.classList.toggle('is-mastered', !!s?.practice);
    });
  }

  function setMode(md: Mode) {
    if (md === 'practice' && !unlocked()) {
      toast('Completa primero el <b>recorrido guiado</b> de este escenario para desbloquear la práctica.', 'warn', 3400);
      btnNext.classList.add('nudge');
      return;
    }
    mode = md;
    board.classList.toggle('is-guided', md === 'guided');
    board.classList.toggle('is-practice', md === 'practice');
    modeBtns.forEach(b => { const on = b.dataset.mode === md; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', String(on)); });
    setTool('hand');
    if (md === 'practice') startPractice();
    else { resetScenario(); showIntro(); }
  }

  function selectScenario(i: number) {
    scenIdx = i; sc = cfg.scenarios[i];
    tabs.forEach((t, j) => t.setAttribute('aria-selected', String(j === i)));
    updateModeLock();
    mode = 'practice'; // fuerza el reinicio en setMode
    setMode('guided');
  }

  function setTool(t: ToolSel) {
    tool = t;
    board.dataset.tool = t;
    board.querySelectorAll<HTMLButtonElement>('.tool').forEach(b => { const on = b.dataset.tool === t; b.classList.toggle('is-on', on); b.setAttribute('aria-checked', String(on)); });
  }

  /* ---------- Eventos ---------- */
  btnNext.addEventListener('click', () => { if (stepIdx < 0 && !overlay.hidden) { hideOverlay(); runStep(0); } else next(); });
  btnPrev.addEventListener('click', back);
  $('btn-reset').addEventListener('click', () => { resetScenario(); showIntro(); });
  $('btn-reset-p').addEventListener('click', () => startPractice());
  $('btn-hint').addEventListener('click', hint);
  tabs.forEach((t, i) => t.addEventListener('click', () => { if (i !== scenIdx || mode !== 'guided') selectScenario(i); }));
  modeBtns.forEach(b => b.addEventListener('click', () => { const md = b.dataset.mode as Mode; if (md !== mode) setMode(md); }));
  board.querySelectorAll<HTMLButtonElement>('.tool').forEach(b => b.addEventListener('click', () => setTool(b.dataset.tool as ToolSel)));
  document.getElementById('btn-theory')?.addEventListener('click', () => (document.getElementById('theory') as HTMLDialogElement).showModal());

  svg.addEventListener('click', e => {
    const t = e.target as Element;
    const sw = t.closest<SVGElement>('.sw[data-id]');
    if (sw) return onTarget(sw.dataset.id!, 'sw');
    const bus = t.closest<SVGElement>('[data-bus], .hit-bus');
    if (bus) return onTarget((bus as SVGElement).dataset.bus ?? (bus as SVGElement).dataset.target!, 'bus');
    const src = t.closest<SVGElement>('[data-src]');
    if (src) return onTarget(src.dataset.src!, 'src');
    const ld = t.closest<SVGElement>('[data-load-g]');
    if (ld) return onTarget(ld.dataset.loadG!, 'load');
  });

  document.addEventListener('keydown', e => {
    if ((e.target as HTMLElement).closest('input, textarea, dialog')) return;
    if (mode !== 'guided') return;
    if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); if (stepIdx < 0 && !overlay.hidden) { hideOverlay(); runStep(0); } else next(); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); back(); }
  });

  new ResizeObserver(() => {
    const card = cards.querySelector<HTMLElement>('.step-card:not(.is-out)');
    if (card) placeCard(card, anchorId ?? undefined);
  }).observe(stage);

  /* ---------- Confeti ---------- */
  function confetti() {
    if (reduce()) return;
    const box = document.createElement('div');
    box.className = 'confetti';
    const colors = ['#7BEA6F', '#0E0E0E', '#F5C400', '#1E9E18', '#FFFFFF'];
    box.innerHTML = Array.from({ length: 46 }, (_, i) =>
      `<i style="--x:${Math.random() * 100}%;--d:${Math.random() * .6}s;--r:${Math.random() * 360}deg;--c:${colors[i % colors.length]};--s:${.6 + Math.random() * .8}"></i>`).join('');
    stage.appendChild(box);
    setTimeout(() => box.remove(), 2600);
  }

  /** Salta directamente al paso n (1 = primer paso) sin animaciones. Para enlaces directos. */
  function jumpTo(n: number) {
    resetScenario();
    overlay.hidden = true; overlay.classList.remove('is-on');
    n = Math.max(0, Math.min(n, sc.steps.length));
    for (let i = 0; i < n; i++) {
      for (const a of sc.steps[i].acts) apply(m, st, a);
      snaps[i] = cloneState(st);
      addLog(sc.steps[i]);
    }
    stepIdx = n - 1;
    rebuildView();
    if (stepIdx >= 0) { const s = sc.steps[stepIdx]; showCard(s, stepIdx); setFocus(s.focus); setRisk(s.risk); context(stepIdx); }
    renderPips();
  }

  /* ---------- Inicio ---------- */
  markTabs();
  updateModeLock();
  refresh({ instant: true });
  renderPips();
  updatePracticeStats();
  const q = new URLSearchParams(location.search);
  const qs = cfg.scenarios.findIndex(s => s.key === (q.get('esc') || '').toUpperCase());
  if (qs > 0) { scenIdx = qs; sc = cfg.scenarios[qs]; tabs.forEach((t, j) => t.setAttribute('aria-selected', String(j === qs))); updateModeLock(); renderPips(); }
  if (q.get('modo') === 'practica') { saveProgress(key(), { guided: true }); markTabs(); updateModeLock(); setMode('practice'); }
  else if (q.get('paso')) jumpTo(parseInt(q.get('paso')!, 10));
  else showIntro();
  if (q.has('chat')) document.getElementById('btn-chat')?.click();
  context(stepIdx);
}
