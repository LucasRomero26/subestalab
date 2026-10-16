import type { APIRoute } from 'astro';

export const prerender = true;

export const GET: APIRoute = ({ site }) => {
  const body = [
    'User-agent: *',
    'Allow: /',
    '# El endpoint del asistente no es una página',
    'Disallow: /api/',
    '',
    `Sitemap: ${new URL('/sitemap.xml', site).href}`,
    '',
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
