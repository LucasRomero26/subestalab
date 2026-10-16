/* ==========================================================================
   Armado del prompt del asistente (solo servidor).
   Fuente: conocimiento/Prompt_Chat_IA.md y conocimiento/SubestaLab_Base_Conocimiento.md
   ========================================================================== */
import promptMd from '../../../conocimiento/Prompt_Chat_IA.md?raw';
import kbMd from '../../../conocimiento/SubestaLab_Base_Conocimiento.md?raw';

/** El prompt de sistema es el primer bloque ```text de la sección 1 del documento. */
function extractSystemPrompt(md: string): string {
  const section = md.indexOf('## 1. Prompt de sistema');
  const start = md.indexOf('```text', section);
  const end = md.indexOf('```', start + 7);
  if (section < 0 || start < 0 || end < 0) throw new Error('No se encontró el prompt de sistema en Prompt_Chat_IA.md');
  return md.slice(start + 7, end).trim();
}

export const SYSTEM_PROMPT = extractSystemPrompt(promptMd);
export const KNOWLEDGE = `<base_conocimiento>\n${kbMd.trim()}\n</base_conocimiento>`;

export interface ChatContext {
  config?: string;
  mode?: string;
  scenario?: string;
  step?: { n: number; total: number; title: string; text: string };
}

const clip = (s: unknown, n: number) => String(s ?? '').replace(/[<>]/g, '').slice(0, n);

/** Bloque <contexto_tablero> que acompaña cada pregunta (formato de Prompt_Chat_IA.md §3). */
export function contextBlock(ctx: ChatContext | undefined): string {
  const c = ctx ?? {};
  const lines = [
    `modo: ${clip(c.mode, 20) || 'guiado'}`,
    `configuracion: ${clip(c.config, 80) || 'sin especificar'}`,
  ];
  if (c.scenario) lines.push(`escenario: ${clip(c.scenario, 120)}`);
  if (c.step) lines.push(`paso_actual: ${Number(c.step.n) || 0} de ${Number(c.step.total) || 0} — ${clip(c.step.title, 120)}: ${clip(c.step.text, 600)}`);
  return `<contexto_tablero>\n${lines.join('\n')}\n</contexto_tablero>`;
}
