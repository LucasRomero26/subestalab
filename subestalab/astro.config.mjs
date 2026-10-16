// @ts-check
import { defineConfig, envField } from 'astro/config';
import node from '@astrojs/node';
import vercel from '@astrojs/vercel';
import { loadEnv } from 'vite';

// Dominio público del sitio: se usa en la URL canónica, Open Graph, sitemap.xml y robots.txt.
// Defínelo en .env (SITE_URL=https://tu-dominio) antes de compilar para producción.
const { SITE_URL } = loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), '');

export default defineConfig({
  site: SITE_URL || 'https://subestalab.example',
  devToolbar: { enabled: false },
  // Las páginas siguen siendo estáticas; solo /api/chat se ejecuta en el servidor.
  // En Vercel (variable VERCEL presente) se usa su adaptador; en local, el servidor de Node.
  adapter: process.env.VERCEL ? vercel({ maxDuration: 30 }) : node({ mode: 'standalone' }),
  build: { format: 'directory' },
  vite: {
    // Permite importar la base de conocimiento desde ../conocimiento
    server: { fs: { allow: ['..'] } },
    // Nunca publicar mapas de código fuente
    build: { sourcemap: false },
  },
  env: {
    schema: {
      // Se lee en tiempo de ejecución desde .env o el entorno del servidor; nunca se incrusta en el código.
      ANTHROPIC_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      // Tope de preguntas por día para proteger el saldo de la API.
      CHAT_DAILY_LIMIT: envField.number({ context: 'server', access: 'secret', optional: true, default: 400 }),
    },
  },
});
