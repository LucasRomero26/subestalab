/* llms-full.txt: la base de conocimiento completa de SubestaLab en Markdown. */
import type { APIRoute } from 'astro';
import kb from '../../../conocimiento/SubestaLab_Base_Conocimiento.md?raw';

export const prerender = true;

export const GET: APIRoute = () =>
  new Response(kb, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
