/* ==========================================================================
   Configuraciones de conexión de barras (tendencia europea): 1 a 6.
   Pasos según conocimiento/SubestaLab_Base_Conocimiento.md §7.1–§7.6
   ========================================================================== */
import { any, close, couplerLock, event, hand, info, lock, open, pat, protect, verify, type ConfigDef, type Step } from '../lib/scenario';
import * as L from './layouts';

const ISOLATE_T1 = 'Corte visible: sin corriente circulando no hay arco.';

/* Mantenimiento del interruptor 52-T1 con salida del circuito (barra sencilla, doble barra) */
function brkOutage(busDisc: string, extraLock: string[] = []): Step[] {
  return [
    info('Coordinar con el Centro de Control', 'El circuito T1 saldrá de servicio: en esta configuración no hay forma de reemplazar su interruptor. Se avisa a los usuarios de la red MT.', { focus: 'T1' }),
    open('52-T1', 'Primero siempre el interruptor: es el único equipo capaz de cortar la corriente de carga. Se verifica corriente cero. T1 queda sin servicio.'),
    open('89-T1-L', `Seccionador del lado del transformador. ${ISOLATE_T1}`),
    open(busDisc, 'Seccionador del lado de barra. El 52-T1 queda aislado por ambos lados (primera regla de oro: corte visible).'),
    lock(['89-T1-L', busDisc, ...extraLock]),
    verify('52-T1', 'Detector de tensión a ambos lados del interruptor: 0 kV.'),
    pat('52-T1'),
    hand('Zona delimitada: el interruptor 52-T1 queda en mantenimiento. T1 sigue sin servicio hasta normalizar.'),
  ];
}

/* Cambio de barra en caliente (acople cerrado y bloqueado) */
function hotTransfer(id: string, from: 'B1' | 'B2', to: 'B1' | 'B2'): Step[] {
  return [
    close(`89-${id}-${to}`, `Cierre equipotencial: con el acople cerrado ${from} y ${to} están al mismo potencial, así que no hay arco. ${id} queda unido a las dos barras a la vez.`),
    open(`89-${id}-${from}`, `La corriente conmuta al seccionador de ${to}. ${id} pasa a ${to} sin interrupción.`),
  ];
}

/* Mantenimiento de B1 en doble barra: todo a B2, abrir acople, poner a tierra */
function busB1Maintenance(onB1: string[]): Step[] {
  return [
    info('Coordinar y verificar el acople', 'Se verifica que el acople (89-AC-B1, 52-AC, 89-AC-B2) esté cerrado: B1 y B2 son equipotenciales. La meta es dejar B1 sin circuitos.', { focus: '52-AC' }),
    couplerLock('52-AC', true, 'Se quita el mando y se inhibe el disparo del acople: si se abriera durante el cambio de selectores, un seccionador abriría carga.'),
    ...onB1.flatMap(id => hotTransfer(id, 'B1', 'B2')),
    couplerLock('52-AC', false, 'Todos los circuitos ya están en B2. Se devuelve el mando al acople.'),
    open('52-AC', 'B1 queda desenergizada. Se verifica corriente cero en el acople: no quedaba ningún circuito en B1.'),
    open('89-AC-B1', 'Corte visible del acople hacia B1.', 'Bajo'),
    open('89-AC-B2', 'El campo de acople queda aislado.', 'Bajo'),
    lock([...['L1', 'L2', 'T1'].map(id => `89-${id}-B1`), '89-AC-B1'], 'LOTO en todos los selectores de B1: nadie podrá reconectar un circuito a la barra en mantenimiento.'),
    verify('B1'),
    close('57-B1', 'Cuarta regla de oro: B1 a tierra y en cortocircuito.', 'Bajo'),
    hand('Continuidad total: todos los circuitos siguen en servicio desde B2.'),
  ];
}

/* Falla en la barra B1 de una doble barra y recuperación en frío */
function dbBusFault(onB1: string[], extra = ''): Step[] {
  return [
    info('Operación normal', `Acople cerrado; ${onB1.join(' y ')} en B1 y L2 en B2. Todo energizado.`, { focus: 'B1' }),
    event('Falla en la barra B1', 'Cortocircuito fase–tierra en B1 (contaminación de un aislador). Se forma un arco eléctrico de miles de amperios.', [{ op: 'fault', at: 'B1' }], 'Alto', 'B1'),
    event('Disparo de la protección 87B', `La diferencial de barras (zona B1) dispara los interruptores de los circuitos conectados a B1 y el acople, en unos 80 a 100 ms. ${extra}`,
      [{ op: 'trip', ids: [...onB1.map(id => `52-${id}`), '52-AC'], relay: '87B' }], 'Alto', 'B1'),
    info('Resultado', 'T1 sin servicio y L1 desconectada. B2 sigue energizada por L2: la falla solo afectó a los circuitos de B1.', { focus: 'T1', risk: 'Alto' }),
    open('89-T1-B1', 'Transferencia en frío: el interruptor ya está abierto, así que el selector opera sin corriente.'),
    close('89-T1-B2', 'Se conecta la bahía T1 a B2, que está sana. Todavía sin carga: el 52-T1 sigue abierto.'),
    close('52-T1', 'T1 se restablece desde B2. Los circuitos siempre se energizan con el interruptor.'),
    open('89-L1-B1', 'Lo mismo con L1.'),
    close('89-L1-B2', 'L1 queda lista para conectarse a B2.'),
    close('52-L1', 'L1 vuelve a servicio por B2 (cierre con verificación de sincronismo, función 25).'),
    open('89-AC-B1', 'B1 queda aislada para su reparación.', 'Bajo'),
    info('Lección', 'Hubo interrupción (la doble barra no tiene seguridad ante falla en barra), pero el servicio se recuperó en minutos (sí tiene confiabilidad).'),
  ];
}

export const barras: ConfigDef[] = [
  /* 1 ---------------------------------------------------------------------- */
  {
    n: 1, slug: 'barra-sencilla', name: 'Barra sencilla', short: 'Barra sencilla', level: 'Básica', trend: 'Conexión de barras',
    summary: 'Un solo barraje colector; cada circuito se conecta con un interruptor y sus seccionadores.',
    pros: ['Económica y simple', 'Fácil de proteger', 'Poco espacio', 'Poca posibilidad de operación incorrecta'],
    cons: ['Falla o mantenimiento de barra: sale toda la subestación', 'Mantenimiento de interruptor: sale el circuito'],
    ratings: { flex: 'No tiene', conf: 'No tiene', seg: 'No tiene' }, cost: '100 %', breakersPerCircuit: '1',
    build: L.barraSencilla,
    scenarios: [
      { key: 'A', title: 'Mantenimiento de la barra B1', short: 'Barra', goal: 'Dejar B1 sin tensión, aislada y puesta a tierra para trabajar en ella.',
        outcome: 'Salida total: en barra sencilla no hay otra barra a dónde pasar los circuitos.',
        steps: [
          info('Coordinar la salida total', 'Se programa con el Centro de Control la salida de toda la subestación y se avisa a los usuarios. En barra sencilla no hay alternativa.', { focus: 'B1' }),
          ...any('brk', [
            open('52-T1', 'Se abre primero la carga: T1 y la red MT quedan sin servicio.'),
            open('52-L2', 'La barra queda alimentada solo por L1.'),
            open('52-L1', 'B1 queda desenergizada. Las líneas siguen energizadas desde sus extremos remotos, hasta sus interruptores.'),
          ]),
          ...any('disc', [
            open('89-T1-B', 'Corte visible entre la barra y la bahía T1.'),
            open('89-L2-B', 'Corte visible con la bahía L2, cuyo interruptor sigue energizado por el lado de la línea.'),
            open('89-L1-B', 'B1 queda aislada de todas las fuentes.'),
          ]),
          lock(['89-L1-B', '89-L2-B', '89-T1-B']),
          verify('B1'),
          close('57-B1', 'Puesta a tierra de la barra: cualquier reenergización accidental se iría a tierra.', 'Bajo'),
          hand('Barra en consignación. Toda la subestación permanece fuera de servicio durante el trabajo.'),
        ] },
      { key: 'B', title: 'Mantenimiento del interruptor 52-T1', short: 'Interruptor', goal: 'Aislar y poner a tierra el interruptor 52-T1.',
        outcome: 'Se pierde el circuito T1; L1 y L2 siguen en servicio.', steps: brkOutage('89-T1-B') },
      { key: 'C', title: 'Falla en la barra B1', short: 'Falla', goal: 'Observar la actuación de las protecciones ante un cortocircuito en la barra.',
        outcome: 'La falla en barra deja sin servicio toda la subestación hasta reparar la barra.',
        steps: [
          info('Operación normal', 'Todo energizado: L1 y L2 alimentan la barra y T1 entrega energía a la red MT.', { focus: 'B1' }),
          event('Falla en la barra B1', 'Cortocircuito fase–tierra en la barra (por ejemplo, un animal o un aislador contaminado). Se forma un arco eléctrico.', [{ op: 'fault', at: 'B1' }], 'Alto', 'B1'),
          event('Disparo de la protección 87B', 'La diferencial de barras detecta la falla dentro de su zona y el relé 86 dispara todos los interruptores de la barra en unos 80 a 100 ms. El arco se extingue.',
            [{ op: 'trip', ids: ['52-L1', '52-L2', '52-T1'], relay: '87B' }], 'Alto', 'B1'),
          info('Resultado', 'Toda la subestación sin servicio. El relé 86 bloquea el cierre hasta que se inspeccione la barra.', { focus: 'T1', risk: 'Alto' }),
          ...any('iso', [
            open('89-L1-B', 'Se aísla la barra fallada (ya no hay corriente).'),
            open('89-L2-B', 'Corte visible con L2.'),
            open('89-T1-B', 'Corte visible con T1.'),
          ]),
          info('Lección', 'Hasta reparar la barra no hay forma de recuperar el servicio: la barra sencilla no tiene seguridad ni confiabilidad ante falla en barra. Con barra seccionada se perdería solo la mitad.'),
        ] },
    ],
  },

  /* 2 ---------------------------------------------------------------------- */
  {
    n: 2, slug: 'barra-principal-transferencia', name: 'Barra principal y de transferencia', short: 'Barra ppal. + transferencia', level: 'Intermedia', trend: 'Conexión de barras',
    summary: 'A la barra sencilla se le agrega una barra de transferencia, un seccionador de transferencia por circuito y un interruptor de transferencia.',
    pros: ['Mantenimiento de interruptores sin cortar el servicio', 'Económica', 'Muy usada en distribución exterior'],
    cons: ['Falla en barra principal o en interruptor: sale toda la S/E', 'Protección más compleja', 'Un solo circuito transferido a la vez'],
    ratings: { flex: 'No tiene', conf: 'Baja', seg: 'No tiene' }, cost: '148 %', breakersPerCircuit: '1 (+1 de transferencia)',
    build: L.barraTransferencia,
    scenarios: [
      { key: 'A', title: 'Mantenimiento de la barra principal B1', short: 'Barra', goal: 'Dejar B1 sin tensión, aislada y puesta a tierra.',
        outcome: 'Salida total: la BT se alimenta desde B1 y no sirve para este caso.',
        steps: [
          info('Coordinar la salida total', 'La barra de transferencia no ayuda: se alimenta desde B1 a través del 52-TR. Se verifica que el campo de transferencia (89-TR-B, 52-TR, 89-TR-T) esté abierto.', { focus: 'B1' }),
          ...any('brk', [
            open('52-T1', 'Se abre primero la carga.'),
            open('52-L2', 'B1 queda alimentada solo por L1.'),
            open('52-L1', 'B1 desenergizada.'),
          ]),
          ...any('disc', [
            open('89-T1-B', 'Corte visible con T1.'),
            open('89-L2-B', 'Corte visible con L2.'),
            open('89-L1-B', 'B1 aislada de todas las fuentes.'),
          ]),
          lock(['89-L1-B', '89-L2-B', '89-T1-B', '89-TR-B']),
          verify('B1'),
          close('57-B1', 'B1 a tierra y en cortocircuito.', 'Bajo'),
          hand('Barra principal en consignación. Usar la BT como puente directo entre una línea y el transformador los dejaría sin interruptor que los proteja: no se hace.'),
        ] },
      { key: 'B', title: 'Mantenimiento del interruptor 52-T1 sin cortar T1', short: 'Interruptor', goal: 'Reemplazar el 52-T1 por el interruptor de transferencia y aislarlo, sin interrumpir T1.',
        outcome: 'Continuidad total: T1 sigue alimentado por 52-TR y la barra de transferencia.',
        steps: [
          info('Coordinar', 'Se verifica que la BT esté desenergizada y que ningún seccionador de transferencia esté cerrado: solo un circuito puede transferirse a la vez.', { focus: 'BT' }),
          close('89-TR-B', 'Se prepara el campo de transferencia. Sin corriente: el 52-TR está abierto.', 'Bajo'),
          close('89-TR-T', 'El campo de transferencia queda listo.', 'Bajo'),
          protect('T1', '52-TR', 'El relé del interruptor de transferencia toma los ajustes de protección de T1: será su interruptor mientras dure el trabajo.'),
          close('52-TR', 'La BT se energiza. Es la prueba de que la barra está sana: si tuviera una falla, dispararía el 52-TR y no T1.'),
          close('89-T1-T', 'Cierre equipotencial: la BT y el lado del transformador ya están al mismo potencial. T1 queda alimentado por dos caminos en paralelo.'),
          open('52-T1', 'Toda la corriente de T1 pasa por 52-TR → BT → 89-T1-T. T1 no se interrumpe.'),
          open('89-T1-L', 'Sin corriente: aislamiento del lado del transformador.'),
          open('89-T1-B', 'El 52-T1 queda aislado.', 'Bajo'),
          lock(['89-T1-L', '89-T1-B']),
          verify('52-T1', 'Detector a ambos lados del interruptor: 0 kV.', 'Bajo'),
          pat('52-T1'),
          hand('Mantenimiento del 52-T1 con continuidad total de T1.'),
        ] },
      { key: 'C', title: 'Falla en L2 con falla del interruptor 52-L2', short: 'Falla', goal: 'Ver qué pasa cuando un interruptor no abre durante una falla.',
        outcome: 'La falla de un interruptor saca toda la subestación (seguridad baja), pero la BT permite recuperar luego el circuito.',
        steps: [
          info('Operación normal', 'Todo energizado; BT desenergizada.', { focus: 'B1' }),
          event('Falla en la línea L2', 'Cortocircuito en la línea L2. Arco en la línea.', [{ op: 'fault', at: 'L2' }], 'Alto', 'L2'),
          event('La protección 21 ordena abrir 52-L2…', '…pero el interruptor no abre (por ejemplo, por baja presión de SF6 o un mecanismo trabado). El extremo remoto de L2 sí abre. La barra sigue alimentando la falla.',
            [{ op: 'stuck', id: '52-L2' }, { op: 'trip', ids: ['52-L2'], relay: '21', remote: ['L2'] }], 'Alto', '52-L2'),
          event('Disparo por falla de interruptor (50BF)', 'Tras unos 200 ms, la protección de falla de interruptor dispara todos los interruptores de la barra.',
            [{ op: 'trip', ids: ['52-L1', '52-T1'], relay: '50BF' }], 'Alto', 'B1'),
          info('Resultado', 'Toda la subestación sin servicio: una falla en un interruptor reduce la seguridad.', { focus: 'T1', risk: 'Alto' }),
          open('89-L2-B', 'Se aísla el interruptor dañado: ya no hay tensión en la barra.'),
          open('89-L2-L', 'El 52-L2 queda aislado por ambos lados.'),
          close('52-L1', 'Se reenergiza la barra desde L1.'),
          close('52-T1', 'T1 recupera el servicio.'),
          info('Lección', 'Cuando L2 esté reparada podrá volver a servicio a través del 52-TR y la BT mientras se repara el 52-L2. Esa es la confiabilidad que aporta la barra de transferencia.'),
        ] },
    ],
  },

  /* 3 ---------------------------------------------------------------------- */
  {
    n: 3, slug: 'doble-barra', name: 'Doble barra', short: 'Doble barra', level: 'Intermedia', trend: 'Conexión de barras',
    summary: 'Segunda barra principal e interruptor de acople. Cada circuito se conecta a cualquiera de las dos barras con seccionadores selectores.',
    pros: ['Mantenimiento de barras sin cortar el servicio', 'Flexible: separar circuitos y sistemas', 'Recuperación rápida ante falla en barra'],
    cons: ['Mantenimiento de interruptor: sale el circuito', 'Falla en barra: salen sus circuitos', 'Protección diferencial de barras más compleja'],
    ratings: { flex: 'Alta', conf: 'Media', seg: 'No tiene' }, cost: '171 %', breakersPerCircuit: '1 (+ acople)',
    build: L.dobleBarra,
    scenarios: [
      { key: 'A', title: 'Mantenimiento de la barra B1', short: 'Barra', goal: 'Pasar L1 y T1 a B2 sin interrupción y dejar B1 aislada y a tierra.',
        outcome: 'Continuidad total: todos los circuitos en B2.', steps: busB1Maintenance(['L1', 'T1']) },
      { key: 'B', title: 'Mantenimiento del interruptor 52-T1', short: 'Interruptor', goal: 'Aislar y poner a tierra el 52-T1.',
        outcome: 'T1 queda sin servicio: esta limitación motiva las configuraciones 4, 5 y 6.', steps: brkOutage('89-T1-B1', ['89-T1-B2']) },
      { key: 'C', title: 'Falla en la barra B1', short: 'Falla', goal: 'Observar el disparo de B1 y recuperar los circuitos por B2.',
        outcome: 'Interrupción breve: se recupera el servicio pasando los circuitos a B2.', steps: dbBusFault(['L1', 'T1']) },
    ],
  },

  /* 4 ---------------------------------------------------------------------- */
  {
    n: 4, slug: 'doble-barra-bypass', name: 'Doble barra más seccionador de by-pass', short: 'Doble barra + by-pass', level: 'Intermedia', trend: 'Conexión de barras',
    summary: 'Doble barra con un seccionador de by-pass en paralelo con cada interruptor. El acople hace de interruptor de transferencia, usando una barra como transferencia.',
    pros: ['Mantenimiento de cualquier interruptor sin cortar el servicio', 'Mantenimiento de barras sin cortar el servicio'],
    cons: ['Requiere una barra libre para el by-pass', 'Más equipos por campo y más riesgo de operación incorrecta', 'Mayor costo'],
    ratings: { flex: 'Alta', conf: 'Alta', seg: 'Baja' }, cost: '210 %', breakersPerCircuit: '1 (+ acople)',
    build: L.dobleBarraBypass,
    scenarios: [
      { key: 'A', title: 'Mantenimiento de la barra B1', short: 'Barra', goal: 'Pasar L1 y L2 a B2 sin interrupción y dejar B1 aislada y a tierra.',
        outcome: 'Continuidad total: todos los circuitos en B2.', steps: busB1Maintenance(['L1', 'L2']) },
      { key: 'B', title: 'Mantenimiento del 52-T1 por by-pass', short: 'Interruptor', goal: 'Alimentar T1 por B1 → 52-AC → B2 → by-pass y aislar el 52-T1.',
        outcome: 'Continuidad total; el acople protege a T1 mientras dura el by-pass.',
        steps: [
          info('Coordinar', 'Para que el acople proteja a T1, B2 debe tener solo el circuito T1. En el estado actual ya se cumple: L1 y L2 en B1, T1 sola en B2, acople cerrado y ningún by-pass cerrado.', { focus: 'B2' }),
          protect('T1', '52-AC', 'El acople toma los ajustes de protección de T1: será su interruptor.'),
          close('89-T1-BP', 'El by-pass queda en paralelo con el 52-T1 cerrado: cierre equipotencial.'),
          open('52-T1', 'La corriente sigue por B1 → 52-AC → B2 → 89-T1-B2 → 89-T1-BP → T1. Sin interrupción.'),
          open('89-T1-L', 'Aislamiento del lado de la línea del interruptor.', 'Bajo'),
          open('89-T1-I', 'El 52-T1 queda aislado entre 89-T1-I y 89-T1-L.', 'Bajo'),
          lock(['89-T1-I', '89-T1-L']),
          verify('52-T1', 'Detector a ambos lados del interruptor: 0 kV.', 'Bajo'),
          pat('52-T1'),
          hand('Mientras dura el by-pass, B2 está dedicada a T1: se pierde la flexibilidad de la doble barra. Si el acople disparara, T1 saldría de servicio.'),
        ] },
      { key: 'C', title: 'Falla en la barra B2', short: 'Falla', goal: 'Observar el disparo de B2 y recuperar T1 por B1.',
        outcome: 'Interrupción breve de T1, recuperada por B1.',
        steps: [
          info('Operación normal', 'Acople cerrado; L1 y L2 en B1; T1 en B2.', { focus: 'B2' }),
          event('Falla en la barra B2', 'Cortocircuito en B2. Arco en la barra.', [{ op: 'fault', at: 'B2' }], 'Alto', 'B2'),
          event('Disparo de la protección 87B', 'La diferencial de la zona B2 dispara el circuito conectado a B2 y el acople.', [{ op: 'trip', ids: ['52-T1', '52-AC'], relay: '87B' }], 'Alto', 'B2'),
          info('Resultado', 'T1 sin servicio; B1 sigue en servicio con L1 y L2.', { focus: 'T1', risk: 'Alto' }),
          open('89-T1-B2', 'Transferencia en frío: el selector opera sin corriente.'),
          close('89-T1-B1', 'La bahía T1 queda conectada a B1.'),
          close('52-T1', 'T1 restablecido desde B1.'),
          open('89-AC-B2', 'B2 aislada para su reparación.', 'Bajo'),
        ] },
    ],
  },

  /* 5 ---------------------------------------------------------------------- */
  {
    n: 5, slug: 'doble-barra-seccionador-transferencia', name: 'Doble barra más seccionador de transferencia', short: 'DB + secc. de transferencia', level: 'Avanzada', trend: 'Conexión de barras',
    summary: 'Variante con un seccionador menos: cada circuito tiene un seccionador de transferencia que une B2 directamente con el lado de la línea. B2 hace de barra de transferencia.',
    pros: ['Mantenimiento de interruptores y barras sin cortar el servicio', 'Muy usada en Europa en 220 kV'],
    cons: ['B2 debe quedar libre para transferir', 'Requiere seccionadores pantógrafo o semipantógrafo', 'Mayor área'],
    ratings: { flex: 'Alta', conf: 'Alta', seg: 'Baja' }, cost: '190 %', breakersPerCircuit: '1 (+ acople)',
    build: L.dobleBarraSecTransferencia,
    scenarios: [
      { key: 'A', title: 'Mantenimiento de la barra B1', short: 'Barra', goal: 'Pasar L1 y T1 a B2 sin interrupción y dejar B1 aislada y a tierra.',
        outcome: 'Continuidad total: todos los circuitos en B2.', steps: busB1Maintenance(['L1', 'T1']) },
      { key: 'B', title: 'Mantenimiento del 52-T1 con el seccionador de transferencia', short: 'Interruptor', goal: 'Liberar B2, transferir T1 al acople y aislar el 52-T1.',
        outcome: 'Continuidad total: T1 alimentado por B1 → 52-AC → B2 → 89-T1-T.',
        steps: [
          info('Coordinar', 'Hay que liberar B2, donde está L2, para usarla como barra de transferencia.', { focus: 'B2' }),
          couplerLock('52-AC', true, 'Acople bloqueado en cerrado durante el cambio de barra de L2.'),
          ...hotTransfer('L2', 'B2', 'B1'),
          couplerLock('52-AC', false, 'B2 queda libre, energizada solo por el acople. Se devuelve el mando al acople.'),
          protect('T1', '52-AC', 'El acople toma la protección de T1.'),
          close('89-T1-T', 'Cierre equipotencial: B2 (= B1 a través del acople) y el lado de T1 (= B1 a través del 52-T1).'),
          open('52-T1', 'T1 queda alimentado por B1 → 52-AC → B2 → 89-T1-T. Sin interrupción.'),
          open('89-T1-L', 'Aislamiento del lado de la línea.', 'Bajo'),
          open('89-T1-B1', 'El 52-T1 queda aislado.', 'Bajo'),
          lock(['89-T1-L', '89-T1-B1', '89-T1-B2']),
          verify('52-T1', 'Detector a ambos lados del interruptor: 0 kV.', 'Bajo'),
          pat('52-T1'),
          hand('Continuidad total de T1, protegido por el acople.'),
        ] },
      { key: 'C', title: 'Falla en la barra B1', short: 'Falla', goal: 'Observar el disparo de B1 y recuperar los circuitos por B2.',
        outcome: 'Interrupción breve: se recupera el servicio pasando los circuitos a B2.', steps: dbBusFault(['L1', 'T1']) },
    ],
  },

  /* 6 ---------------------------------------------------------------------- */
  {
    n: 6, slug: 'doble-barra-barra-transferencia', name: 'Doble barra más barra de transferencia', short: 'DB + barra de transferencia', level: 'Avanzada', trend: 'Conexión de barras',
    summary: 'Dos barras principales y una de transferencia, con interruptor de acople y de transferencia: permite acoplar y transferir al mismo tiempo.',
    pros: ['Confiabilidad y flexibilidad simultáneas', 'Acople y transferencia a la vez'],
    cons: ['Mayor área', 'Más equipos y mayor costo'],
    ratings: { flex: 'Alta', conf: 'Alta', seg: 'Baja' }, cost: '214 %', breakersPerCircuit: '1 (+ acople + transferencia)',
    build: L.dobleBarraTransferencia,
    scenarios: [
      { key: 'A', title: 'Mantenimiento de la barra B1', short: 'Barra', goal: 'Pasar L1 y T1 a B2 sin interrupción y dejar B1 aislada y a tierra.',
        outcome: 'Continuidad total: todos los circuitos en B2.', steps: busB1Maintenance(['L1', 'T1']) },
      { key: 'B', title: 'Mantenimiento del 52-T1 por la barra de transferencia', short: 'Interruptor', goal: 'Reemplazar el 52-T1 por el 52-TR sin perder el acople.',
        outcome: 'Continuidad total y el acople sigue en servicio: B1 y B2 conservan su flexibilidad.',
        steps: [
          info('Coordinar', 'BT sin tensión y ningún seccionador de transferencia cerrado.', { focus: 'BT' }),
          close('89-TR-B1', 'Se elige la barra donde está T1 (B1). Sin corriente: el 52-TR está abierto.', 'Bajo'),
          close('89-TR-T', 'El campo de transferencia queda listo.', 'Bajo'),
          protect('T1', '52-TR', 'El 52-TR toma los ajustes de protección de T1.'),
          close('52-TR', 'La BT se energiza y queda probada.'),
          close('89-T1-T', 'Cierre equipotencial: dos caminos en paralelo.'),
          open('52-T1', 'T1 por B1 → 52-TR → BT → 89-T1-T. Sin interrupción.'),
          open('89-T1-L', 'Aislamiento del lado de la línea.', 'Bajo'),
          open('89-T1-B1', 'El 52-T1 queda aislado.', 'Bajo'),
          lock(['89-T1-L', '89-T1-B1', '89-T1-B2']),
          verify('52-T1', 'Detector a ambos lados del interruptor: 0 kV.', 'Bajo'),
          pat('52-T1'),
          hand('Continuidad total, y el acople sigue cerrado: la doble barra conserva toda su flexibilidad.'),
        ] },
      { key: 'C', title: 'Falla en la barra B1', short: 'Falla', goal: 'Observar el disparo de B1 y recuperar los circuitos por B2.',
        outcome: 'Interrupción breve: se recupera el servicio pasando los circuitos a B2.', steps: dbBusFault(['L1', 'T1']) },
    ],
  },
];
