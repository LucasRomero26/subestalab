/* ==========================================================================
   POST /api/chat — Asistente de SubestaLab con Claude Haiku 5.5.
   Petición:  { question, context, history }
   Respuesta: texto plano en streaming (text/plain).
   503 si no hay API key (el cliente pasa al modo sin conexión), 429 si se supera el límite.
   ========================================================================== */
import type { APIRoute } from 'astro';
import Anthropic from '@anthropic-ai/sdk';
import { ANTHROPIC_API_KEY, CHAT_DAILY_LIMIT } from 'astro:env/server';
import { KNOWLEDGE, SYSTEM_PROMPT, contextBlock, type ChatContext } from '../../lib/chat-prompt';

export const prerender = false;

const MODEL = 'claude-haiku-5-5';
const MAX_QUESTION = 600;
const MAX_HISTORY = 10;
const PER_IP = { max: 20, windowMs: 10 * 60 * 1000 };

let client: Anthropic | null = null;
const hits = new Map<string, number[]>();
let today = '';
let todayCount = 0;

const json = (body: object, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });

/** Límite por IP y tope diario global (protege el saldo de créditos). */
function rateLimited(ip: string): string | null {
  const now = Date.now();
  const d = new Date().toISOString().slice(0, 10);
  if (d !== today) { today = d; todayCount = 0; }
  if (todayCount >= (CHAT_DAILY_LIMIT ?? 400)) return 'El asistente alcanzó el límite de preguntas de hoy. Vuelve mañana o usa el modo sin conexión.';
  const list = (hits.get(ip) ?? []).filter(t => now - t < PER_IP.windowMs);
  if (list.length >= PER_IP.max) return 'Hiciste muchas preguntas seguidas. Espera unos minutos y vuelve a intentarlo.';
  list.push(now);
  hits.set(ip, list);
  todayCount++;
  return null;
}

/** Historial saneado: solo roles user/assistant, texto recortado, empezando por user. */
function cleanHistory(raw: unknown): Anthropic.MessageParam[] {
  if (!Array.isArray(raw)) return [];
  const msgs = raw
    .filter((m): m is { role: 'user' | 'assistant'; content: string } =>
      !!m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim() !== '')
    .slice(-MAX_HISTORY)
    .map(m => ({ role: m.role, content: m.content.slice(0, 2000) }));
  while (msgs.length && msgs[0].role !== 'user') msgs.shift();
  return msgs;
}

function errorText(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) return 'El asistente no está bien configurado (clave de API inválida).';
  if (err instanceof Anthropic.RateLimitError) return 'El asistente está recibiendo muchas preguntas. Intenta de nuevo en unos segundos.';
  if (err instanceof Anthropic.APIError && err.status === 402) return 'El asistente se quedó sin créditos de API.';
  if (err instanceof Anthropic.APIError) return 'El asistente tuvo un problema al responder. Intenta de nuevo.';
  return 'No pude conectarme con el asistente. Intenta de nuevo.';
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  if (!ANTHROPIC_API_KEY) return json({ error: 'not_configured' }, 503);

  let body: { question?: unknown; context?: ChatContext; history?: unknown };
  try { body = await request.json(); } catch { return json({ error: 'bad_request' }, 400); }
  const question = typeof body.question === 'string' ? body.question.trim().slice(0, MAX_QUESTION) : '';
  if (!question) return json({ error: 'bad_request' }, 400);

  let ip = 'local';
  try { ip = clientAddress || 'local'; } catch { /* sin dirección en algunos entornos */ }
  const limit = rateLimited(ip);
  if (limit) return json({ error: 'rate_limited', message: limit }, 429);

  // La pregunta llega como historial previo + contexto del tablero + pregunta actual.
  const history = cleanHistory(body.history);
  if (history.length && history[history.length - 1].role === 'user') history.pop(); // la pregunta actual va abajo
  const messages: Anthropic.MessageParam[] = [
    ...history,
    { role: 'user', content: `${contextBlock(body.context)}\n\nPregunta del estudiante: ${question}` },
  ];

  client ??= new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 2048, // incluye el pensamiento adaptativo; las respuestas son cortas por diseño
    output_config: { effort: 'low' },
    system: [
      { type: 'text', text: SYSTEM_PROMPT },
      // La base de conocimiento es idéntica en todas las llamadas: se cachea.
      { type: 'text', text: KNOWLEDGE, cache_control: { type: 'ephemeral' } },
    ],
    messages,
  });

  const enc = new TextEncoder();
  const out = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(enc.encode(event.delta.text));
          }
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === 'refusal') {
          controller.enqueue(enc.encode('\n\nNo puedo ayudarte con eso. Pregúntame sobre subestaciones, equipos o maniobras.'));
        } else if (final.stop_reason === 'max_tokens') {
          controller.enqueue(enc.encode('…'));
        }
        const u = final.usage;
        console.log(`[chat] ${MODEL} in=${u.input_tokens} cache_read=${u.cache_read_input_tokens ?? 0} cache_write=${u.cache_creation_input_tokens ?? 0} out=${u.output_tokens} stop=${final.stop_reason}`);
      } catch (err) {
        console.error('[chat] error:', err instanceof Anthropic.APIError ? `${err.status} ${err.message}` : err);
        controller.enqueue(enc.encode(errorText(err)));
      } finally {
        controller.close();
      }
    },
    cancel() { stream.abort(); },
  });

  return new Response(out, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' },
  });
};
