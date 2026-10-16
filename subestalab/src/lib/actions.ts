/* ==========================================================================
   Aplicación de acciones de escenario sobre el estado de simulación.
   Compartido por el reproductor (navegador) y el validador (Node).
   ========================================================================== */
import type { Model } from './model';
import { checkOperation, checkPat, faultNode, solve, type SimState, type Verdict } from './engine';
import type { Action } from './scenario';

/** Nodos que hay que revisar para "verificar ausencia de tensión" en un objetivo. */
export function verifyNodes(m: Model, target: string): string[] {
  const s = m.switches.find(x => x.id === target);
  if (s) return [s.a, s.b];
  const src = m.sources.find(x => x.id === target);
  if (src) return [src.n];
  const l = m.loads.find(x => x.id === target);
  if (l) return [l.n];
  return [target];
}

export function isLive(m: Model, st: SimState, target: string): boolean {
  const sol = solve(m, st);
  return verifyNodes(m, target).some(n => sol.node[n] === 'E' || sol.node[n] === 'F');
}

/** Evalúa una acción sin aplicarla. */
export function evaluate(m: Model, st: SimState, a: Action): Verdict {
  switch (a.op) {
    case 'open':
    case 'close': {
      const sw = m.switches.find(x => x.id === a.id);
      if (!sw) return { level: 'warn', msg: `No existe el equipo ${a.id}.` };
      if (st.open[a.id] === (a.op === 'open')) return { level: 'warn', msg: `${a.id} ya está ${a.op === 'open' ? 'abierto' : 'cerrado'}.` };
      return checkOperation(m, st, sw, a.op === 'open');
    }
    case 'verify':
      return isLive(m, st, a.target)
        ? { level: 'warn', msg: `¡Hay tensión en ${a.target}! No se puede continuar con la puesta a tierra.` }
        : { level: 'ok' };
    case 'pat':
      return checkPat(m, st, a.id);
    case 'lock':
      for (const id of a.ids) if (st.open[id] === false) return { level: 'warn', msg: `${id} está cerrado: solo se bloquean equipos abiertos que aíslan la zona.` };
      return { level: 'ok' };
    default:
      return { level: 'ok' };
  }
}

/** Aplica una acción (muta el estado). Devuelve los equipos que cambiaron de posición. */
export function apply(m: Model, st: SimState, a: Action): string[] {
  switch (a.op) {
    case 'open':
      if (st.stuck.includes(a.id)) return [];
      st.open[a.id] = true; return [a.id];
    case 'close':
      st.open[a.id] = false; delete st.tripped[a.id]; return [a.id];
    case 'lock':
      a.ids.forEach(id => { if (!st.locked.includes(id)) st.locked.push(id); }); return [];
    case 'verify':
      if (!st.verified.includes(a.target)) st.verified.push(a.target); return [];
    case 'pat':
      if (!st.pat.includes(a.id)) st.pat.push(a.id); return [];
    case 'protect':
      st.prot[a.circuit] = a.to; return [];
    case 'couplerLock':
      st.couplerLock = a.on ? [...new Set([...st.couplerLock, a.id])] : st.couplerLock.filter(x => x !== a.id); return [];
    case 'remote':
      st.remoteOff = a.off ? [...new Set([...st.remoteOff, a.id])] : st.remoteOff.filter(x => x !== a.id); return [a.id];
    case 'fault':
      if (!st.faults.includes(a.at)) st.faults.push(a.at); return [faultNode(m, a.at)];
    case 'stuck':
      if (!st.stuck.includes(a.id)) st.stuck.push(a.id); return [];
    case 'trip': {
      const changed: string[] = [];
      for (const id of a.ids) {
        if (st.stuck.includes(id)) continue;
        st.open[id] = true; st.tripped[id] = a.relay; changed.push(id);
      }
      (a.remote ?? []).forEach(id => { if (!st.remoteOff.includes(id)) st.remoteOff.push(id); });
      return changed;
    }
    case 'hand':
      st.handed = true; return [];
  }
}
