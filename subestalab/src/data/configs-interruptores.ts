/* ==========================================================================
   Configuraciones de conexión de interruptores (tendencia americana): 7 a 10.
   Pasos según conocimiento/SubestaLab_Base_Conocimiento.md §7.7–§7.10
   ========================================================================== */
import { any, close, event, hand, info, lock, open, pat, verify, type ConfigDef, type Step } from '../lib/scenario';
import * as L from './layouts';

/* Mantenimiento de un interruptor con sus dos seccionadores, sin interrupción */
function brkNoOutage(brk: string, d1: string, d2: string, coord: string, after: string, end: string): Step[] {
  return [
    info('Coordinar con el Centro de Control', coord, { focus: brk }),
    open(brk, after),
    ...any('iso', [
      open(d1, 'Corte visible a un lado del interruptor.'),
      open(d2, 'Corte visible al otro lado: el interruptor queda aislado.'),
    ]),
    lock([d1, d2]),
    verify(brk, 'Detector a ambos lados del interruptor: 0 kV.'),
    pat(brk),
    hand(end),
  ];
}

/* Salida prolongada de una línea conectada por varios interruptores (anillo, anillo cruzado) */
function lineOutage(line: string, brks: string[], ringName: string): Step[] {
  return [
    info('Coordinar con el Centro de Control', `Se programa la salida de ${line} con la subestación remota y se deshabilita el recierre (79).`, { focus: line }),
    ...any('abrir', brks.map((b, i) => open(b, i === brks.length - 1
      ? `${line} queda fuera de servicio: hay que abrir ${brks.length} interruptores para aislar un circuito. ${ringName} queda abierto en ese nodo.`
      : `Primer interruptor de ${line}.`))),
    info('Apertura del extremo remoto', `La subestación remota abre su interruptor de ${line}: la línea deja de estar alimentada desde el otro extremo.`,
      { focus: line, acts: [{ op: 'remote', id: line, off: true }] }),
    open(`89-${line}-L`, 'Corte visible de la salida: la línea queda separada del nodo.'),
    ...any('cerrar', brks.map((b, i) => close(b, i === brks.length - 1
      ? `${ringName} se cierra de nuevo (cierre con verificación de sincronismo): se recupera la seguridad del esquema.`
      : 'El nodo vuelve a ser un punto de paso de la malla.', 'Bajo'))),
    lock([`89-${line}-L`]),
    verify(line, 'Con el extremo remoto abierto, se verifica ausencia de tensión en la línea: 0 kV.'),
    close(`57-${line}`, 'Puesta a tierra de la línea.', 'Bajo'),
    hand(`${line} en consignación con ${ringName.toLowerCase()} cerrado.`),
  ];
}

/* Falla en una línea despejada por los interruptores que la conectan */
function lineFault(line: string, brks: string[], ringName: string, survivors: string): Step[] {
  return [
    info('Operación normal', `${ringName} cerrado; todos los circuitos en servicio.`, { focus: line }),
    event(`Falla en la línea ${line}`, `Cortocircuito en la línea ${line}. Arco en la línea.`, [{ op: 'fault', at: line }], 'Alto', line),
    event('Disparo de la protección 21', `La protección de distancia abre los ${brks.length} interruptores de ${line} y su extremo remoto.`,
      [{ op: 'trip', ids: brks, relay: '21', remote: [line] }], 'Alto', line),
    info('Resultado', `Solo ${line} queda fuera de servicio. ${survivors}`, { focus: line, risk: 'Medio' }),
    open(`89-${line}-L`, 'Se aísla la línea fallada con su seccionador de salida.'),
    ...any('cerrar', brks.map(b => close(b, 'Se cierra la malla de nuevo.', 'Bajo'))),
  ];
}

export const interruptores: ConfigDef[] = [
  /* 7 ---------------------------------------------------------------------- */
  {
    n: 7, slug: 'anillo', name: 'Anillo', short: 'Anillo', level: 'Intermedia', trend: 'Conexión de interruptores',
    summary: 'No hay barra colectora: los circuitos se conectan a un anillo de interruptores, cada uno entre dos interruptores.',
    pros: ['Económica, segura y confiable', 'Mantenimiento de cualquier interruptor sin cortar el servicio', 'Una falla en un tramo solo afecta a ese circuito'],
    cons: ['Sin flexibilidad', 'Con el anillo abierto, otra falla puede dividirlo', 'Práctico hasta unas 6 salidas'],
    ratings: { flex: 'No tiene', conf: 'Alta', seg: 'Alta' }, cost: '187 %', breakersPerCircuit: '1 (2 compartidos)',
    build: L.anillo,
    scenarios: [
      { key: 'A', title: 'Salida prolongada de la línea L2', short: 'Circuito', goal: 'Sacar L2 y volver a cerrar el anillo para recuperar la seguridad.',
        outcome: 'L2 fuera de servicio y el anillo cerrado de nuevo. (El anillo no tiene barra: este caso reemplaza al mantenimiento de barra.)',
        steps: lineOutage('L2', ['52-2', '52-3'], 'El anillo') },
      { key: 'B', title: 'Mantenimiento del interruptor 52-1', short: 'Interruptor', goal: 'Aislar el 52-1 sin interrumpir ningún circuito.',
        outcome: 'Continuidad total, pero con el anillo abierto.',
        steps: brkNoOutage('52-1', '89-1a', '89-1b', 'Se verifica que el anillo esté cerrado: todos los interruptores en servicio.',
          'El anillo se abre y queda una cadena N2–N3–N4–N1. Todos los circuitos siguen en servicio.',
          'Continuidad total, pero con el anillo abierto: si ahora fallara L2, se abrirían 52-2 y 52-3 y T1 quedaría aislado sin fuente.') },
      { key: 'C', title: 'Falla en la línea L2', short: 'Falla', goal: 'Ver cómo el anillo despeja una falla perdiendo solo el circuito afectado.',
        outcome: 'Solo L2 sale de servicio; el anillo se vuelve a cerrar.',
        steps: lineFault('L2', ['52-2', '52-3'], 'Anillo', 'L1, T1 y T2 siguen en servicio, con el anillo abierto.') },
    ],
  },

  /* 8 ---------------------------------------------------------------------- */
  {
    n: 8, slug: 'interruptor-y-medio', name: 'Interruptor y medio', short: 'Interruptor y medio', level: 'Avanzada', trend: 'Conexión de interruptores',
    summary: 'Tres interruptores por cada dos salidas. Cada diámetro de tres interruptores une las dos barras y los circuitos se derivan entre ellos.',
    pros: ['Mantenimiento de cualquier interruptor o barra sin cortar el servicio', 'Una falla en barra no interrumpe ningún circuito', 'Alta confiabilidad y seguridad'],
    cons: ['Sin flexibilidad', 'Protección y recierre del interruptor central complejos', 'Costosa'],
    ratings: { flex: 'No tiene', conf: 'Muy alta', seg: 'Alta' }, cost: '247 %', breakersPerCircuit: '1,5',
    build: L.interruptorYMedio,
    scenarios: [
      { key: 'A', title: 'Mantenimiento de la barra B1', short: 'Barra', goal: 'Desenergizar y poner a tierra B1 sin interrumpir ningún circuito.',
        outcome: 'Continuidad total: cada circuito sigue alimentado desde B2 a través de su diámetro.',
        steps: [
          info('Coordinar', 'Se van a abrir los interruptores del lado de B1 de cada diámetro.', { focus: 'B1' }),
          ...any('brk', [
            open('52-1A', 'L1 sigue alimentado por 52-1B → 52-1C → B2.'),
            open('52-2A', 'B1 queda desenergizada; ningún circuito se interrumpe.'),
          ]),
          ...any('disc', [
            open('89-1A-1', 'Corte visible del lado de B1.', 'Bajo'),
            open('89-2A-1', 'B1 queda aislada.', 'Bajo'),
          ]),
          lock(['89-1A-1', '89-2A-1']),
          verify('B1'),
          close('57-B1', 'B1 a tierra y en cortocircuito.', 'Bajo'),
          hand('Continuidad total: interruptor y medio permite mantener cualquier barra sin cortar el servicio.'),
        ] },
      { key: 'B', title: 'Mantenimiento del interruptor central 52-1B', short: 'Interruptor', goal: 'Aislar el interruptor central sin interrumpir L1 ni T1.',
        outcome: 'Continuidad total: L1 queda solo por B1 y T1 solo por B2.',
        steps: brkNoOutage('52-1B', '89-1B-1', '89-1B-2', 'Se ajusta el recierre: el interruptor central deja de participar.',
          'L1 queda alimentado solo por 52-1A (B1) y T1 solo por 52-1C (B2).',
          'Continuidad total. Mientras dure, L1 y T1 dependen cada uno de un solo interruptor y de una sola barra.') },
      { key: 'C', title: 'Falla en L1 con falla del interruptor central', short: 'Falla', goal: 'Responder: por falla en un interruptor, ¿cuántos circuitos quedan sin servicio?',
        outcome: 'En el peor caso, la falla de un interruptor saca un circuito adicional.',
        steps: [
          info('Operación normal', 'Ambas barras energizadas y todos los interruptores cerrados.', { focus: 'L1' }),
          event('Falla en la línea L1', 'Cortocircuito en la línea L1. Arco en la línea.', [{ op: 'fault', at: 'L1' }], 'Alto', 'L1'),
          event('La protección 21 ordena abrir 52-1A y 52-1B…', '…el 52-1A abre, pero el 52-1B no abre (falla de interruptor). El extremo remoto de L1 abre.',
            [{ op: 'stuck', id: '52-1B' }, { op: 'trip', ids: ['52-1A', '52-1B'], relay: '21', remote: ['L1'] }], 'Alto', '52-1B'),
          event('Disparo por falla de interruptor (50BF)', 'La protección de falla de interruptor abre el siguiente interruptor del diámetro (52-1C).',
            [{ op: 'trip', ids: ['52-1C'], relay: '50BF' }], 'Alto', '52-1C'),
          info('Resultado', 'L1 y T1 fuera de servicio: la falla de un interruptor sacó un circuito adicional. Las barras y el diámetro 2 siguen intactos.', { focus: 'T1', risk: 'Alto' }),
          ...any('iso', [
            open('89-1B-1', 'Se aísla el interruptor dañado.'),
            open('89-1B-2', 'El 52-1B queda aislado por ambos lados.'),
          ]),
          close('52-1C', 'T1 se restablece desde B2.', 'Bajo'),
        ] },
    ],
  },

  /* 9 ---------------------------------------------------------------------- */
  {
    n: 9, slug: 'doble-interruptor', name: 'Doble interruptor', short: 'Doble interruptor', level: 'Avanzada', trend: 'Conexión de interruptores',
    summary: 'Se duplican barras e interruptores: cada circuito tiene un interruptor hacia B1 y otro hacia B2.',
    pros: ['La mayor seguridad ante fallas en barras e interruptores', 'Gran libertad para operación y mantenimiento'],
    cons: ['La configuración más costosa', 'Si se separan los circuitos por barra, se pierde la seguridad'],
    ratings: { flex: 'Media', conf: 'Muy alta', seg: 'Muy alta' }, cost: '331 %', breakersPerCircuit: '2',
    build: L.dobleInterruptor,
    scenarios: [
      { key: 'A', title: 'Mantenimiento de la barra B1', short: 'Barra', goal: 'Desenergizar y poner a tierra B1 sin interrumpir ningún circuito.',
        outcome: 'Continuidad total: todos los circuitos siguen por B2.',
        steps: [
          info('Coordinar', 'Se abren los interruptores del lado de B1 de cada circuito.', { focus: 'B1' }),
          ...any('brk', [
            open('52-L1-1', 'L1 sigue alimentado por 52-L1-2 y B2.'),
            open('52-L2-1', 'L2 sigue por B2.'),
            open('52-T1-1', 'B1 queda desenergizada; todos los circuitos siguen por B2.'),
          ]),
          ...any('disc', [
            open('89-L1-1-B', 'Corte visible lado B1.', 'Bajo'),
            open('89-L2-1-B', 'Corte visible lado B1.', 'Bajo'),
            open('89-T1-1-B', 'B1 queda aislada.', 'Bajo'),
          ]),
          lock(['89-L1-1-B', '89-L2-1-B', '89-T1-1-B']),
          verify('B1'),
          close('57-B1', 'B1 a tierra y en cortocircuito.', 'Bajo'),
          hand('Continuidad total.'),
        ] },
      { key: 'B', title: 'Mantenimiento del interruptor 52-L1-1', short: 'Interruptor', goal: 'Aislar un interruptor de L1 sin interrumpir la línea.',
        outcome: 'Continuidad total: L1 sigue por 52-L1-2 y B2.',
        steps: brkNoOutage('52-L1-1', '89-L1-1-L', '89-L1-1-B', 'L1 seguirá en servicio por su otro interruptor.',
          'L1 sigue por 52-L1-2 y B2.', 'Continuidad total.') },
      { key: 'C', title: 'Falla en la barra B1', short: 'Falla', goal: 'Ver por qué esta es la configuración más segura.',
        outcome: 'Ningún circuito pierde el servicio.',
        steps: [
          info('Operación normal', 'Ambas barras energizadas y todos los interruptores cerrados.', { focus: 'B1' }),
          event('Falla en la barra B1', 'Cortocircuito en B1. Arco en la barra.', [{ op: 'fault', at: 'B1' }], 'Alto', 'B1'),
          event('Disparo de la protección 87B', 'Abren todos los interruptores del lado de B1.', [{ op: 'trip', ids: ['52-L1-1', '52-L2-1', '52-T1-1'], relay: '87B' }], 'Alto', 'B1'),
          info('Resultado', 'Ningún circuito pierde el servicio: todos siguen por B2. Es la máxima seguridad.', { focus: 'T1', risk: 'Medio' }),
          ...any('iso', [
            open('89-L1-1-B', 'Aislamiento de B1.', 'Bajo'),
            open('89-L2-1-B', 'Aislamiento de B1.', 'Bajo'),
            open('89-T1-1-B', 'B1 aislada para su reparación.', 'Bajo'),
          ]),
        ] },
    ],
  },

  /* 10 --------------------------------------------------------------------- */
  {
    n: 10, slug: 'anillo-cruzado', name: 'Anillo cruzado', short: 'Anillo cruzado', level: 'Avanzada', trend: 'Conexión de interruptores',
    summary: 'Dos anillos de interruptores cuyos nodos enfrentados se unen con un interruptor vertical: cada circuito queda conectado por tres interruptores en "paralelo".',
    pros: ['Tres caminos por circuito', 'Algo más segura y confiable que interruptor y medio', 'Mismo número de interruptores (n + n/2)'],
    cons: ['Control y operación más complicados', 'Aislar un circuito requiere abrir tres interruptores'],
    ratings: { flex: 'No tiene', conf: 'Muy alta', seg: 'Muy alta' }, cost: '≈ 247 %', breakersPerCircuit: '1,5 (3 compartidos)',
    build: L.anilloCruzado,
    scenarios: [
      { key: 'A', title: 'Salida prolongada de la línea L2', short: 'Circuito', goal: 'Sacar L2 (nodo N3) y volver a cerrar la malla.',
        outcome: 'L2 fuera y la malla cerrada de nuevo. (No hay barra: este caso reemplaza al mantenimiento de barra.)',
        steps: lineOutage('L2', ['52-S2', '52-S3', '52-V3'], 'La malla') },
      { key: 'B', title: 'Mantenimiento del interruptor vertical 52-V2', short: 'Interruptor', goal: 'Aislar un interruptor de cruce sin afectar el servicio.',
        outcome: 'Continuidad total y los dos anillos siguen cerrados.',
        steps: brkNoOutage('52-V2', '89-V2-a', '89-V2-b', 'Todos los interruptores cerrados: cada nodo tiene tres caminos.',
          'N2 y N5 quedan con dos interruptores cada uno, como en un anillo simple. Todos los circuitos siguen en servicio.',
          'Continuidad total y los anillos siguen cerrados.') },
      { key: 'C', title: 'Falla en la línea L2', short: 'Falla', goal: 'Ver cómo se despeja una falla abriendo tres interruptores.',
        outcome: 'Solo L2 sale de servicio; los demás nodos conservan al menos dos caminos.',
        steps: lineFault('L2', ['52-S2', '52-S3', '52-V3'], 'La malla', 'Los demás nodos conservan al menos dos caminos.') },
    ],
  },
];
