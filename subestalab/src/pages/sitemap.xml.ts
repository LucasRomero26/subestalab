import type { APIRoute } from 'astro';
import { PUBLIC_PAGES } from '../lib/routes';

export const prerender = true;

export const GET: APIRoute = ({ site }) => {
  const lastmod = new Date().toISOString().slice(0, 10);
  const urls = PUBLIC_PAGES.map(p =>
    `  <url>\n    <loc>${new URL(p.path, site).href}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <priority>${p.priority.toFixed(1)}</priority>\n  </url>`).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
