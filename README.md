# SubestaLab

Aplicación educativa para estudiar, paso a paso, las maniobras de operación durante el mantenimiento de interruptores y barras en 10 configuraciones de barraje de subestaciones eléctricas.

Material de apoyo del curso *Subestaciones Eléctricas — Tema 2: Configuración de Subestaciones* (Universidad del Norte, Prof. Jose David Doria García). Desarrollado por Lucas Romero Mercado.

## Contenido del repositorio

| Carpeta | Contenido |
|---|---|
| `subestalab/` | La aplicación web (Astro). Instrucciones en [`subestalab/README.md`](subestalab/README.md). |
| `conocimiento/` | Base de conocimiento (teoría, reglas de maniobra y los 30 escenarios) y el prompt del asistente con IA. La aplicación la incluye al compilar. |
| `Landing_Page/` | Diseño original de la página de inicio. |
| `Poses_Personaje/` | Poses originales del personaje (1 neutro, 2 respondiendo, 3 pensando). |

## Inicio rápido

```sh
cd subestalab
npm install
cp .env.example .env   # y completa ANTHROPIC_API_KEY
npm run dev
```
