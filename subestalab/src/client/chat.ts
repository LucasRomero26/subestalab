/* ==========================================================================
   Chat lateral del asistente.
   - Si existe window.SUBESTALAB_CHAT_ENDPOINT, envía la pregunta al servidor
     (que arma el prompt de conocimiento/Prompt_Chat_IA.md) y muestra la respuesta.
   - Si no, responde en modo sin conexión con el glosario, las preguntas frecuentes
     y la explicación del paso que el estudiante está viendo.
   Poses del personaje: 1 neutro · 3 pensando · 2 respondiendo.
   ========================================================================== */

export interface BoardContext {
  config: string;
  mode: 'guiado' | 'practica' | 'interactivo';
  scenario?: string;
  step?: { n: number; total: number; title: string; text: string };
  error?: string;
}

type Entry = { q: string; a: string };
declare global { interface Window { SUBESTALAB_CHAT_ENDPOINT?: string } }

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ\s-]/g, ' ');
const STOP = new Set('el la los las un una unos unas de del al a en y o que por para con sin se es son como cual cuales cuando donde porque qué por what este esta estos estas lo le les mi tu su sus me te hay ser hace hacer puedo debo'.split(' '));
const tokens = (s: string) => norm(s).split(/\s+/).filter(t => t.length > 2 && !STOP.has(t));
const DOMAIN = /subestaci|interruptor|seccionador|barra|maniobra|tierra|falla|arco|acople|transferencia|by-?pass|anillo|bahia|tension|energiz|proteccion|rele|diferencial|tc\b|tp\b|dps|trampa|transformador|linea|loto|consignaci|regla|52|89|57|87|50bf|configuraci|confiabilidad|seguridad|flexibilidad|interruptor y medio|doble/;

export function startChat(root: HTMLElement) {
  const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
  const msgs = $('chat-msgs'), form = $<HTMLFormElement>('chat-form'), input = $<HTMLTextAreaElement>('chat-input');
  const speech = $('chat-bubble'), speechText = $('chat-bubble-text');
  let lastAnswer = '';
  const avatar = $('chat-avatar'), status = $('chat-status').querySelector('span:last-child')!, sugs = $('chat-sugs');
  const toggle = document.getElementById('btn-chat');
  let kb: Entry[] = [];
  try { kb = JSON.parse($('kb-data').textContent || '[]'); } catch { kb = []; }
  let ctx: BoardContext = { config: root.dataset.config || '', mode: 'guiado' };
  const history: { role: 'user' | 'assistant'; content: string }[] = [];
  let busy = false;

  const setPose = (p: 1 | 2 | 3, text: string) => { avatar.dataset.pose = String(p); status.textContent = text; root.dataset.state = String(p); };

  const open = (on: boolean) => {
    document.body.classList.toggle('chat-open', on);
    toggle?.setAttribute('aria-expanded', String(on));
    root.setAttribute('aria-hidden', String(!on));
    if (on) setTimeout(() => input.focus(), 250);
    window.dispatchEvent(new Event('resize'));
  };
  toggle?.addEventListener('click', () => open(!document.body.classList.contains('chat-open')));
  $('chat-close').addEventListener('click', () => open(false));
  window.addEventListener('subestalab:ask', (e: Event) => { open(true); send((e as CustomEvent<string>).detail); });

  /** Mensaje en el historial (arriba). Las respuestas actuales van en la nube del personaje. */
  function bubble(role: 'user' | 'bot', html = '') {
    document.getElementById('chat-empty')?.remove();
    const d = document.createElement('div');
    d.className = `msg ${role}`;
    d.innerHTML = `<p>${html}</p>`;
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
    return d.querySelector('p')!;
  }

  /** Reinicia la animación de entrada de la nube. */
  function popSpeech() {
    speech.classList.remove('is-pop');
    void speech.offsetWidth;
    speech.classList.add('is-pop');
  }
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  /** Formato mínimo: negritas de Markdown, viñetas y códigos de equipo resaltados. */
  const fmt = (s: string) => esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/^\s*[-*]\s+/gm, '• ')
    .replace(/(^|[^>\w-])(\d{2}-[A-Z0-9][A-Z0-9-]*|B[12]|BT)\b/g, '$1<b>$2</b>')
    .replace(/\n/g, '<br>');
  const note = document.getElementById('chat-note');
  let offline = !window.SUBESTALAB_CHAT_ENDPOINT;
  const setOffline = (on: boolean) => {
    offline = on;
    if (note) note.textContent = on
      ? 'Solo responde sobre subestaciones y maniobras. Modo sin conexión: respuestas de la base de conocimiento.'
      : 'Responde con IA (Claude) y solo sobre subestaciones y maniobras. Verifica siempre con tu docente.';
  };
  setOffline(offline);

  async function typeOut(p: HTMLElement, text: string) {
    setPose(2, 'Respondiendo…');
    speech.classList.remove('is-thinking');
    const words = text.split(/(\s+)/);
    let out = '';
    for (const w of words) {
      out += w;
      p.innerHTML = fmt(out) + '<span class="caret"></span>';
      speechText.scrollTop = speechText.scrollHeight;
      await new Promise(r => setTimeout(r, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 18));
    }
    p.innerHTML = fmt(text);
    setTimeout(() => { if (!busy) setPose(1, 'Listo para ayudarte'); }, 2200);
  }

  function localAnswer(q: string): string {
    const nq = norm(q);
    if (ctx.step && /(este paso|paso actual|por que (se hace|hago|esto)|explica(me)? (el|este) paso|que (hago|sigue))/.test(nq)) {
      if (ctx.mode === 'practica') return 'En el modo práctica no te doy la respuesta directa 😉. Piensa: ¿qué equipo debe operarse primero para que ningún seccionador abra con carga? Si te atascas, usa el botón «Pista».';
      return `Paso ${ctx.step.n} de ${ctx.step.total} — ${ctx.step.title}.\n${ctx.step.text}`;
    }
    const qt = tokens(q);
    let best: Entry | null = null, bestScore = 0;
    for (const e of kb) {
      const et = new Set(tokens(e.q));
      const at = new Set(tokens(e.a));
      let s = 0;
      for (const t of qt) { if (et.has(t)) s += 3; else if (at.has(t)) s += 1; }
      if (norm(e.q).length > 3 && nq.includes(norm(e.q))) s += 6;
      if (s > bestScore) { bestScore = s; best = e; }
    }
    if (best && bestScore >= 4) return best.a;
    if (!DOMAIN.test(nq)) return 'Solo puedo ayudarte con temas de subestaciones eléctricas: configuraciones de barraje, equipos de patio y maniobras de mantenimiento. ¿Quieres que te explique algo de la configuración que estás viendo?';
    return 'Todavía no estoy conectado al modelo de IA, así que solo respondo con la base de conocimiento de SubestaLab y no encontré algo preciso para esa pregunta. Prueba con otras palabras (por ejemplo «¿qué es la condición equipotencial?») o pregúntame por el paso actual.';
  }

  /**
   * Respuesta del servidor en streaming, escrita en la nube a medida que llega.
   * Devuelve null si el servidor no está disponible (se usa el modo sin conexión).
   */
  async function remoteAnswer(q: string, p: HTMLElement): Promise<string | null> {
    let r: Response;
    try {
      r = await fetch(window.SUBESTALAB_CHAT_ENDPOINT!, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, context: ctx, history: history.slice(-10) }),
      });
    } catch { return null; }
    if (r.status === 429) {
      try { return String((await r.json()).message); } catch { return 'Espera unos minutos y vuelve a intentarlo.'; }
    }
    if (!r.ok || !r.body) return null;
    setOffline(false);
    const reader = r.body.getReader();
    const dec = new TextDecoder();
    let text = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!text) { setPose(2, 'Respondiendo…'); speech.classList.remove('is-thinking'); }
      text += dec.decode(value, { stream: true });
      p.innerHTML = fmt(text) + '<span class="caret"></span>';
      speechText.scrollTop = speechText.scrollHeight;
    }
    text += dec.decode();
    p.innerHTML = fmt(text);
    // Al terminar, la nube vuelve al inicio para leer la respuesta desde el principio.
    setTimeout(() => speechText.scrollTo({ top: 0, behavior: 'smooth' }), 400);
    setTimeout(() => { if (!busy) setPose(1, 'Listo para ayudarte'); }, 2200);
    return text.trim() || null;
  }

  async function send(q: string) {
    q = q.trim();
    if (!q || busy) return;
    busy = true;
    // La respuesta anterior baja al historial; la pregunta nueva también.
    if (lastAnswer) bubble('bot', fmt(lastAnswer));
    bubble('user', esc(q));
    history.push({ role: 'user', content: q });
    input.value = '';
    autosize();
    const p = speechText;
    p.innerHTML = '<span class="typing"><i></i><i></i><i></i></span>';
    speech.classList.add('is-thinking');
    popSpeech();
    setPose(3, 'Pensando…');
    let answer = offline ? null : await remoteAnswer(q, p);
    const streamed = answer !== null && !speech.classList.contains('is-thinking');
    if (answer === null) {
      setOffline(true);
      await new Promise(r => setTimeout(r, 650 + Math.random() * 600));
      answer = localAnswer(q);
    }
    history.push({ role: 'assistant', content: answer });
    lastAnswer = answer;
    if (!streamed) await typeOut(p, answer);
    busy = false;
  }

  form.addEventListener('submit', e => { e.preventDefault(); send(input.value); });
  input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input.value); } });
  const autosize = () => { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 120) + 'px'; };
  input.addEventListener('input', autosize);

  function renderSugs() {
    const list = ctx.mode === 'practica'
      ? ['¿Qué hago ahora?', '¿Qué es la condición equipotencial?', '¿Por qué no se abre un seccionador con carga?']
      : ctx.step
        ? ['¿Por qué se hace este paso?', '¿Qué es la condición equipotencial?', '¿Qué son las cinco reglas de oro?']
        : ['¿Qué es la protección 87B?', '¿Qué son las cinco reglas de oro?', '¿Por qué no se abre un seccionador con carga?'];
    sugs.innerHTML = list.map(s => `<button type="button" class="sug">${esc(s)}</button>`).join('');
    sugs.querySelectorAll<HTMLButtonElement>('.sug').forEach(b => b.addEventListener('click', () => send(b.textContent || '')));
  }
  window.addEventListener('subestalab:context', (e: Event) => { ctx = { ...ctx, ...(e as CustomEvent<BoardContext>).detail }; renderSugs(); });
  renderSugs();
  setPose(1, 'Listo para ayudarte');
}

/** Publica el contexto del tablero para el chat. */
export const publishContext = (c: Partial<BoardContext>) =>
  window.dispatchEvent(new CustomEvent('subestalab:context', { detail: c }));
