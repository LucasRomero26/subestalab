/* ==========================================================================
   Escenarios de maniobra: pasos que el modo guiado reproduce y que el modo
   práctica pide al estudiante. Fuente: conocimiento/SubestaLab_Base_Conocimiento.md
   ========================================================================== */
import type { Model } from './model';

export type Risk = 'Bajo' | 'Medio' | 'Alto';

export type Action =
  | { op: 'open' | 'close'; id: string }
  | { op: 'lock'; ids: string[] }
  | { op: 'verify'; target: string }
  | { op: 'pat'; id: string }
  | { op: 'protect'; circuit: string; to: string }
  | { op: 'couplerLock'; id: string; on: boolean }
  | { op: 'remote'; id: string; off: boolean }
  | { op: 'fault'; at: string }
  | { op: 'trip'; ids: string[]; relay: string; remote?: string[] }
  | { op: 'stuck'; id: string }
  | { op: 'hand' };

/** Herramientas del modo práctica (los pasos que no son abrir/cerrar un equipo). */
export type Tool = 'loto' | 'verify' | 'pat' | 'protect' | 'coupler';

export type StepKind = 'info' | 'op' | 'tool' | 'event';

export interface Step {
  title: string;
  text: string;
  risk: Risk;
  kind: StepKind;
  acts: Action[];
  /** Elemento (equipo, barra o nodo) al que se ancla la tarjeta. */
  focus?: string;
  /** Pasos con el mismo grupo se pueden hacer en cualquier orden en el modo práctica. */
  group?: string;
  /** Herramienta que el estudiante debe elegir en el modo práctica. */
  tool?: Tool;
  /** Objetivos válidos para la herramienta (equipo, barra o nodo). */
  targets?: string[];
  /** Pista para el modo práctica. */
  hint?: string;
}

export interface Scenario {
  key: 'A' | 'B' | 'C';
  title: string;
  short: string;
  goal: string;
  outcome: string;
  steps: Step[];
}

export type Level = 'Básica' | 'Intermedia' | 'Avanzada';
export type Rating = 'No tiene' | 'Baja' | 'Media' | 'Alta' | 'Muy alta';

export interface ConfigDef {
  n: number;
  slug: string;
  name: string;
  short: string;
  level: Level;
  trend: 'Conexión de barras' | 'Conexión de interruptores';
  summary: string;
  pros: string[];
  cons: string[];
  ratings: { flex: Rating; conf: Rating; seg: Rating };
  cost: string;
  breakersPerCircuit: string;
  provisional?: string;
  build: () => Model;
  scenarios: Scenario[];
}

/* ---------- Atajos para escribir pasos ---------- */

export const open = (id: string, text: string, risk: Risk = 'Medio', o: Partial<Step> = {}): Step =>
  ({ title: `Abrir ${id}`, text, risk, kind: 'op', acts: [{ op: 'open', id }], focus: id, ...o });

export const close = (id: string, text: string, risk: Risk = 'Medio', o: Partial<Step> = {}): Step =>
  ({ title: `Cerrar ${id}`, text, risk, kind: 'op', acts: [{ op: 'close', id }], focus: id, ...o });

export const info = (title: string, text: string, o: Partial<Step> = {}): Step =>
  ({ title, text, risk: 'Bajo', kind: 'info', acts: [], ...o });

export const lock = (ids: string[], text = 'Candados y tarjetas de "No operar" en los mandos (LOTO). Nadie podrá cerrarlos mientras dure el trabajo.'): Step =>
  ({ title: 'Bloquear y señalizar (LOTO)', text, risk: 'Bajo', kind: 'tool', tool: 'loto', acts: [{ op: 'lock', ids }], focus: ids[0], targets: ids,
     hint: 'Usa la herramienta de bloqueo (candado) sobre los seccionadores que aíslan la zona de trabajo.' });

export const verify = (target: string, text = 'Se prueba el detector, se mide fase por fase y se vuelve a probar el detector. Lectura: 0 kV.', risk: Risk = 'Medio'): Step =>
  ({ title: `Verificar ausencia de tensión en ${target}`, text, risk, kind: 'tool', tool: 'verify', acts: [{ op: 'verify', target }], focus: target, targets: [target],
     hint: 'Antes de poner a tierra, la tercera regla de oro: verificar ausencia de tensión.' });

export const pat = (id: string, text = 'Tierras portátiles a ambos lados del interruptor: cualquier reenergización accidental se iría a tierra.'): Step =>
  ({ title: `Instalar tierras portátiles en ${id}`, text, risk: 'Bajo', kind: 'tool', tool: 'pat', acts: [{ op: 'pat', id }], focus: id, targets: [id],
     hint: 'Cuarta regla de oro: puesta a tierra y en cortocircuito a ambos lados del equipo.' });

export const protect = (circuit: string, to: string, text: string): Step =>
  ({ title: `Transferir protecciones de ${circuit} al ${to}`, text, risk: 'Bajo', kind: 'tool', tool: 'protect', acts: [{ op: 'protect', circuit, to }], focus: to, targets: [to],
     hint: `El interruptor que va a reemplazar al de ${circuit} necesita sus ajustes de protección.` });

export const couplerLock = (id: string, on: boolean, text: string): Step =>
  ({ title: on ? `Bloquear ${id} en cerrado` : `Desbloquear ${id}`, text, risk: on ? 'Medio' : 'Bajo', kind: 'tool', tool: 'coupler', acts: [{ op: 'couplerLock', id, on }], focus: id, targets: [id],
     hint: on ? 'Durante los cambios de barra el acople no puede abrirse: bloquéalo en cerrado.' : 'Terminado el cambio de barras, devuelve el mando al acople.' });

export const hand = (text = 'Se delimita y señaliza la zona de trabajo (quinta regla de oro) y se entrega el equipo en consignación.'): Step =>
  ({ title: 'Entregar en consignación', text, risk: 'Bajo', kind: 'info', acts: [{ op: 'hand' }] });

export const event = (title: string, text: string, acts: Action[], risk: Risk = 'Alto', focus?: string): Step =>
  ({ title, text, risk, kind: 'event', acts, focus });

/** Marca un conjunto de pasos como intercambiables entre sí. */
export const any = (group: string, steps: Step[]) => steps.map(s => ({ ...s, group }));
