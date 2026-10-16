# SubestaLab

Aplicación educativa para estudiar las maniobras de mantenimiento de interruptores y barras en las 10 configuraciones de barraje del curso *Subestaciones Eléctricas — Tema 2*.

- **Inicio** (`/`): la landing.
- **Configuraciones** (`/configuraciones`): panel para elegir una de las 10 configuraciones.
- **Tablero de estudio** (`/configuraciones/<slug>`): 3 escenarios por configuración (mantenimiento de barra, mantenimiento de interruptor y falla), recorrido guiado paso a paso y modo práctica.
- **Modo interactivo** (`/laboratorio`): diseña tu propia configuración y simula maniobras y fallas, o maniobra libremente cualquiera de las 10.
- **Asistente**: columna lateral con el personaje, que responde con Claude Haiku 5.5. Sin conexión, responde con la base de conocimiento.

La teoría, las reglas y las secuencias salen de `../conocimiento/SubestaLab_Base_Conocimiento.md`.

## Comandos

```sh
npm install
npm run dev        # servidor de desarrollo en http://localhost:4321
npm run build      # sitio estático en dist/
npm run preview    # sirve dist/
npm run validate   # recorre los 30 escenarios con el motor eléctrico: ningún paso debe causar arco ni cortocircuito
npm run check      # verificación de tipos
```

## Estructura

```
src/
  lib/
    model.ts       Modelo de diagrama (nodos, equipos, geometría) y constructor de diagramas
    bays.ts        Plantillas: salida de línea/transformador, selectores de doble barra, acople, tierra de barra
    symbols.ts     Símbolos SVG (52, 89, 57, TC, TP, DPS, trampa de onda, trafo, candado, tierra portátil)
    render.ts      Model → SVG
    engine.ts      Motor eléctrico: energización por conectividad, arcos y cortocircuitos
    actions.ts     Aplica y evalúa las acciones de los pasos (compartido con el validador)
    view.ts        Aplica el estado eléctrico al SVG (colores, cascadas, candados)
    scenario.ts    Tipos de escenario y atajos para escribir pasos
  data/
    layouts.ts                 Los 10 diagramas
    configs-barras.ts          Configuraciones 1–6 con sus escenarios
    configs-interruptores.ts   Configuraciones 7–10 con sus escenarios
  client/
    board.ts       Tablero: recorrido guiado, modo práctica, bitácora, tarjetas
    lab.ts         Modo interactivo
    fx.ts          Efectos: arco eléctrico, chispas, TRIP, zona de trabajo, pulsos
    chat.ts        Asistente (modo sin conexión + conexión opcional a un servidor)
  pages/           index (landing), configuraciones/, configuraciones/[slug], laboratorio
  styles/          global, sld (diagramas), board, lab, landing
scripts/validate.ts
public/personaje/  Poses del personaje en WebP (1 neutro, 2 respondiendo, 3 pensando)
```

## Cómo agregar o cambiar un paso

Los escenarios están en `src/data/configs-*.ts` y se escriben con los atajos de `src/lib/scenario.ts`:

```ts
open('52-T1', 'Explicación que verá el estudiante…'),
close('89-T1-T', '…', 'Medio'),
lock(['89-T1-L', '89-T1-B']),
verify('52-T1'),
pat('52-T1'),
...any('grupo', [ /* pasos que pueden hacerse en cualquier orden en la práctica */ ]),
```

Después de cualquier cambio, ejecuta `npm run validate`.

## Enlaces directos

- `?esc=B` abre el escenario B.
- `?paso=6` salta al paso 6 del recorrido guiado.
- `?modo=practica` abre directamente el modo práctica.
- `?chat` abre el asistente.

Ejemplo: `/configuraciones/doble-barra/?esc=A&paso=4&chat`.

## Asistente con IA (Claude Haiku 5.5)

El chat llama a `POST /api/chat` (`src/pages/api/chat.ts`), que se ejecuta en el servidor con el adaptador de Node de Astro. Las páginas siguen siendo estáticas.

1. Pon tu clave en `subestalab/.env` con la forma `ANTHROPIC_API_KEY=...`. Ese archivo está en `.gitignore`: nunca lo subas a un repositorio.
2. Desarrollo: `npm run dev`. Producción: `npm run build` y luego `npm run start`, que lee `.env`.
3. Opcional: `CHAT_DAILY_LIMIT=400` en `.env` (tope de preguntas por día).

Detalles:
- **Prompt:** el prompt de sistema sale de `../conocimiento/Prompt_Chat_IA.md` (sección 1) y la base de conocimiento completa va cacheada. Ambos se incluyen al compilar; si editas esos documentos, vuelve a compilar.
- **Modelo:** `claude-haiku-5-5` con `effort: low` y respuesta en streaming.
- **Límites:** 20 preguntas cada 10 minutos por IP y el tope diario.
- **Costo medido:** cada pregunta usa unos 40.000 tokens de entrada. La primera escribe el caché (≈ $0,005) y las siguientes, mientras el caché está vigente (5 min), cuestan ≈ $0,0006 cada una.
- **Respaldo:** si no hay clave, el servidor no responde o el sitio se publica como estático, el chat pasa solo al modo sin conexión (glosario y preguntas frecuentes).

## SEO y archivos para buscadores

- **Dominio:** antes de compilar para producción, define el dominio real en `.env` con `SITE_URL=https://tu-dominio`. De él salen la URL canónica, `og:image`, `sitemap.xml` y `robots.txt`.
- **Metadatos:** cada página declara su título, descripción e imagen OG en `src/components/Seo.astro`, y sus datos estructurados en `src/lib/schema.ts`.
- **Imágenes Open Graph (1200×630):** `npm run og` las regenera en `public/og/` usando el Chrome instalado (o `CHROME_PATH`). Hay que correrlo si cambian los diagramas o los nombres.
- **Archivos generados al compilar:** `robots.txt`, `sitemap.xml`, `llms.txt`, `llms-full.txt` (la base de conocimiento completa) y la página `404`.
- **Auditoría:** `npm run build` y luego `npm run audit` revisa título, descripción, H1, canónica, OG, JSON-LD, `lang`, `alt`, títulos repetidos, archivos especiales y que no haya source maps publicados.

## Pendientes

- Elegir hosting con Node (o cambiar el adaptador a Vercel/Netlify) para publicar el chat con IA, y definir `SITE_URL` con el dominio real.
