/* Páginas públicas indexables (sitemap.xml y llms.txt). */
import { CONFIGS } from '../data/configs';

export interface PublicPage { path: string; title: string; summary: string; priority: number }

export const PUBLIC_PAGES: PublicPage[] = [
  { path: '/', title: 'Inicio', summary: 'Qué es SubestaLab y cómo funciona: 10 configuraciones de barraje, recorrido guiado, modo práctica y modo interactivo.', priority: 1 },
  { path: '/configuraciones/', title: 'Configuraciones de barraje', summary: 'Panel con las 10 configuraciones, su flexibilidad, confiabilidad y seguridad.', priority: 0.9 },
  ...CONFIGS.map(c => ({ path: `/configuraciones/${c.slug}/`, title: c.name, summary: `${c.summary} Escenarios: ${c.scenarios.map(s => s.title).join('; ')}.`, priority: 0.8 })),
  { path: '/laboratorio/', title: 'Modo interactivo', summary: 'Editor para diseñar una configuración propia y simular maniobras y fallas.', priority: 0.7 },
];
