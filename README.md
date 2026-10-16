# SubestaLab

Educational web app for learning, step by step, the switching procedures used during maintenance of circuit breakers and busbars in 10 electrical substation bus configurations.

Supporting material for the course *Subestaciones Eléctricas — Tema 2: Configuración de Subestaciones* (Universidad del Norte, Prof. Jose David Doria García). Developed by Lucas Romero Mercado.

The app content (UI, knowledge base and AI assistant) is in Spanish.

## Repository contents

| Folder | Contents |
|---|---|
| `subestalab/` | The web app (Astro). See [`subestalab/README.md`](subestalab/README.md). |
| `conocimiento/` | Knowledge base (theory, switching rules and the 30 scenarios) and the AI assistant prompt. The app bundles it at build time. |
| `Landing_Page/` | Original design of the home page. |
| `Poses_Personaje/` | Original character poses (1 neutral, 2 answering, 3 thinking). |

## Quick start

```sh
cd subestalab
npm install
cp .env.example .env   # then fill in ANTHROPIC_API_KEY
npm run dev
```
