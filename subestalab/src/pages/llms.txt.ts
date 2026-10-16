/* llms.txt (https://llmstxt.org): guía en Markdown del sitio para modelos de lenguaje. */
import type { APIRoute } from 'astro';
import { CONFIGS } from '../data/configs';
import { AUTHOR, COURSE, TEACHER, UNIVERSITY } from '../lib/brand';

export const prerender = true;

export const GET: APIRoute = ({ site }) => {
  const u = (p: string) => new URL(p, site).href;
  const body = `# SubestaLab

> Aplicación educativa en español para estudiar, paso a paso, las maniobras de operación durante el mantenimiento de interruptores y barras en 10 configuraciones de barraje de subestaciones eléctricas, con diagramas unifilares animados, modo práctica, modo interactivo y un asistente con IA.

Material de apoyo del curso ${COURSE} (${UNIVERSITY}, Prof. ${TEACHER}). Desarrollado por ${AUTHOR}.

Cada configuración incluye tres escenarios: mantenimiento de barra (o salida de un circuito en las configuraciones en anillo), mantenimiento de un interruptor y una falla con actuación de protecciones. Las secuencias son didácticas: en una instalación real manda el procedimiento aprobado por el Centro de Control.

## Páginas

- [Inicio](${u('/')}): presentación de SubestaLab y demostración de una maniobra.
- [Configuraciones](${u('/configuraciones/')}): las 10 configuraciones con su flexibilidad, confiabilidad y seguridad.
- [Modo interactivo](${u('/laboratorio/')}): diseña tu propia configuración y simula maniobras y fallas.

## Configuraciones

${CONFIGS.map(c => `- [${c.name}](${u(`/configuraciones/${c.slug}/`)}): ${c.summary}`).join('\n')}

## Conocimiento

- [Base de conocimiento completa](${u('/llms-full.txt')}): teoría, equipos, protecciones ANSI, reglas de maniobra y de seguridad (RETIE) y las secuencias paso a paso de los 30 escenarios.
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
