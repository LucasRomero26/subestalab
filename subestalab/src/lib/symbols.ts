/* ==========================================================================
   Biblioteca de símbolos SVG (IEC / ANSI). Coordenadas locales, orientación
   vertical, terminales en el eje y. Las piezas que pertenecen a un nodo
   eléctrico llevan data-n para que el motor las coloree según su estado.
   ========================================================================== */

export const r2 = (n: number) => Math.round(n * 100) / 100;

export const groundPath = (y: number) => `M-9 ${y}H9M-5.5 ${y + 5}H5.5M-2 ${y + 10}H2`;

const dn = (n?: string) => (n ? ` data-n="${n}"` : '');

export const SYM = {
  /** Interruptor 52. Cerrado = relleno; abierto = hueco con contactos separados. */
  brk: (a?: string, b?: string) =>
    `<rect class="brk-body" x="-14" y="-14" width="28" height="28" rx="6"/>` +
    `<path class="c"${dn(a)} d="M0 -14V-5"/><path class="c"${dn(b)} d="M0 14V5"/>` +
    `<g class="spark"><path d="M-6 -2L-2 1L-5 3M6 -3L2 0L5 2M0 -4L1 0L-1 4"/></g>`,

  /** Seccionador 89: contacto fijo arriba, cuchilla sobre pivote. Abierto = 30°. */
  disc: (a?: string, b?: string) =>
    `<path class="c"${dn(a)} d="M-6.5 -14H6.5"/>` +
    `<g transform="translate(0 14)"><g class="blade"><path class="c"${dn(b)} d="M0 0V-28"/></g></g>` +
    `<circle class="piv" cy="14" r="3"/>`,

  /** Seccionador de puesta a tierra 57: cuchilla con pivote del lado de tierra. */
  earth: (a?: string) =>
    `<path class="c"${dn(a)} d="M-6.5 -14H6.5"/>` +
    `<g transform="translate(0 14)"><g class="blade"><path class="c gnd-blade" d="M0 0V-28"/></g></g>` +
    `<circle class="piv" cy="14" r="3"/><path class="k" d="M0 17V21${groundPath(21)}"/>`,

  /** Transformador de corriente: anillo alrededor del conductor. */
  ct: () => `<circle class="k ct-ring" r="10"/>`,

  /** Trampa de onda: bobina en serie (tapa el conductor con un fondo blanco). */
  to: (n?: string) =>
    `<rect class="wf-bg" x="-6" y="-12" width="12" height="24"/>` +
    `<path class="c"${dn(n)} d="M0 -16V-10a2.5 2.5 0 0 1 0 5a2.5 2.5 0 0 1 0 5a2.5 2.5 0 0 1 0 5a2.5 2.5 0 0 1 0 5V16"/>`,

  /** Transformador de potencial: dos devanados acoplados, conexión arriba. */
  vt: (n?: string) =>
    `<path class="c"${dn(n)} d="M0 -20V-12"/><circle class="k wf" cy="-4.5" r="7.5"/><circle class="k nf" cy="5.5" r="7.5"/>` +
    `<path class="k" d="M0 13V17${groundPath(17)}"/>`,

  /** Descargador de sobretensiones: cuerpo resistivo con flecha, a tierra. */
  dps: (n?: string) =>
    `<path class="c"${dn(n)} d="M0 -20V-11"/><rect class="k wf dps-body" x="-6.5" y="-11" width="13" height="22" rx="1.5"/>` +
    `<path class="k" d="M0 -6V2"/><path class="fk" d="M0 7L-3.6 1.5H3.6Z"/><path class="k" d="M0 11V16${groundPath(16)}"/>`,

  /** Transformador de potencia (dos devanados). */
  trafo: (n?: string, load?: string) =>
    `<circle class="k wf tr-w1"${dn(n)} cy="-9" r="13"/><circle class="k nf tr-w2"${load ? ` data-load="${load}"` : ''} cy="9" r="13"/>`,

  /** Candado LOTO. */
  lock: () =>
    `<path class="k" d="M-4.5 -2V-6.5a4.5 4.5 0 0 1 9 0V-2"/><rect class="k wf" x="-7.5" y="-2" width="15" height="12" rx="2.5"/><path class="k" d="M0 2.5V5.5"/>`,

  /** Puesta a tierra temporal (PAT): pinza con símbolo de tierra. */
  pat: () =>
    `<path class="k" d="M0 0V8${groundPath(8)}"/><circle class="pat-clamp" r="3.2"/>`,
};

export function chip(x: number, y: number, text: string, cls = '') {
  const w = Math.round(14 + text.length * 6.4);
  return `<g class="chip ${cls}" transform="translate(${r2(x - w / 2)} ${r2(y - 10)})"><rect width="${w}" height="20" rx="10"/><text x="${w / 2}" y="14">${text}</text></g>`;
}

export const place = (inner: string, x: number, y: number, rot = 0, attrs = '') =>
  `<g${attrs} transform="translate(${r2(x)} ${r2(y)})${rot ? ` rotate(${r2(rot)})` : ''}">${inner}</g>`;

export const pathD = (pts: [number, number][]) => 'M' + pts.map(p => `${r2(p[0])} ${r2(p[1])}`).join('L');
