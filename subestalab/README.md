# SubestaLab

Educational app for learning the maintenance switching procedures for circuit breakers and busbars in the 10 bus configurations of the course *Subestaciones Eléctricas — Tema 2*. The UI and content are in Spanish.

- **Home** (`/`): the landing page.
- **Configurations** (`/configuraciones`): pick one of the 10 configurations.
- **Study board** (`/configuraciones/<slug>`): 3 scenarios per configuration (bus maintenance, breaker maintenance and a fault), a step-by-step guided walkthrough and a practice mode. The diagram can be zoomed (mouse wheel, pinch, buttons or the + / - / 0 keys) and dragged to pan.
- **Interactive mode** (`/laboratorio`): design your own configuration and simulate switching and faults, or freely operate any of the 10.
- **Assistant**: side panel with the character, powered by Claude Haiku 5.5. Offline, it answers from the knowledge base.

Theory, rules and switching sequences come from `../conocimiento/SubestaLab_Base_Conocimiento.md`.

## Commands

```sh
npm install
npm run dev        # dev server at http://localhost:4321
npm run build      # build to dist/
npm run start      # run the production build locally (reads .env)
npm run validate   # runs the 30 scenarios through the electrical engine: no step may cause an arc or short circuit
npm run check      # type check
npm run og         # regenerate the Open Graph images in public/og/
npm run audit      # SEO and technical audit of the build (run after build)
```

## Structure

```
src/
  lib/
    model.ts       Diagram model (nodes, devices, geometry) and diagram builder
    bays.ts        Templates: line/transformer outputs, double-bus selectors, bus coupler, bus earthing
    symbols.ts     SVG symbols (52, 89, 57, CT, VT, surge arrester, line trap, transformer, padlock, portable earth)
    render.ts      Model → SVG
    engine.ts      Electrical engine: energization by connectivity, arcs and short circuits
    actions.ts     Applies and evaluates scenario step actions (shared with the validator)
    view.ts        Applies the electrical state to the SVG (colors, cascades, padlocks)
    scenario.ts    Scenario types and helpers for writing steps
    schema.ts      Schema.org structured data (JSON-LD)
    chat-prompt.ts Builds the assistant prompt (server only)
  data/
    layouts.ts                 The 10 diagrams
    configs-barras.ts          Configurations 1–6 and their scenarios
    configs-interruptores.ts   Configurations 7–10 and their scenarios
  client/
    board.ts       Study board: guided walkthrough, practice mode, log, step cards
    zoom.ts        Diagram zoom (wheel, pinch, buttons, +/-/0 keys) and drag to pan
    lab.ts         Interactive mode
    fx.ts          Effects: electric arc, sparks, TRIP tags, work zone, pulses
    chat.ts        Assistant (streaming from the server, with offline fallback)
  components/      Header, assistant panel and button, SEO tags
  pages/           index (landing), configuraciones/, configuraciones/[slug], laboratorio, 404,
                   api/chat, robots.txt, sitemap.xml, llms.txt, llms-full.txt
  styles/          global, sld (diagrams), board, lab, landing
scripts/           validate.ts, og.ts, seo-audit.mjs
public/            og/ (Open Graph images), personaje/ (character poses in WebP), assets/
```

## Adding or changing a step

Scenarios live in `src/data/configs-*.ts` and are written with the helpers in `src/lib/scenario.ts` (step text is in Spanish):

```ts
open('52-T1', 'Explanation shown to the student…'),
close('89-T1-T', '…', 'Medio'),
lock(['89-T1-L', '89-T1-B']),
verify('52-T1'),
pat('52-T1'),
...any('group', [ /* steps that may be done in any order in practice mode */ ]),
```

After any change, run `npm run validate`.

## Deep links

- `?esc=B` opens scenario B.
- `?paso=6` jumps to step 6 of the guided walkthrough.
- `?modo=practica` opens practice mode directly.
- `?chat` opens the assistant.

Example: `/configuraciones/doble-barra/?esc=A&paso=4&chat`.

## AI assistant (Claude Haiku 5.5)

The chat calls `POST /api/chat` (`src/pages/api/chat.ts`), which runs on the server. All pages stay static.

1. Put your key in `subestalab/.env` as `ANTHROPIC_API_KEY=...` (see `.env.example`). The file is git-ignored: never commit it.
2. Development: `npm run dev`. Production: `npm run build`, then `npm run start`.
3. Optional: `CHAT_DAILY_LIMIT=400` in `.env` (daily question cap).

Details:
- **Prompt:** the system prompt comes from `../conocimiento/Prompt_Chat_IA.md` (section 1), and the full knowledge base is sent as a cached block. Both are bundled at build time; rebuild after editing them.
- **Model:** `claude-haiku-5-5` with `effort: low` and a streamed response.
- **Limits:** 20 questions per 10 minutes per IP, plus the daily cap.
- **Measured cost:** each question uses about 40,000 input tokens. The first one writes the cache (≈ $0.005); while the cache is warm (5 min), each following question costs ≈ $0.0006.
- **Fallback:** if there is no key, the server does not respond, or the site is deployed as static only, the chat switches to offline mode (glossary and FAQ).

## Deployment

The adapter is picked automatically: `@astrojs/vercel` when building on Vercel (the `VERCEL` environment variable is set), and `@astrojs/node` (standalone) everywhere else.

On Vercel:
- **Root Directory:** `subestalab`, with *Include files outside the root directory in the Build Step* enabled (the app imports `../conocimiento`).
- **Environment variables:** `ANTHROPIC_API_KEY`, `SITE_URL` and optionally `CHAT_DAILY_LIMIT`.

Building with the Vercel adapter fails on Windows (`EISDIR ... readlink`, a known `@vercel/nft` issue), but it works on Vercel's Linux builders. Locally, use the Node build.

## SEO and crawler files

- **Domain:** before a production build, set the real domain with `SITE_URL=https://your-domain` (in `.env` or the hosting environment). It drives the canonical URL, `og:image`, `sitemap.xml` and `robots.txt`.
- **Metadata:** each page sets its title, description and Open Graph image through `src/components/Seo.astro`, and its structured data through `src/lib/schema.ts`.
- **Open Graph images (1200×630):** `npm run og` regenerates them in `public/og/` using the installed Chrome (or `CHROME_PATH`). Run it whenever diagrams or names change.
- **Generated at build time:** `robots.txt`, `sitemap.xml`, `llms.txt`, `llms-full.txt` (the full knowledge base) and the `404` page.
- **Audit:** `npm run build`, then `npm run audit`. It checks title, description, H1, canonical, Open Graph, JSON-LD, `lang`, `alt`, duplicate titles, the special files, and that no source maps are published.
