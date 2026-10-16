# SubestaLab — Base de conocimiento

> Documento maestro de SubestaLab. Sirve a tres lectores:
> 1. **El equipo de desarrollo**: define la topología, los estados y las secuencias que la aplicación debe animar y evaluar.
> 2. **El chat de IA**: es la única fuente de verdad sobre la que responde el asistente (ver `Prompt_Chat_IA.md`).
> 3. **El docente y los estudiantes**: resume la teoría del Tema 2 (Configuración de Subestaciones) con las maniobras de mantenimiento paso a paso.
>
> Versión 1.0 — 2026-10-15. Curso: Subestaciones Eléctricas, Tema 2 (Prof. Jose David Doria García, Universidad del Norte).
>
> **Aviso:** las secuencias son **didácticas y generales**. Cada empresa de transmisión o distribución tiene sus propias consignas operativas, enclavamientos y nomenclatura; en una instalación real manda el procedimiento aprobado por el Centro de Control.

---

## Índice

1. Conceptos fundamentales
2. Elementos de la subestación (biblioteca SVG)
3. Protecciones y funciones ANSI
4. Reglas de maniobra y seguridad
5. Convención de estados de la aplicación
6. Convenciones del modelo (nomenclatura de la app)
7. Configuraciones y escenarios (7.1 a 7.10)
8. Tabla comparativa
9. Errores de maniobra y sus consecuencias (modo práctica)
10. Modo interactivo: reglas de validación
11. Glosario
12. Preguntas frecuentes
13. Fuentes

---

## 1. Conceptos fundamentales

### 1.1 Configuración de una subestación

La **configuración** es el arreglo de las barras y del equipo de conmutación asociado (interruptores y seccionadores) de una subestación. De ella dependen la flexibilidad, la seguridad y la confiabilidad de la instalación.

Para elegir una configuración se considera:
- La función de la subestación en el sistema interconectado (necesidades de flexibilidad, confiabilidad y seguridad).
- El tipo de subestación: generación, transformación o maniobra.
- Facilidad de extensión y modulación.
- Simplicidad del control y las protecciones.
- Facilidad de mantenimiento.
- Área disponible.
- Costos.

### 1.2 Criterios de diseño

| Criterio | Definición | Qué mide en la práctica |
|---|---|---|
| **Seguridad** | Propiedad de una instalación para dar continuidad de servicio **sin interrupción alguna** durante fallas o mantenimiento de los equipos de potencia, especialmente interruptores y barras. | ¿Se pierde algún circuito, aunque sea un instante, cuando falla una barra o un interruptor? Se suele categorizar por la potencia perdida y su impacto en el sistema (contingencias N-1, N-2). |
| **Flexibilidad** | Capacidad de acomodarse a distintas condiciones: cambios operativos, contingencias y mantenimiento. | ¿Puedo agrupar circuitos, separar barras, limitar cortocircuito, independizar cargas? Ej.: control de P y Q, agrupar circuitos de carga o generación, limitar niveles de cortocircuito, aumentar la estabilidad. |
| **Confiabilidad** | Probabilidad de que la subestación cumpla su función (transformación, maniobra y protección) sin interrupciones durante un periodo, incluso con al menos un componente fuera de servicio. | ¿Puedo **recuperar** el servicio (aunque haya una interrupción breve) o hacer mantenimiento sin dejar circuitos fuera? |

- La forma de aumentar la confiabilidad y la seguridad es la **redundancia** de componentes, que eleva los costos.
- Factores de confiabilidad: disponibilidad de equipos críticos (transformadores, interruptores, barras), configuración, mantenimiento preventivo y predictivo, y protecciones bien coordinadas.
- **Diferencia clave seguridad / confiabilidad:** en una doble barra, una falla en barra interrumpe los circuitos de esa barra (no hay seguridad), pero se recuperan pasándolos a la otra barra (sí hay confiabilidad). En interruptor y medio, la falla en barra no interrumpe ningún circuito (hay seguridad).

### 1.3 Contingencia N-1

Un sistema cumple el criterio **N-1** si puede seguir operando dentro de sus límites tras la salida de un solo elemento (una línea, un transformador, un interruptor o una barra). **N-2** se refiere a la salida simultánea de dos elementos, por ejemplo una falla durante un mantenimiento.

### 1.4 Las dos tendencias

| Tendencia | Idea | Configuraciones |
|---|---|---|
| **Conexión de barras (tendencia europea)** | Cada circuito tiene **un interruptor** y puede conectarse a una o más barras por medio de **seccionadores**. | 1. Barra sencilla · 2. Barra principal y de transferencia · 3. Doble barra · 4. Doble barra + seccionador de by-pass · 5. Doble barra + seccionador de transferencia · 6. Doble barra + barra de transferencia |
| **Conexión de interruptores (tendencia americana)** | Los circuitos se conectan a las barras, o entre ellas, por medio de **interruptores**. Cada circuito queda unido al resto por dos (o tres) interruptores en "paralelo". | 7. Anillo · 8. Interruptor y medio · 9. Doble interruptor · 10. Anillo cruzado |

Las configuraciones de conexión de interruptores dan mayor confiabilidad y seguridad porque usan **redundancia de interruptores**. En contrapartida, desconectar un circuito obliga a abrir dos (o tres) interruptores.

### 1.5 Bahía, campo, diámetro

- **Bahía (campo, paño, posición):** conjunto de equipos que conecta un circuito (línea o transformador) a las barras: seccionadores, interruptor, TC, TP, pararrayos, etc.
- **Diámetro:** en interruptor y medio, el grupo de tres interruptores en serie entre las dos barras que sirve a dos circuitos. En EE. UU. se le llama *bay*.
- **Acople:** bahía con un interruptor que une dos barras principales (doble barra).
- **Bahía de transferencia:** bahía con un interruptor que une la barra principal con la barra de transferencia.

---

## 2. Elementos de la subestación (biblioteca SVG)

Todos los elementos se dibujan como **componentes SVG** con símbolo IEC/ANSI. En el diagrama unifilar, todos tienen orientación vertical por defecto, con terminales arriba y abajo.

### 2.1 Barraje o barra colectora

| Campo | Contenido |
|---|---|
| Función | Nodo común al que se conectan los circuitos. Recolecta y distribuye la energía. Puede ser rígido (tubo de aluminio) o flexible (cable tensado entre pórticos). |
| Tipos en la app | **Barra principal** (B1, B2): barra llena de 8 px. **Barra de transferencia** (BT): barra hueca con contorno. Solo se energiza durante la transferencia. |
| Estados | Energizada · Desenergizada · Puesta a tierra · En mantenimiento · En falla |
| Animación | Energizada: pulso de luz lima que recorre la barra. Falla: destello rojo con arco. Puesta a tierra: rayado amarillo. |
| Nota de diseño | Las dos barras de una doble barra deben tener la misma capacidad, igual a la capacidad total de la subestación. |

### 2.2 Interruptor de potencia — código ANSI **52**

| Campo | Contenido |
|---|---|
| Función | Único equipo capaz de **abrir y cerrar con carga y bajo falla (cortocircuito)**. Es el responsable inmediato del estado de conexión del campo. Lo mandan las protecciones. |
| Medio de extinción | SF6 (el más común en AT/EAT), vacío (MT), aceite (antiguos), aire comprimido. El SF6 se puede licuar a baja temperatura y presión. Una baja de presión de SF6 bloquea el interruptor. |
| Mecanismo | Resorte, hidráulico o neumático. Abre en 2 a 3 ciclos (≈ 33 a 50 ms a 60 Hz). |
| Símbolo app | Cuadrado de 28 px. **Cerrado = relleno**. **Abierto = hueco con contactos separados**. |
| Estados | Cerrado · Abierto · Disparado (abierto por protección) · Bloqueado (LOTO) · En mantenimiento · Falla de interruptor (no abre) |
| Animación | Apertura: el relleno se vacía, los contactos se separan y salta una **chispa breve** (el arco se extingue dentro de la cámara). Disparo: igual, más un destello rojo y la etiqueta "TRIP". |
| Regla de oro | Siempre se abre **primero** el interruptor y **después** los seccionadores. Se cierra **último**. |

### 2.3 Seccionador — código ANSI **89**

| Campo | Contenido |
|---|---|
| Función | Da un **corte visible** para aislar equipos. **No está diseñado para operar con carga**, salvo los que tienen dispositivos de extinción. Solo puede abrir corrientes despreciables (capacitivas de barras o de equipos en vacío) o conmutar corriente entre dos caminos en paralelo **equipotenciales**. |
| Tipos | Apertura central, doble apertura lateral, rotación central, **pantógrafo** y **semipantógrafo** (conexión vertical, usados en la doble barra + seccionador de transferencia), apertura vertical. |
| Funciones según ubicación | **De barra o selector** (une la bahía a una barra) · **De línea o de salida** · **De by-pass o paso directo** (en paralelo con el interruptor) · **De transferencia** (une el circuito a la barra de transferencia) · **De acople**. |
| Símbolo app | Cuchilla IEC: contacto fijo arriba y cuchilla sobre pivote circular. Abierto = cuchilla girada 30°. |
| Estados | Cerrado · Abierto · Bloqueado (candado LOTO) |
| Animación | La cuchilla gira 30° de forma suave. Si se abre **con carga** (error), aparece un **arco eléctrico** animado entre la cuchilla y el contacto, con chispas y destello. |
| Regla | Antes de abrir o cerrar un seccionador se verifica que el interruptor asociado esté **abierto**, o que exista un camino paralelo cerrado (condición equipotencial). |

### 2.4 Seccionador de puesta a tierra — código ANSI **57**

| Campo | Contenido |
|---|---|
| Función | Conecta un tramo desenergizado a la malla de tierra (cuchilla de puesta a tierra). Suele ir integrado al seccionador de línea; también existen seccionadores de puesta a tierra de barra. Protege al personal contra reenergizaciones accidentales y tensiones inducidas. |
| Regla | **Solo se cierra después de comprobar ausencia de tensión.** En líneas de transmisión hay que confirmar con el Centro de Control que el **otro extremo** está abierto, porque la línea puede estar energizada desde la subestación remota. |
| Símbolo app | Cuchilla con símbolo de tierra. Normalmente abierta. |
| Animación | Al cerrarse, el tramo se cubre con rayado amarillo y aparece un ícono de tierra pulsante. Si se cierra **con tensión** (error grave), se produce un cortocircuito franco a tierra con un arco intenso y el disparo de la protección. |
| Puesta a tierra temporal (portátil) | Juego de tres pinzas (una por fase) unidas a un cable conectado a la malla. Se instala **a ambos lados** del equipo en mantenimiento (por ejemplo, del interruptor). En la app es el elemento **PAT**. Se conecta primero a tierra y luego a las fases; se retira en orden inverso. |

### 2.5 Transformador de corriente (TC) — también "TT/CC"

- **Función:** reduce la corriente primaria a un valor normalizado (1 A o 5 A) para medida y protección. Su primario está en serie con el circuito.
- **Ubicación:** junto al interruptor. En la barra principal + transferencia conviene ubicarlo del **lado de la línea**, para que la protección siga funcionando con el circuito transferido.
- **Seguridad:** **nunca se abre el secundario de un TC con corriente**, porque aparecen sobretensiones peligrosas.
- **Símbolo app:** conductor que atraviesa un anillo. Cuando circula corriente, el anillo brilla.

### 2.6 Transformador de potencial o de tensión (TP) — también "TT/PP"

- **Función:** reduce la tensión a un valor normalizado (≈ 110 a 120 V) para medida, protección y sincronización. Se conecta en derivación (fase–tierra).
- **Tipos:** inductivo, o **capacitivo** (TPC/DCP). El capacitivo también sirve de acople para la onda portadora (PLC).
- **Uso en maniobras:** permite **verificar presencia o ausencia de tensión** y el sincronismo (función 25).
- **Seguridad:** nunca se cortocircuita su secundario.
- **Símbolo app:** dos devanados acoplados. Cuando hay tensión, aparece una lectura "kV" en la etiqueta.

### 2.7 Descargador de sobretensiones (DPS / pararrayos)

- **Función:** limita las sobretensiones de origen atmosférico (rayos) y de maniobra, y deriva la corriente a tierra. Los modernos son de **óxido de zinc (ZnO)**, sin explosores.
- **Ubicación:** en la entrada de las líneas y junto a los transformadores (lo más cerca posible del equipo protegido).
- **Símbolo app:** cuerpo resistivo con flecha interna, conectado a tierra.
- **Animación:** ante un rayo o sobretensión (escenario opcional), se ilumina y deriva un pulso a tierra.

### 2.8 Trampa de onda (TO)

- **Función:** bobina en **serie** con la línea, sintonizada para **bloquear** las señales de comunicación por onda portadora (PLC, ≈ 30 a 500 kHz) y dejar pasar la frecuencia industrial (60 Hz). Así confina la señal a la línea, para teleprotección, voz y datos.
- **Ubicación:** a la entrada de la línea, junto con el TP capacitivo que acopla la señal.
- **Símbolo app:** bobina en serie.

### 2.9 Transformador de potencia

- **Función:** cambia el nivel de tensión (por ejemplo 230/115 kV o 115/34,5 kV). En la app se modela como una **carga** que alimenta una red de media tensión.
- **Protecciones propias:** diferencial (87T), Buchholz y presión súbita (63), sobrecorriente (50/51), temperatura (26/49).
- **Símbolo app:** dos círculos entrelazados. Cuando está energizado, los círculos "respiran" y unas ondas indican carga.

### 2.10 Salida de línea

- **Función:** conexión con otra subestación. En la app, **las líneas son fuentes**: el sistema es enmallado y la línea está energizada desde el extremo remoto.
- **Consecuencia didáctica importante:** abrir el interruptor local **no** desenergiza la línea. Para ponerla a tierra hay que abrir también el extremo remoto (coordinación con el Centro de Control).
- **Símbolo app:** conductor terminado en flecha. Cuando está energizada, la flecha emite pulsos.

### 2.11 Otros elementos útiles en el modo interactivo

- **Aisladores, pórticos y cables de guarda:** contexto físico, no se simulan.
- **Seccionador de barra (seccionamiento longitudinal):** divide una barra en dos secciones.
- **Reactor de barra o de línea:** compensación inductiva (aparece en los unifilares UPME del curso).
- **Candado LOTO:** elemento gráfico que aparece sobre los mandos bloqueados.

---

## 3. Protecciones y funciones ANSI

| Código | Función | Papel en las maniobras y fallas de la app |
|---|---|---|
| **21** | Distancia | Protección principal de líneas. Dispara los interruptores de la línea en falla. |
| **25** | Verificación de sincronismo | Permite cerrar un interruptor que une dos sistemas energizados. Límites típicos: ΔV ≤ 20 %, Δf ≤ 200 mHz, Δθ ≤ 20°. |
| **50/51** | Sobrecorriente instantánea / temporizada | Respaldo; protección de transformadores y alimentadores. |
| **50BF** | Falla de interruptor (*breaker failure*) | Si un interruptor recibe orden de disparo y no abre en ≈ 150 a 250 ms, dispara todos los interruptores adyacentes (los de su barra, o el siguiente del diámetro). |
| **52** | Interruptor de potencia | — |
| **57** | Seccionador de puesta a tierra | — |
| **79** | Recierre automático | Se **deshabilita** en trabajos en caliente o mantenimiento de líneas. Es complejo en el interruptor central del interruptor y medio. |
| **86** | Relé de bloqueo (*lockout*) | Tras un disparo por falla interna (87B, 87T) impide el cierre hasta un reset manual. |
| **87B** | Diferencial de barras | Detecta fallas **dentro** de la zona de la barra y dispara todos los interruptores conectados a ella. En doble barra usa la **réplica de las posiciones de los seccionadores** para saber qué bahía está en qué barra. |
| **87T** | Diferencial de transformador | Falla interna del transformador. |
| **87L** | Diferencial de línea | Se deshabilita durante algunos procesos de by-pass. |
| **89** | Seccionador | — |

**Transferencia de protecciones:** cuando un circuito pasa a alimentarse por el interruptor de transferencia o de acople, **las protecciones del circuito deben pasar a ese interruptor**, mediante un selector de transferencia o con los ajustes del circuito cargados en el relé del interruptor de transferencia. Si no se hace, el circuito queda sin protección adecuada.

---

## 4. Reglas de maniobra y seguridad

### 4.1 Orden de prioridades en la operación

1. **Seguridad de las personas y la vida.**
2. **Seguridad de los equipos.**
3. **Continuidad del servicio.**

### 4.2 Proceso de toda maniobra

1. **Planificar:** qué se va a hacer, cómo, cuándo y qué resultado se espera.
2. **Prever resultados adversos:** tener decisiones preparadas.
3. **Ejecutar:** confirmar que el mando corresponde al equipo correcto.
4. **Controlar el resultado:** comprobar el cambio de estado. Al abrir un interruptor, verificar con los instrumentos que la corriente cayó a cero. Luego se decide entre continuar, repetir o tomar una acción correctiva.

- El peligro mayor es la **mecanización**: maniobrar distraído.
- Un proceso de maniobra iniciado no se interrumpe salvo emergencia.
- Toda maniobra se ejecuta por orden o con autorización del **Centro de Control** y se anota en la **bitácora**.

### 4.3 Las cinco reglas de oro (RETIE, Colombia)

Antes de trabajar sobre una instalación desenergizada:

1. **Corte efectivo y visible** de todas las fuentes de tensión, mediante interruptores **y** seccionadores.
2. **Enclavamiento o bloqueo** (condenación) de los aparatos de corte, y **señalización** en el mando. Es el LOTO (*lockout / tagout*).
3. **Verificación de la ausencia de tensión** en cada una de las fases, con un detector probado antes y después de usarlo.
4. **Puesta a tierra y en cortocircuito** de todas las posibles fuentes de tensión que incidan en la zona de trabajo.
5. **Señalización y delimitación** de la zona de trabajo.

> Referencia: RETIE (Res. MinMinas 181294 de 2008, Art. 19.5, literales k a p; se conservan en las versiones posteriores del RETIE).

### 4.4 Orden de operación de los equipos de una bahía

**Para desenergizar (sacar de servicio):**
1. Abrir el **interruptor (52)** y verificar corriente cero.
2. Abrir el **seccionador del lado de la línea o del equipo (89-L)**.
3. Abrir el **seccionador del lado de la barra (89-B)**.
4. Bloquear y señalizar (LOTO).
5. Verificar ausencia de tensión.
6. Cerrar la puesta a tierra (57) o instalar tierras portátiles.
7. Señalizar y delimitar la zona, y entregar en consignación.

**Para energizar (normalizar), en orden inverso:**
1. Retirar las tierras portátiles y abrir el 57.
2. Retirar el bloqueo.
3. Cerrar el **seccionador de barra**.
4. Cerrar el **seccionador de línea**.
5. Cerrar el **interruptor** (con verificación de sincronismo si la línea está energizada desde el otro extremo).

**¿Por qué el seccionador de línea se abre antes que el de barra?** Si por error el interruptor estuviera cerrado, el arco al abrir el seccionador de línea queda **fuera de la zona de barras** y lo despeja la protección de la propia bahía. Si el arco ocurriera en el seccionador de barra, actuaría la diferencial de barras y saldría **toda la barra**.

**¿Por qué el seccionador de barra se cierra antes que el de línea?** Por la misma razón: el último seccionador en cerrar (el de línea) es el que estaría expuesto a un eventual arco, y una falla ahí la despeja la protección de la bahía y no la de barras.

> Nunca se energiza un circuito cerrando un seccionador: siempre se cierra con el interruptor. Un seccionador no puede cerrar sobre una falla.

### 4.5 Condición equipotencial (maniobra de seccionadores "en paralelo")

Un seccionador **sí** puede operarse con el circuito en servicio cuando sus dos extremos están **al mismo potencial**, porque existe otro camino cerrado en paralelo. Ejemplos:
- **Cambio de barra en caliente** (doble barra, con el acople cerrado): se cierra el selector de la barra de destino y luego se abre el de la barra de origen. La corriente simplemente conmuta de un seccionador al otro.
- **By-pass:** se cierra el seccionador de by-pass **con el interruptor cerrado** y luego se abre el interruptor.
- **Transferencia:** se cierra el seccionador de transferencia del circuito **con el interruptor del circuito cerrado y la barra de transferencia energizada** por el interruptor de transferencia.

Para garantizar la equipotencialidad, durante los cambios de selector **el interruptor de acople se bloquea en posición cerrado** (se le quita el mando o se inhibe su disparo). Si el acople se abriera en mitad de la maniobra, un seccionador quedaría abriendo carga y se formaría un arco.

### 4.6 Transferencia en caliente y en frío

- **En caliente (bajo carga, sin interrupción):** requiere el acople cerrado y bloqueado. Se cierra primero el seccionador de destino y luego se abre el de origen.
- **En frío (con interrupción):** se abre el interruptor de la bahía, se abre el selector de origen, se cierra el selector de destino y se cierra el interruptor. Es la que se usa tras una **falla en barra**, cuando la barra afectada está desenergizada.

### 4.7 Consignación

La **consignación** es la entrega formal de un equipo, desenergizado y en condiciones seguras, al jefe del trabajo. El Centro de Control "entrega el campo abierto" y el responsable del mantenimiento lo "devuelve para su normalización". La solicitud indica las zonas de trabajo, las zonas de seguridad, el estado de los aparatos de corte y las puestas a tierra.

### 4.8 Reglas particulares

- **Solo un circuito a la vez** puede estar transferido por una barra de transferencia o un by-pass. Solo un seccionador de transferencia o de by-pass cerrado.
- **Barra de transferencia:** antes de cerrar el seccionador de transferencia de un circuito, se energiza la barra de transferencia con el interruptor de transferencia, para **probar que está sana**. Si tuviera una falla, dispara el interruptor de transferencia y no el circuito.
- **Líneas:** antes de cerrar la puesta a tierra, se confirma que el extremo remoto está abierto y que no hay tensión inducida.
- **Recierre (79):** se deshabilita durante trabajos en líneas.
- **Equipos disparados por protección** no se reenergizan hasta conocer la causa, salvo un intento de reconexión de prueba en líneas.
- **Enclavamientos:** si un equipo no obedece, se asume que la maniobra es incorrecta, no que el enclavamiento falló.

---

## 5. Convención de estados de la aplicación

| Estado | Código | Color (token) | Representación y animación |
|---|---|---|---|
| Energizado | `E` | Verde lima de marca `--primary #7BEA6F`, con trazo oscuro para contraste | Conductor con **flujo de partículas** animado en el sentido de la potencia. Barras con pulso de brillo. TC con anillo encendido. |
| Desenergizado | `D` | Gris `#A8A29E` | Conductor gris sin flujo; transición de apagado en cascada desde el punto de corte. |
| Puesto a tierra | `T` | Amarillo seguridad `#F5C400` con rayado diagonal | Banda rayada que "se dibuja" sobre el tramo e ícono de tierra pulsante. |
| En mantenimiento / LOTO | `M` | Gris con contorno punteado | Trazo punteado, candado sobre los mandos bloqueados y etiqueta "No operar". |
| Falla | `F` | Rojo `#E5484D` / naranja `#FF8A00` | **Arco eléctrico** (rayo zigzag animado, destellos, partículas), sacudida breve del tramo y onda expansiva. |
| Disparo por protección | — | Rojo | Etiqueta "TRIP 87B" o "TRIP 21" sobre el interruptor y apertura rápida. |
| Equipo resaltado (paso actual) | — | Anillo pulsante oscuro | Halo alrededor del elemento que se va a operar. |
| Error del estudiante (práctica) | — | Rojo | Sacudida del elemento, tarjeta de error con la explicación. En errores peligrosos se simula la consecuencia (arco). |

El estado de energización **se calcula** por recorrido del grafo (ver §6.4); no se escribe a mano en cada paso.

---

## 6. Convenciones del modelo (nomenclatura de la app)

### 6.1 Circuitos

| Circuito | Tipo | Comportamiento en el modelo |
|---|---|---|
| **L1, L2, L3** | Línea de transmisión | **Fuente.** Está energizada desde el extremo remoto. Abrir su interruptor no la desenergiza. |
| **T1, T2, T3** | Transformador de potencia | **Carga pasiva.** Alimenta una red de MT sin generación. Si queda sin camino a una fuente, la carga pierde servicio. |

### 6.2 Identificadores de elementos

| Patrón | Significado |
|---|---|
| `B1`, `B2` | Barras principales |
| `BT` | Barra de transferencia |
| `52-X` | Interruptor del circuito X (p. ej. `52-T1`) |
| `89-X-B` | Seccionador de barra del circuito X (barra sencilla, BP+BT) |
| `89-X-B1`, `89-X-B2` | Seccionadores selectores de barra 1 y barra 2 |
| `89-X-L` | Seccionador de línea o del lado del equipo |
| `89-X-I` | Seccionador adyacente al interruptor, lado barras (doble barra + by-pass) |
| `89-X-BP` | Seccionador de by-pass |
| `89-X-T` | Seccionador de transferencia |
| `57-X` | Puesta a tierra del circuito X |
| `57-B1` | Puesta a tierra de la barra B1 |
| `PAT-52-X` | Puestas a tierra temporales a ambos lados del interruptor 52-X |
| `52-AC`, `89-AC-B1`, `89-AC-B2` | Acople de barras |
| `52-TR`, `89-TR-B`, `89-TR-B1`, `89-TR-B2`, `89-TR-T` | Bahía de transferencia |
| `52-1`, `89-1a`, `89-1b` | Anillo: interruptor 1 y sus seccionadores |
| `52-1A`, `52-1B`, `52-1C` | Interruptor y medio: interruptores del diámetro 1 (A lado B1, B central, C lado B2) |
| `52-L1-1`, `52-L1-2` | Doble interruptor: interruptor del circuito L1 hacia B1 (-1) y hacia B2 (-2) |
| `52-S1..S3`, `52-I1..I3`, `52-V1..V3` | Anillo cruzado: anillo superior, anillo inferior y verticales |

### 6.3 Acciones posibles en un paso

`abrir`, `cerrar`, `bloquear` (LOTO), `verificar_ausencia`, `poner_tierra`, `transferir_protecciones`, `bloquear_acople` / `desbloquear_acople`, `coordinar` (paso informativo con el Centro de Control), `falla` (evento), `disparo` (evento de protección), `entregar` (consignación).

### 6.4 Cálculo de energización (motor de la app)

1. El diagrama es un **grafo**: los nodos son terminales y los arcos son conductores o equipos.
2. Los interruptores y seccionadores cerrados conducen; los abiertos no.
3. Se recorre el grafo (BFS) desde cada **fuente** (líneas). Todo lo alcanzado queda **energizado**.
4. Lo conectado a un 57 cerrado o a una PAT queda **puesto a tierra**. Si un tramo está a la vez energizado y a tierra, hay **cortocircuito**: falla, arco y disparo.
5. Una carga (transformador) sin camino a una fuente **pierde servicio** (indicador de continuidad).
6. Un seccionador que se abre mientras **circula corriente** por él y no existe un camino paralelo cerrado produce **arco** (error).

---

## 7. Configuraciones y escenarios

Cada configuración tiene **tres escenarios**:
- **A — Mantenimiento de barra(s).** En el anillo y el anillo cruzado, que no tienen barra colectora, se reemplaza por la **salida prolongada de un circuito**.
- **B — Mantenimiento de un interruptor.**
- **C — Falla** (arco, actuación de protecciones, zona afectada y recuperación).

En las tablas de pasos, la columna "Riesgo" indica el riesgo operativo del estado alcanzado: **Bajo**, **Medio** o **Alto**.

---

### 7.1 Barra sencilla

**Descripción.** Un solo barraje colector al que se conectan los circuitos, cada uno por medio de un interruptor con sus seccionadores. Se usa donde la continuidad de servicio no es primordial o con muy pocos campos.

**Características**
- Ventajas: económica, simple en concepto y operación, fácil de proteger, ocupa poco espacio, poca posibilidad de operación incorrecta y fácil de extender.
- Desventajas: no tiene confiabilidad, seguridad ni flexibilidad. Una falla o mantenimiento en la barra saca **toda** la subestación. Una falla o mantenimiento en un interruptor saca **todo el circuito**.
- Variante: **barra seccionada** con un seccionador o interruptor longitudinal. Con ella una falla o mantenimiento deja fuera solo la mitad, pero en operación normal los circuitos no se pueden cambiar de sección. Un seccionamiento mal planeado puede atentar contra la seguridad del sistema.
- Nota del PDF del curso: según la tensión, el elemento de corte puede ser un fusible, un seccionador de carga o un interruptor. El seccionador de línea podría omitirse según el contexto.
- Tabla del curso (diap. 18): **Flexibilidad: No tiene · Confiabilidad: No tiene · Seguridad: No tiene.**

**Modelo de la app**
- Barra `B1` con `57-B1`.
- Bahías `L1` y `L2` (líneas, fuentes): `89-Lx-B`, `52-Lx`, TC, `89-Lx-L`, `57-Lx`, TP capacitivo, trampa de onda, DPS, salida.
- Bahía `T1` (transformador, carga): `89-T1-B`, `52-T1`, TC, `89-T1-L`, DPS, transformador T1 y carga MT.

**Estado normal:** todos los 52 y 89 cerrados; todos los 57 abiertos.

#### Escenario A — Mantenimiento de la barra B1 (salida total)

| # | Acción | Elemento | Qué pasa y por qué | Riesgo |
|---|---|---|---|---|
| 1 | Coordinar | Centro de Control | Se programa la **salida total** de la subestación y se avisa a los usuarios afectados. En barra sencilla no hay otra barra a dónde pasar los circuitos. | Bajo |
| 2 | Abrir | `52-T1` | Se abre primero la **carga**: T1 y la red MT quedan sin servicio. | Medio |
| 3 | Abrir | `52-L2` | La barra queda alimentada solo por L1. | Medio |
| 4 | Abrir | `52-L1` | **B1 queda desenergizada.** Las líneas siguen energizadas desde sus extremos remotos, hasta sus interruptores. | Medio |
| 5 | Abrir | `89-T1-B` | Corte visible entre la barra y la bahía T1. | Medio |
| 6 | Abrir | `89-L2-B` | Corte visible con la bahía L2, cuyo interruptor sigue energizado por el lado de la línea. | Medio |
| 7 | Abrir | `89-L1-B` | B1 queda aislada de **todas** las fuentes. | Medio |
| 8 | Bloquear | `89-L1-B`, `89-L2-B`, `89-T1-B` | Candados LOTO y tarjetas de "No operar". | Bajo |
| 9 | Verificar ausencia | `B1` | Detector de tensión en las tres fases. Lectura: 0 kV. | Medio |
| 10 | Poner a tierra | `57-B1` | B1 a tierra y en cortocircuito. | Bajo |
| 11 | Entregar | Zona de trabajo | Se delimita la zona y se entrega la barra en consignación. | Bajo |

- **Pasos intercambiables:** 2–4 entre sí (aunque se recomienda abrir primero las cargas), y 5–7 entre sí.
- **Continuidad:** se pierde **todo** el servicio de la subestación durante el mantenimiento.
- **Lección:** es la mayor debilidad de la barra sencilla. Con barra seccionada solo saldría la mitad.

#### Escenario B — Mantenimiento del interruptor 52-T1

| # | Acción | Elemento | Qué pasa y por qué | Riesgo |
|---|---|---|---|---|
| 1 | Coordinar | Centro de Control | El circuito T1 saldrá de servicio: no hay forma de reemplazar su interruptor. | Bajo |
| 2 | Abrir | `52-T1` | Se interrumpe la carga y se verifica corriente cero. T1 queda **sin servicio**. | Medio |
| 3 | Abrir | `89-T1-L` | Corte visible del lado del transformador. Sin corriente: no hay arco. | Medio |
| 4 | Abrir | `89-T1-B` | Corte visible del lado de barra. El 52-T1 queda aislado. | Medio |
| 5 | Bloquear | `89-T1-L`, `89-T1-B` | LOTO. | Bajo |
| 6 | Verificar ausencia | `52-T1` (ambos lados) | 0 kV. | Medio |
| 7 | Poner a tierra | `PAT-52-T1` | Tierras portátiles a ambos lados del interruptor. | Bajo |
| 8 | Entregar | Zona de trabajo | El interruptor queda en mantenimiento. | Bajo |

**Continuidad:** se pierde el circuito T1; L1 y L2 siguen en servicio.

#### Escenario C — Falla en la barra B1

| # | Evento / acción | Elemento | Qué pasa y por qué | Riesgo |
|---|---|---|---|---|
| 1 | Operación normal | — | Todo energizado. | Bajo |
| 2 | **Falla** | `B1` | Cortocircuito fase–tierra en la barra (por ejemplo, un animal o contaminación del aislador). **Arco eléctrico** en la barra. | Alto |
| 3 | Disparo 87B | `52-L1`, `52-L2`, `52-T1` | La diferencial de barras detecta la falla dentro de su zona y el relé 86 dispara **todos** los interruptores de la barra en ≈ 80 a 100 ms. El arco se extingue. | Alto |
| 4 | Resultado | — | **Toda la subestación sin servicio.** El 86 bloquea el cierre. | Alto |
| 5 | Abrir | `89-L1-B`, `89-L2-B`, `89-T1-B` | Se aísla la barra fallada (sin corriente) para inspección y reparación. | Medio |
| 6 | Reflexión | — | Hasta reparar la barra **no hay forma de recuperar el servicio**: no hay seguridad ni confiabilidad ante falla en barra. | — |

---

### 7.2 Barra principal más barra de transferencia

**Descripción.** A la barra sencilla se le agrega una **barra auxiliar o de transferencia (BT)**, un **seccionador de transferencia** en cada circuito y un **interruptor de transferencia** que une las dos barras. La BT se energiza **solo para mantenimiento**, y entonces el interruptor de transferencia pasa a ser la protección del circuito transferido.

**Características**
- Permite el mantenimiento de interruptores sin afectar el servicio (confiabilidad ↑). También conserva el servicio ante una falla interna del interruptor, siempre que no haya falla en el circuito.
- Si la barra principal se divide con dos seccionadores (opcionales) y el interruptor de transferencia queda entre ellos, el mantenimiento de barra deja sin servicio solo media subestación (flexibilidad ↑).
- La protección se complica: las protecciones del circuito pasan al interruptor de transferencia.
- Una falla en la barra principal o en un interruptor saca toda la subestación hasta despejarla (seguridad ↓).
- Solo **un** circuito puede operarse a la vez desde la barra de transferencia.
- Los TC deben ir del lado de la línea. La capacidad de la barra y del campo de transferencia debe ser igual a la del mayor circuito.
- Muy usada en distribución exterior, en centrales de generación medianas y en subestaciones de transformación. Es económica.
- En casos especiales la BT puede servir de puente de paso para una línea que entra y sale de la subestación.
- Tabla del curso (diap. 18, "SB c/ Int"): **Flexibilidad: No tiene · Confiabilidad: Baja · Seguridad: No tiene.**

**Modelo de la app**
- Barras `B1` (principal, con `57-B1`) y `BT`.
- Bahías `L1`, `L2`, `T1`: `89-X-B`, `52-X`, TC, `89-X-L` y `89-X-T` (del lado del circuito hacia BT).
- Bahía de transferencia: `89-TR-B`, `52-TR`, `89-TR-T`.

**Estado normal:** BT desenergizada; `52-TR`, `89-TR-B`, `89-TR-T` y todos los `89-X-T` abiertos.

#### Escenario B — Mantenimiento del interruptor 52-T1 **sin interrumpir T1**

| # | Acción | Elemento | Qué pasa y por qué | Riesgo |
|---|---|---|---|---|
| 1 | Coordinar | Centro de Control | Se verifica que BT esté desenergizada y que **ningún** seccionador de transferencia esté cerrado. | Bajo |
| 2 | Cerrar | `89-TR-B` | Se prepara el campo de transferencia; sin corriente porque 52-TR está abierto. | Bajo |
| 3 | Cerrar | `89-TR-T` | El campo de transferencia queda listo. | Bajo |
| 4 | Transferir protecciones | `52-TR` | El relé del interruptor de transferencia toma los ajustes del circuito T1. | Bajo |
| 5 | Cerrar | `52-TR` | **BT se energiza.** Es la prueba de que la barra está sana: si tuviera una falla, dispararía el 52-TR y no T1. | Medio |
| 6 | Cerrar | `89-T1-T` | Condición **equipotencial**: BT y el lado del transformador ya están al mismo potencial. T1 queda alimentado por **dos caminos en paralelo**. | Medio |
| 7 | Abrir | `52-T1` | Toda la corriente de T1 pasa por **52-TR → BT → 89-T1-T**. T1 **no se interrumpe**. | Medio |
| 8 | Abrir | `89-T1-L` | Sin corriente. Aislamiento del lado del transformador. | Medio |
| 9 | Abrir | `89-T1-B` | El 52-T1 queda aislado. | Bajo |
| 10 | Bloquear | `89-T1-L`, `89-T1-B` | LOTO. | Bajo |
| 11 | Verificar ausencia | `52-T1` | 0 kV en ambos lados. | Bajo |
| 12 | Poner a tierra | `PAT-52-T1` | Tierras portátiles. | Bajo |
| 13 | Entregar | Zona de trabajo | Mantenimiento con **continuidad total**. | Bajo |

- **Secuencia adoptada por SubestaLab: la de la tabla.** Las diapositivas del curso (26 → 27) muestran solo el estado inicial (BT desenergizada, *tie breaker* abierto) y el final (circuito alimentado por el *tie breaker*, con la nota "settings on tie breaker can be adjusted as req'd"), sin el orden de los pasos. Se elige energizar primero la BT por tres razones: comprueba que la BT está sana antes de comprometer el circuito, todos los seccionadores operan sin corriente o en condición equipotencial, y las protecciones del 52-TR ya están ajustadas cuando el circuito pasa a depender de él.
- **Variante documentada (manual de operación UTP, consigna 9.1.5):** primero se cierra el seccionador de transferencia del circuito con la BT **sin tensión**, luego los seccionadores del campo de transferencia y por último el 52-TR. Después se abren el interruptor de línea, el seccionador de línea y el de barra. También evita operar seccionadores con diferencia de potencial, pero no prueba la BT antes de unirla al circuito. El chat puede mencionarla como alternativa válida.
- **Variante sin interruptor de transferencia (diapositivas 29 a 31 del curso):** algunas subestaciones no tienen *tie breaker*. Entonces la carga cuyo interruptor sale de servicio se alimenta por la BT **desde el circuito de llegada** ("Inc"), cerrando los seccionadores de transferencia de ambos. Como la carga queda protegida por el interruptor de la llegada, "la protección queda comprometida" (*protection is compromised*). SubestaLab modela la versión con interruptor de transferencia.
- **Normalización (inverso):** retirar PAT y LOTO → cerrar `89-T1-B` → cerrar `89-T1-L` → cerrar `52-T1` (paralelo) → abrir `89-T1-T` (equipotencial) → abrir `52-TR` → abrir `89-TR-T`, `89-TR-B` → devolver las protecciones a T1.

#### Escenario A — Mantenimiento de la barra principal B1

La BT **no** ayuda: se alimenta desde la barra principal a través del 52-TR. Mantener la barra principal implica **salida total**, con la misma secuencia de la barra sencilla. Antes se verifica que el `52-TR` y sus seccionadores estén abiertos.

*Nota:* usar la BT como "puente" directo entre una línea y un transformador (cerrando dos seccionadores de transferencia) los dejaría unidos **sin interruptor que los proteja**. No es una práctica aceptable y viola la regla de un solo circuito transferido.

| # | Acción | Elemento | Riesgo |
|---|---|---|---|
| 1 | Coordinar salida total; verificar `52-TR`, `89-TR-B`, `89-TR-T` abiertos | Centro de Control | Bajo |
| 2 | Abrir | `52-T1` | Medio |
| 3 | Abrir | `52-L2` | Medio |
| 4 | Abrir | `52-L1` → B1 desenergizada | Medio |
| 5 | Abrir | `89-T1-B` | Medio |
| 6 | Abrir | `89-L2-B` | Medio |
| 7 | Abrir | `89-L1-B` | Medio |
| 8 | Bloquear | seccionadores de barra | Bajo |
| 9 | Verificar ausencia | `B1` | Medio |
| 10 | Poner a tierra | `57-B1` | Bajo |
| 11 | Entregar | — | Bajo |

#### Escenario C — Falla en la línea L2 con **falla del interruptor 52-L2**

| # | Evento / acción | Elemento | Qué pasa y por qué | Riesgo |
|---|---|---|---|---|
| 1 | Operación normal | — | — | Bajo |
| 2 | **Falla** | Línea `L2` | Cortocircuito en la línea; arco en la línea. | Alto |
| 3 | Orden de disparo 21 | `52-L2` | La protección de distancia ordena abrir el 52-L2... | Alto |
| 4 | **Falla de interruptor** | `52-L2` | ...pero **no abre** (por ejemplo, por baja presión de SF6 o un mecanismo trabado). La falla sigue alimentada desde la barra. | Alto |
| 5 | Disparo 50BF | `52-L1`, `52-T1` (y `52-TR` si estuviera cerrado) | Tras ≈ 200 ms, la protección de falla de interruptor dispara **todos** los interruptores de la barra. | Alto |
| 6 | Resultado | — | **Toda la subestación sin servicio**: una falla en un interruptor reduce la seguridad. | Alto |
| 7 | Abrir | `89-L2-B`, `89-L2-L` | Se aísla el interruptor dañado (ya sin tensión en la barra). | Medio |
| 8 | Cerrar | `52-L1`, luego `52-T1` | Se reenergiza la barra y se recupera T1. | Medio |
| 9 | Reflexión | — | Cuando la línea L2 esté reparada podrá volver a servicio **a través del 52-TR y la BT** mientras se repara el 52-L2. Esa es la confiabilidad que aporta la BT. | — |

---

### 7.3 Doble barra

**Descripción.** Se agrega una **segunda barra principal** y un **interruptor de acople** entre ellas. Cada circuito se conecta a ambas barras mediante **seccionadores selectores**. El acople está normalmente **cerrado**.

**Características**
- Flexible: permite separar circuitos en cada barra, dividir sistemas, limitar cortocircuito y aislar cargas que causan *flicker*. La conexión de un circuito a una u otra barra se puede cambiar **en cualquier momento**. El acople puede usarse como seccionador de barras.
- Permite el **mantenimiento de barras sin suspender el servicio**. Por eso se usa en zonas de alta contaminación.
- El **mantenimiento de interruptores requiere suspender el servicio** del circuito (seguridad ↓). En sistemas muy enmallados o con líneas de doble circuito esto tiene poco efecto.
- Ante una falla en barra, se interrumpen los circuitos de esa barra, pero se recuperan pasándolos a la otra (confiabilidad ↑ solo en barras).
- Ambas barras deben tener la misma capacidad, igual a la total de la subestación. El acople debe soportar la máxima transferencia entre barras.
- Requiere cuidado especial con la **protección diferencial de barras**, que replica la posición de los seccionadores. El campo de acople requiere TC.
- Algunas disposiciones físicas ("punteables") permiten un by-pass temporal mediante cambios de conexiones.
- Se asocia a cargas importantes y a sistemas muy enmallados.
- Tabla del curso (diap. 34): **Flexibilidad: Alta · Confiabilidad: Media (solo en barras) · Seguridad: No tiene.**

**Modelo de la app**
- Barras `B1` y `B2` (con `57-B1` y `57-B2`).
- Bahías `L1` (en B1), `L2` (en B2), `T1` (en B1): `89-X-B1`, `89-X-B2`, `52-X`, TC, `89-X-L` y los elementos de línea.
- Acople: `89-AC-B1`, `52-AC`, `89-AC-B2`.

**Estado normal:** acople cerrado. L1 y T1 en B1 (selector B1 cerrado, B2 abierto). L2 en B2. Hay una fuente en cada barra.

#### Escenario A — Mantenimiento de la barra B1 (sin interrupción)

| # | Acción | Elemento | Qué pasa y por qué | Riesgo |
|---|---|---|---|---|
| 1 | Coordinar | Centro de Control | Se verifica que el acople (`89-AC-B1`, `52-AC`, `89-AC-B2`) esté cerrado: B1 y B2 son **equipotenciales**. | Bajo |
| 2 | Bloquear acople | `52-AC` | Se bloquea **en cerrado** (sin mando ni disparo) para que las barras sigan unidas durante el cambio de selectores. | Medio |
| 3 | Cerrar | `89-L1-B2` | Equipotencial: L1 queda unida a las dos barras a la vez. No hay arco. | Medio |
| 4 | Abrir | `89-L1-B1` | La corriente conmuta al selector de B2. **L1 pasa a B2** sin interrupción. | Medio |
| 5 | Cerrar | `89-T1-B2` | Igual para T1. | Medio |
| 6 | Abrir | `89-T1-B1` | **T1 pasa a B2.** B1 queda sin circuitos; solo la alimenta el acople. | Medio |
| 7 | Desbloquear acople | `52-AC` | Se restituye el mando. | Bajo |
| 8 | Abrir | `52-AC` | **B1 queda desenergizada.** Se verifica corriente cero en el acople. | Medio |
| 9 | Abrir | `89-AC-B1` | Corte visible del acople hacia B1. | Bajo |
| 10 | Abrir | `89-AC-B2` | El acople queda aislado. | Bajo |
| 11 | Bloquear | selectores `89-X-B1` y `89-AC-B1` | LOTO: nadie puede reconectar un circuito a B1. | Bajo |
| 12 | Verificar ausencia | `B1` | 0 kV. | Medio |
| 13 | Poner a tierra | `57-B1` | — | Bajo |
| 14 | Entregar | — | **Continuidad total**: todos los circuitos en B2. | Bajo |

- **Pasos intercambiables:** el par (3, 4) con el par (5, 6). Dentro de cada par, siempre primero cerrar y después abrir.
- **Riesgo principal:** si el acople se abriera durante los pasos 3 a 6, el siguiente selector abriría carga y se formaría un arco. Por eso se bloquea.

#### Escenario B — Mantenimiento del interruptor 52-T1 (con interrupción de T1)

| # | Acción | Elemento | Qué pasa y por qué | Riesgo |
|---|---|---|---|---|
| 1 | Coordinar | Centro de Control | En la doble barra **no** hay forma de reemplazar el interruptor de un circuito: T1 saldrá de servicio. | Bajo |
| 2 | Abrir | `52-T1` | T1 **sin servicio**. | Medio |
| 3 | Abrir | `89-T1-L` | — | Medio |
| 4 | Abrir | `89-T1-B1` | Es el selector cerrado; el `89-T1-B2` ya estaba abierto. | Medio |
| 5 | Bloquear | `89-T1-L`, `89-T1-B1`, `89-T1-B2` | Se bloquean ambos selectores. | Bajo |
| 6 | Verificar ausencia | `52-T1` | — | Medio |
| 7 | Poner a tierra | `PAT-52-T1` | — | Bajo |
| 8 | Entregar | — | — | Bajo |

**Lección:** esta limitación motiva las configuraciones 4, 5 y 6.

#### Escenario C — Falla en la barra B1

| # | Evento / acción | Elemento | Qué pasa y por qué | Riesgo |
|---|---|---|---|---|
| 1 | Operación normal | — | — | Bajo |
| 2 | **Falla** | `B1` | Arco en la barra B1. | Alto |
| 3 | Disparo 87B | `52-L1`, `52-T1`, `52-AC` | La diferencial de barras (zona B1) dispara los interruptores de los circuitos conectados a B1 **y el acople**. | Alto |
| 4 | Resultado | — | **T1 sin servicio** y L1 desconectada. B2 sigue energizada por L2. | Alto |
| 5 | Abrir | `89-T1-B1` | Transferencia **en frío**: el interruptor ya está abierto. | Medio |
| 6 | Cerrar | `89-T1-B2` | — | Medio |
| 7 | Cerrar | `52-T1` | **T1 restablecido desde B2.** | Medio |
| 8 | Abrir, cerrar, cerrar | `89-L1-B1`, `89-L1-B2`, `52-L1` | L1 vuelve a servicio por B2 (cierre con verificación de sincronismo, 25). | Medio |
| 9 | Abrir | `89-AC-B1` | B1 queda aislada para reparación. | Bajo |

**Lección:** hay interrupción (no hay seguridad), pero el servicio se recupera en minutos (sí hay confiabilidad).

---

### 7.4 Doble barra más seccionador de by-pass (paso directo)

**Descripción.** A la doble barra se le agrega, en cada salida, un **seccionador de by-pass** en paralelo con el interruptor y un **seccionador adicional adyacente al interruptor** (`89-X-I`) para poder aislarlo. Reúne, **pero no simultáneamente**, las características de la barra principal + transferencia y de la doble barra: una barra se usa como principal y la otra como **transferencia**, y el **interruptor de acople** hace de interruptor de transferencia.

**Características**
- El interruptor de acople puede usarse como transferencia para **cualquiera** de los interruptores de línea en mantenimiento (confiabilidad ↑).
- Con circuitos conectados a ambas barras **no** es posible el mantenimiento de un interruptor sin interrupción: una barra debe quedar **libre** para usarla como transferencia. No se presentan conjuntamente la flexibilidad y la confiabilidad.
- Es la configuración con **más equipos por campo** y, por tanto, la de mayor probabilidad de operación incorrecta. Mayor costo.
- A menudo no se explota su flexibilidad: una barra se usa como simple reserva o transferencia, lo que no compensa la inversión.

**Modelo de la app**
- Bahía: `89-X-B1` / `89-X-B2` → nodo de bahía → `89-X-I` → `52-X` → TC → `89-X-L` → nodo de línea.
- `89-X-BP` une el nodo de bahía con el nodo de línea, puenteando `89-X-I`, `52-X` y `89-X-L`.
- Acople igual que en la doble barra.

**Estado normal:** acople cerrado; L1 y L2 en B1; **T1 sola en B2**; todos los `89-X-BP` abiertos.

#### Escenario B — Mantenimiento del interruptor 52-T1 por by-pass (sin interrupción)

Idea: T1 se alimentará por **B1 → 52-AC → B2 → by-pass**, de modo que el acople actúe como su interruptor. Para eso B2 debe tener **solo** el circuito T1. En el estado normal del modelo esto ya se cumple. Si otro circuito estuviera en B2, primero habría que pasarlo a B1 en caliente, con el acople bloqueado (§4.5).

| # | Acción | Elemento | Qué pasa y por qué | Riesgo |
|---|---|---|---|---|
| 1 | Coordinar | Centro de Control | Se verifica que T1 está **sola en B2**, el acople cerrado y ningún by-pass cerrado. | Bajo |
| 2 | Transferir protecciones | `52-AC` | El acople toma los ajustes de protección de T1: será su interruptor. | Medio |
| 3 | Cerrar | `89-T1-BP` | El by-pass queda en paralelo con el 52-T1 cerrado (equipotencial). | Medio |
| 4 | Abrir | `52-T1` | La corriente sigue por **B1 → 52-AC → B2 → 89-T1-B2 → 89-T1-BP → T1**. Sin interrupción. | Medio |
| 5 | Abrir | `89-T1-L` | — | Bajo |
| 6 | Abrir | `89-T1-I` | El 52-T1 queda aislado entre `89-T1-I` y `89-T1-L`. | Bajo |
| 7 | Bloquear | `89-T1-I`, `89-T1-L` | LOTO. | Bajo |
| 8 | Verificar ausencia | `52-T1` | — | Bajo |
| 9 | Poner a tierra | `PAT-52-T1` | — | Bajo |
| 10 | Entregar | — | **Continuidad total**, con T1 protegido por el acople. | Bajo |

**Riesgo:** si el acople disparara, T1 saldría de servicio. Mientras dura el by-pass, la subestación pierde la flexibilidad de doble barra, porque B2 está dedicada a T1.

#### Escenario A — Mantenimiento de la barra B1

Igual que en la doble barra (§7.3-A): con el acople bloqueado en cerrado, se pasan L1 y L2 a B2 (cerrar el selector de B2 y abrir el de B1, circuito por circuito). Luego se abre el acople y sus seccionadores, se verifica ausencia de tensión y se cierra `57-B1`. **Sin interrupción.**

| # | Acción | Elemento |
|---|---|---|
| 1 | Coordinar; verificar acople cerrado | Centro de Control |
| 2 | Bloquear acople | `52-AC` |
| 3 | Cerrar | `89-L1-B2` |
| 4 | Abrir | `89-L1-B1` |
| 5 | Cerrar | `89-L2-B2` |
| 6 | Abrir | `89-L2-B1` |
| 7 | Desbloquear acople | `52-AC` |
| 8 | Abrir | `52-AC` |
| 9 | Abrir | `89-AC-B1` |
| 10 | Abrir | `89-AC-B2` |
| 11 | Bloquear | selectores de B1 |
| 12 | Verificar ausencia | `B1` |
| 13 | Poner a tierra | `57-B1` |
| 14 | Entregar | — |

#### Escenario C — Falla en la barra B2

| # | Evento / acción | Elemento | Qué pasa | Riesgo |
|---|---|---|---|---|
| 1 | **Falla** | `B2` | Arco en B2. | Alto |
| 2 | Disparo 87B | `52-T1`, `52-AC` | Salen el circuito de B2 y el acople. | Alto |
| 3 | Resultado | — | **T1 sin servicio**; B1 sigue con L1 y L2. | Alto |
| 4 | Abrir | `89-T1-B2` | Transferencia en frío. | Medio |
| 5 | Cerrar | `89-T1-B1` | — | Medio |
| 6 | Cerrar | `52-T1` | **T1 restablecido** desde B1. | Medio |
| 7 | Abrir | `89-AC-B2` | B2 aislada para reparación. | Bajo |

---

### 7.5 Doble barra más seccionador de transferencia

**Descripción.** Variante de la anterior con **un seccionador menos**: no hay by-pass ni seccionador adyacente al interruptor. En su lugar, cada circuito tiene un **seccionador de transferencia** que une directamente la **barra B2** con el **lado de la línea**. B2 hace de barra de transferencia y el acople de interruptor de transferencia. En la práctica requiere seccionadores **pantógrafo o semipantógrafo**, o seccionadores en los pórticos.

**Características**
- Mismas características generales que la doble barra + by-pass.
- Con circuitos en ambas barras no es posible el mantenimiento de un interruptor: la barra debe estar libre para pasar al modo transferencia.
- Muy usada en Europa en 220 kV. Requiere mayor área que las anteriores.
- Tabla del curso (diap. 34, "DB c/ Sec. Transf."): **Flexibilidad: Alta · Confiabilidad: Alta · Seguridad: Baja.**

**Modelo de la app**
- Bahía: `89-X-B1` / `89-X-B2` → nodo → `52-X` → TC → `89-X-L` → nodo de línea.
- `89-X-T` une B2 con el nodo de línea.
- Acople igual que en la doble barra.

**Estado normal:** acople cerrado; L1 y T1 en B1; L2 en B2; todos los `89-X-T` abiertos.

#### Escenario B — Mantenimiento del interruptor 52-T1 (sin interrupción)

| # | Acción | Elemento | Qué pasa y por qué | Riesgo |
|---|---|---|---|---|
| 1 | Coordinar | Centro de Control | Hay que **liberar B2**, donde está L2. | Bajo |
| 2 | Bloquear acople | `52-AC` | Bloqueado en cerrado. | Medio |
| 3 | Cerrar | `89-L2-B1` | Equipotencial. | Medio |
| 4 | Abrir | `89-L2-B2` | **L2 pasa a B1. B2 queda libre**, energizada por el acople. | Medio |
| 5 | Desbloquear acople y transferir protecciones | `52-AC` | El acople toma la protección de T1. | Medio |
| 6 | Cerrar | `89-T1-T` | Equipotencial: B2 (= B1 vía acople) y el lado de T1 (= B1 vía 52-T1). T1 queda con dos caminos en paralelo. | Medio |
| 7 | Abrir | `52-T1` | T1 alimentado por **B1 → 52-AC → B2 → 89-T1-T**. Sin interrupción. | Medio |
| 8 | Abrir | `89-T1-L` | — | Bajo |
| 9 | Abrir | `89-T1-B1` | El 52-T1 queda aislado. | Bajo |
| 10 | Bloquear | `89-T1-L`, `89-T1-B1`, `89-T1-B2` | — | Bajo |
| 11 | Verificar ausencia | `52-T1` | — | Bajo |
| 12 | Poner a tierra | `PAT-52-T1` | — | Bajo |
| 13 | Entregar | — | Continuidad total. | Bajo |

#### Escenario A — Mantenimiento de la barra B1

Igual que en la doble barra (§7.3-A): con el acople bloqueado se pasan L1 y T1 a B2 en caliente; luego se abre el acople y sus seccionadores, se verifica y se pone a tierra B1. **Sin interrupción.**

#### Escenario C — Falla en la barra B1

Igual que en la doble barra (§7.3-C): disparan `52-L1`, `52-T1` y `52-AC`; T1 queda sin servicio y se recupera con una transferencia en frío a B2.

---

### 7.6 Doble barra más barra de transferencia

**Descripción.** Combina la barra principal + transferencia con la doble barra: **dos barras principales (B1, B2) y una de transferencia (BT)**. Usa un **interruptor de acople** y otro **de transferencia**, lo que permite hacer **ambas operaciones simultáneamente**. Opcionalmente, un solo campo de "acople y transferencia".

**Características**
- Brinda simultáneamente confiabilidad y flexibilidad.
- Permite tanto el acoplamiento de barras como la transferencia.
- Requiere mayor área y más equipos que las anteriores.

**Modelo de la app**
- Barras `B1`, `B2` y `BT`.
- Bahías: `89-X-B1` / `89-X-B2` → `52-X` → TC → `89-X-L` → nodo de línea, y `89-X-T` del nodo de línea a BT.
- Acople: `89-AC-B1`, `52-AC`, `89-AC-B2`.
- Transferencia: `89-TR-B1` / `89-TR-B2` → `52-TR` → `89-TR-T` → BT.

**Estado normal:** acople cerrado; L1 y T1 en B1; L2 en B2; BT desenergizada; campo de transferencia abierto.

#### Escenario B — Mantenimiento del interruptor 52-T1 (sin interrupción y conservando la doble barra)

| # | Acción | Elemento | Qué pasa y por qué | Riesgo |
|---|---|---|---|---|
| 1 | Coordinar | Centro de Control | BT sin tensión y ningún `89-X-T` cerrado. | Bajo |
| 2 | Cerrar | `89-TR-B1` | Se elige la barra donde está T1 (B1). | Bajo |
| 3 | Cerrar | `89-TR-T` | — | Bajo |
| 4 | Transferir protecciones | `52-TR` | Toma los ajustes de T1. | Bajo |
| 5 | Cerrar | `52-TR` | **BT energizada** y probada. | Medio |
| 6 | Cerrar | `89-T1-T` | Equipotencial; dos caminos en paralelo. | Medio |
| 7 | Abrir | `52-T1` | T1 por **B1 → 52-TR → BT → 89-T1-T**. | Medio |
| 8 | Abrir | `89-T1-L` | — | Bajo |
| 9 | Abrir | `89-T1-B1` | — | Bajo |
| 10 | Bloquear | `89-T1-L`, `89-T1-B1`, `89-T1-B2` | — | Bajo |
| 11 | Verificar ausencia | `52-T1` | — | Bajo |
| 12 | Poner a tierra | `PAT-52-T1` | — | Bajo |
| 13 | Entregar | — | Continuidad total **y** el acople sigue en servicio: B1 y B2 conservan su flexibilidad. | Bajo |

#### Escenario A — Mantenimiento de la barra B1

Igual que en la doble barra (§7.3-A). Además puede hacerse **mientras** un interruptor está transferido, siempre que la bahía de transferencia se alimente desde B2.

#### Escenario C — Falla en la barra B1

Igual que en la doble barra (§7.3-C). Si en ese momento había un circuito transferido desde B1, también sale el `52-TR`, y se recupera pasando el campo de transferencia de `89-TR-B1` a `89-TR-B2` en frío.

---

### 7.7 Anillo

**Descripción.** No existe barra colectora: los circuitos se conectan a un **anillo formado por interruptores**, con un circuito entre cada dos interruptores. Cada interruptor tiene un seccionador a cada lado y cada circuito su **seccionador de salida** (normalmente motorizado).

**Características**
- **Dos interruptores por circuito**, pero compartidos: N circuitos usan N interruptores (uno por circuito en total).
- Aislar un circuito requiere abrir **dos interruptores**, lo que abre el anillo. Para una desconexión prolongada se abre el seccionador del circuito y se vuelven a cerrar los interruptores, **cerrando el anillo**.
- Económica, segura y confiable, pero **sin flexibilidad**: desde el punto de vista de la flexibilidad es similar a una barra sencilla.
- Permite el mantenimiento de cualquier interruptor sin suspender el servicio.
- Una falla en un tramo del anillo equivale a una falla en el circuito asociado: solo se pierde ese circuito.
- Debe operarse con **todos los interruptores cerrados** para ser segura y confiable.
- Inconveniente principal: si ocurre una falla en un circuito mientras se hace mantenimiento en otro, el anillo puede quedar **dividido** y algunas partes sin servicio.
- Las **fuentes deben alternarse con las cargas** alrededor del anillo.
- Práctico hasta unas **seis salidas**. Si se necesitan más, se prevé desde el diseño la evolución a interruptor y medio.
- Muy usada en EE. UU. y en subestaciones encapsuladas en SF6 (GIS).

**Modelo de la app**
- Nodos `N1` (L1, fuente), `N2` (T1, carga), `N3` (L2, fuente) y `N4` (T2, carga).
- Interruptores `52-1` (N1–N2), `52-2` (N2–N3), `52-3` (N3–N4) y `52-4` (N4–N1), cada uno con `89-ka` y `89-kb`.
- Salidas con `89-X-L`; las líneas con `57-X`.

**Estado normal:** todos los interruptores y seccionadores cerrados (anillo cerrado).

#### Escenario B — Mantenimiento del interruptor 52-1 (sin interrupción)

| # | Acción | Elemento | Qué pasa y por qué | Riesgo |
|---|---|---|---|---|
| 1 | Coordinar | Centro de Control | Se verifica el anillo cerrado. | Bajo |
| 2 | Abrir | `52-1` | **El anillo se abre**: queda una cadena N2–N3–N4–N1. Todos los circuitos siguen en servicio. | Medio |
| 3 | Abrir | `89-1a` | — | Medio |
| 4 | Abrir | `89-1b` | El 52-1 queda aislado. | Medio |
| 5 | Bloquear | `89-1a`, `89-1b` | — | Bajo |
| 6 | Verificar ausencia | `52-1` | — | Medio |
| 7 | Poner a tierra | `PAT-52-1` | — | Medio |
| 8 | Entregar | — | Continuidad total, **con el anillo abierto**. | Medio |

**Riesgo (anillo abierto):** si ahora fallara la línea L2 (N3), se abrirían `52-2` y `52-3`, y **T1 (N2) quedaría aislado sin fuente**. Es la debilidad del anillo durante un mantenimiento.

#### Escenario A — Salida prolongada de la línea L2 (reemplaza al mantenimiento de barra)

| # | Acción | Elemento | Qué pasa y por qué | Riesgo |
|---|---|---|---|---|
| 1 | Coordinar | Centro de Control | Se coordina con la subestación remota de L2 y se deshabilita el recierre. | Bajo |
| 2 | Abrir | `52-2` | — | Medio |
| 3 | Abrir | `52-3` | **L2 fuera de servicio** y anillo abierto en N3. | Medio |
| 4 | Abrir | `89-L2-L` | Corte visible de la salida. | Medio |
| 5 | Cerrar | `52-2` | N3 vuelve a ser un nodo de paso del anillo. | Medio |
| 6 | Cerrar | `52-3` | **Anillo cerrado otra vez** (cierre con verificación de sincronismo): se recupera la seguridad. | Bajo |
| 7 | Bloquear | `89-L2-L` | — | Bajo |
| 8 | Verificar ausencia | Línea `L2` | Con el extremo remoto abierto. | Medio |
| 9 | Poner a tierra | `57-L2` | — | Bajo |
| 10 | Entregar | — | — | Bajo |

#### Escenario C — Falla en la línea L2

| # | Evento / acción | Elemento | Qué pasa | Riesgo |
|---|---|---|---|---|
| 1 | Operación normal | — | — | Bajo |
| 2 | **Falla** | Línea `L2` | Arco en la línea. | Alto |
| 3 | Disparo 21 | `52-2`, `52-3` | Abren los **dos** interruptores del circuito. | Alto |
| 4 | Resultado | — | Solo **L2** fuera de servicio; L1, T1 y T2 siguen. Anillo abierto. | Medio |
| 5 | Abrir | `89-L2-L` | Se aísla la línea fallada. | Medio |
| 6 | Cerrar | `52-2`, `52-3` | Se cierra de nuevo el anillo. | Bajo |

---

### 7.8 Interruptor y medio

**Descripción.** **Tres interruptores por cada dos salidas.** Cada grupo de tres interruptores en serie, el **diámetro**, se conecta entre las dos barras principales, y los dos circuitos se derivan entre ellos. Se opera con **ambas barras energizadas y todos los interruptores cerrados**.

**Características**
- Permite el mantenimiento de **cualquier interruptor o barra** sin suspender el servicio y sin alterar la protección.
- Una falla en barra **no interrumpe** ningún circuito: alta confiabilidad y seguridad, tanto por falla en interruptores como en circuitos y barras.
- La desconexión de un circuito implica abrir **dos interruptores**.
- El interruptor **central** trabaja con uno u otro circuito, lo que dificulta la protección y el recierre.
- La falla de un interruptor saca, **en el peor caso, un circuito adicional**.
- No es flexible: tener dos barras no significa poder conectar los circuitos a una u otra, como en la doble barra.
- La capacidad de los equipos es difícil de definir: hay que prever la distribución de corrientes en contingencias.
- Con un número impar de circuitos, uno necesita dos interruptores (sobrecosto).
- Conviene enfrentar en cada diámetro un circuito de carga con uno de fuente.
- Admite conectar transformadores directamente a las barras, con un interruptor por campo y un seccionador de transferencia.
- Combina gran parte de las ventajas del anillo y de la doble barra.

**Modelo de la app**
- Barras `B1` y `B2` (con `57-B1` y `57-B2`).
- Diámetro 1: B1 – `52-1A` – nodo **L1** – `52-1B` – nodo **T1** – `52-1C` – B2.
- Diámetro 2: B1 – `52-2A` – nodo **T2** – `52-2B` – nodo **L2** – `52-2C` – B2.
- Cada interruptor tiene `89-kX-1` (lado B1 o superior) y `89-kX-2` (lado B2 o inferior). Las salidas tienen `89-X-L`.

**Estado normal:** todo cerrado.

#### Escenario A — Mantenimiento de la barra B1 (sin interrupción)

| # | Acción | Elemento | Qué pasa y por qué | Riesgo |
|---|---|---|---|---|
| 1 | Coordinar | Centro de Control | — | Bajo |
| 2 | Abrir | `52-1A` | L1 sigue alimentado por `52-1B` → `52-1C` → B2. | Medio |
| 3 | Abrir | `52-2A` | **B1 desenergizada**; ningún circuito se interrumpe. | Medio |
| 4 | Abrir | `89-1A-1` | Corte visible lado B1. | Bajo |
| 5 | Abrir | `89-2A-1` | — | Bajo |
| 6 | Bloquear | `89-1A-1`, `89-2A-1` | — | Bajo |
| 7 | Verificar ausencia | `B1` | — | Medio |
| 8 | Poner a tierra | `57-B1` | — | Bajo |
| 9 | Entregar | — | **Continuidad total.** | Bajo |

#### Escenario B — Mantenimiento del interruptor central 52-1B (sin interrupción)

| # | Acción | Elemento | Qué pasa y por qué | Riesgo |
|---|---|---|---|---|
| 1 | Coordinar | Centro de Control | Se ajusta el recierre: el interruptor central deja de participar. | Bajo |
| 2 | Abrir | `52-1B` | L1 queda solo por `52-1A` (B1) y T1 solo por `52-1C` (B2). | Medio |
| 3 | Abrir | `89-1B-1` | — | Medio |
| 4 | Abrir | `89-1B-2` | — | Medio |
| 5 | Bloquear | `89-1B-1`, `89-1B-2` | — | Bajo |
| 6 | Verificar ausencia | `52-1B` | — | Medio |
| 7 | Poner a tierra | `PAT-52-1B` | — | Bajo |
| 8 | Entregar | — | Continuidad total. Mientras dure, L1 y T1 dependen cada uno de **un solo** interruptor y de **una sola** barra. | Medio |

#### Escenario C — Falla en la línea L1 con falla del interruptor central 52-1B

Responde a la pregunta del curso: *"Por falla en un interruptor, ¿cuántos circuitos quedan sin servicio?"*

| # | Evento / acción | Elemento | Qué pasa | Riesgo |
|---|---|---|---|---|
| 1 | Operación normal | — | — | Bajo |
| 2 | **Falla** | Línea `L1` | Arco en la línea. | Alto |
| 3 | Orden de disparo 21 | `52-1A`, `52-1B` | `52-1A` abre... | Alto |
| 4 | **Falla de interruptor** | `52-1B` | ...pero el `52-1B` **no abre**. | Alto |
| 5 | Disparo 50BF | `52-1C` | La protección de falla de interruptor abre el siguiente interruptor del diámetro y envía disparo transferido al extremo remoto de L1. | Alto |
| 6 | Resultado | — | **L1 y T1 fuera**: en el peor caso, la falla de un interruptor saca **un circuito adicional**. Las barras y el diámetro 2 siguen intactos. | Alto |
| 7 | Abrir | `89-1B-1`, `89-1B-2` | Se aísla el interruptor dañado. | Medio |
| 8 | Cerrar | `52-1C` | **T1 restablecido** desde B2. | Bajo |

---

### 7.9 Doble interruptor (doble barra con doble interruptor)

**Descripción.** Se duplican tanto las barras como los interruptores de **cada** circuito: cada circuito tiene un interruptor hacia B1 y otro hacia B2. Se opera con las dos barras energizadas y todos los interruptores cerrados.

**Características**
- La **mayor seguridad** ante fallas en barras e interruptores de todas las configuraciones, y gran libertad para la operación, la revisión y el mantenimiento.
- Es la **más costosa** de todas; su adopción requiere una justificación cuidadosa. *(Pregunta del curso: ¿es más costosa que el interruptor y medio? Sí: 2 interruptores por circuito frente a 1,5.)*
- Si los circuitos se separan en dos grupos, uno por barra, la falla de una barra saca todo lo conectado a ella: se pierde la seguridad y no se justifica el sobrecosto frente a una doble barra.
- Admite la conexión directa de transformadores a las barras (un solo interruptor y un seccionador a modo de transferencia).

**Modelo de la app**
- Barras `B1` y `B2` (con `57-B1` y `57-B2`).
- Bahías `L1`, `L2`, `T1`: B1 – `89-X-1-B` – `52-X-1` – `89-X-1-L` – **nodo X** – `89-X-2-L` – `52-X-2` – `89-X-2-B` – B2. La salida se conecta al nodo con `89-X-L`.

**Estado normal:** todo cerrado.

#### Escenario A — Mantenimiento de la barra B1 (sin interrupción)

| # | Acción | Elemento | Riesgo |
|---|---|---|---|
| 1 | Coordinar | Centro de Control | Bajo |
| 2 | Abrir | `52-L1-1` | Medio |
| 3 | Abrir | `52-L2-1` | Medio |
| 4 | Abrir | `52-T1-1` → **B1 desenergizada**; todos los circuitos siguen por B2 | Medio |
| 5 | Abrir | `89-L1-1-B` | Bajo |
| 6 | Abrir | `89-L2-1-B` | Bajo |
| 7 | Abrir | `89-T1-1-B` | Bajo |
| 8 | Bloquear | seccionadores lado B1 | Bajo |
| 9 | Verificar ausencia | `B1` | Medio |
| 10 | Poner a tierra | `57-B1` | Bajo |
| 11 | Entregar | **Continuidad total** | Bajo |

#### Escenario B — Mantenimiento del interruptor 52-L1-1 (sin interrupción)

| # | Acción | Elemento | Qué pasa | Riesgo |
|---|---|---|---|---|
| 1 | Coordinar | Centro de Control | — | Bajo |
| 2 | Abrir | `52-L1-1` | L1 sigue por `52-L1-2` y B2. | Medio |
| 3 | Abrir | `89-L1-1-L` | — | Medio |
| 4 | Abrir | `89-L1-1-B` | — | Medio |
| 5 | Bloquear | ambos | — | Bajo |
| 6 | Verificar ausencia | `52-L1-1` | — | Medio |
| 7 | Poner a tierra | `PAT-52-L1-1` | — | Bajo |
| 8 | Entregar | — | Continuidad total. | Bajo |

#### Escenario C — Falla en la barra B1

| # | Evento | Elemento | Qué pasa | Riesgo |
|---|---|---|---|---|
| 1 | Operación normal | — | — | Bajo |
| 2 | **Falla** | `B1` | Arco en B1. | Alto |
| 3 | Disparo 87B | `52-L1-1`, `52-L2-1`, `52-T1-1` | Abren todos los interruptores del lado de B1. | Alto |
| 4 | Resultado | — | **Ningún circuito pierde el servicio**: todos siguen por B2. Máxima seguridad. | Medio |
| 5 | Abrir | `89-X-1-B` de cada bahía | B1 aislada para reparación. | Bajo |

---

### 7.10 Anillo cruzado

> ✓ **Topología validada por el docente (2026-10-15).** El PDF del curso solo nombra esta configuración (diap. 44). La descripción y la figura provienen del *Manual para la operación de subestaciones eléctricas* (UTP, §2.2.4, Figura 9), que cita la bibliografía de Mejía Villegas.

**Descripción.** Las configuraciones de conexión de interruptores conectan cada circuito al resto por **dos** interruptores en "paralelo". La disponibilidad de cada circuito aumenta si se usan **tres** interruptores en "paralelo". La forma más práctica de lograrlo es el **anillo cruzado**: **dos anillos** de interruptores, uno superior y otro inferior, con sus nodos enfrentados unidos por un **interruptor vertical** (el "cruce"). Así cada nodo queda conectado por tres interruptores: dos de su anillo y uno vertical.

**Características**
- Cantidad de interruptores: **n + n/2**, con n el número de nodos (par). Es la **misma cantidad que en interruptor y medio**. Con n impar se agrega un nodo "ficticio", como en el interruptor y medio.
- Operación normal: **todos los interruptores cerrados**.
- Ideada por ingenieros de **BBC (Brown Boveri & Cie., Suiza)** a principios de los años ochenta.
- Algo más segura y confiable que el interruptor y medio, pero de control y operación más complicados.
- Aislar un circuito requiere abrir **tres** interruptores.

**Modelo de la app (n = 6, 9 interruptores)**
- Anillo superior: `N1` (L1) – `52-S1` – `N2` (T1) – `52-S2` – `N3` (L2) – `52-S3` (retorno) – `N1`.
- Anillo inferior: `N4` (T2) – `52-I1` – `N5` (L3) – `52-I2` – `N6` (T3) – `52-I3` (retorno) – `N4`.
- Cruces: `52-V1` (N1–N4), `52-V2` (N2–N5), `52-V3` (N3–N6).
- Cada interruptor tiene dos seccionadores (`89-k-a`, `89-k-b`). Las salidas tienen `89-X-L` y las líneas `57-X`.
- Las fuentes y cargas se alternan, tanto a lo largo de cada anillo como en cada vertical.
- *La figura de la UTP usa 4 nodos por anillo (8 circuitos, 12 interruptores). La app usa 3 por anillo para que el diagrama sea legible; la regla n + n/2 se mantiene.*

#### Escenario B — Mantenimiento del interruptor vertical 52-V2 (sin interrupción)

| # | Acción | Elemento | Qué pasa | Riesgo |
|---|---|---|---|---|
| 1 | Coordinar | Centro de Control | — | Bajo |
| 2 | Abrir | `52-V2` | N2 y N5 quedan con **dos** interruptores cada uno, como en un anillo simple. Todos los circuitos siguen en servicio. | Bajo |
| 3 | Abrir | `89-V2-a` | — | Bajo |
| 4 | Abrir | `89-V2-b` | — | Bajo |
| 5 | Bloquear | ambos | — | Bajo |
| 6 | Verificar ausencia | `52-V2` | — | Bajo |
| 7 | Poner a tierra | `PAT-52-V2` | — | Bajo |
| 8 | Entregar | — | Continuidad total, y los anillos siguen cerrados. | Bajo |

#### Escenario A — Salida prolongada de la línea L2 (nodo N3)

| # | Acción | Elemento | Qué pasa | Riesgo |
|---|---|---|---|---|
| 1 | Coordinar | Centro de Control | Coordinación con el extremo remoto; recierre deshabilitado. | Bajo |
| 2 | Abrir | `52-S2` | — | Medio |
| 3 | Abrir | `52-S3` | — | Medio |
| 4 | Abrir | `52-V3` | **L2 fuera de servicio** (tres interruptores abiertos). | Medio |
| 5 | Abrir | `89-L2-L` | Corte visible de la salida. | Medio |
| 6 | Cerrar | `52-S2` | — | Medio |
| 7 | Cerrar | `52-S3` | — | Bajo |
| 8 | Cerrar | `52-V3` | N3 vuelve a ser nodo de paso: se recupera toda la malla. | Bajo |
| 9 | Bloquear | `89-L2-L` | — | Bajo |
| 10 | Verificar ausencia | Línea `L2` | — | Medio |
| 11 | Poner a tierra | `57-L2` | — | Bajo |
| 12 | Entregar | — | — | Bajo |

#### Escenario C — Falla en la línea L2

| # | Evento | Elemento | Qué pasa | Riesgo |
|---|---|---|---|---|
| 1 | Operación normal | — | — | Bajo |
| 2 | **Falla** | Línea `L2` | Arco. | Alto |
| 3 | Disparo 21 | `52-S2`, `52-S3`, `52-V3` | Abren los tres interruptores de N3. | Alto |
| 4 | Resultado | — | Solo L2 fuera. Los demás nodos conservan al menos dos caminos. | Medio |
| 5 | Abrir | `89-L2-L` | Se aísla la línea. | Medio |
| 6 | Cerrar | `52-S2`, `52-S3`, `52-V3` | Se cierra la malla. | Bajo |

---

## 8. Tabla comparativa

| # | Configuración | Interruptores por circuito | Mant. de barra sin corte | Mant. de interruptor sin corte | Falla en barra | Costo relativo* |
|---|---|---|---|---|---|---|
| 1 | Barra sencilla | 1 | ❌ (salida total) | ❌ | Sale toda la S/E | 100 % |
| 2 | Barra principal + transferencia | 1 (+1 de transferencia) | ❌ | ✅ (uno a la vez) | Sale toda la S/E | 148 % |
| 3 | Doble barra | 1 (+ acople) | ✅ | ❌ | Salen los circuitos de esa barra; se recuperan | 171 % |
| 4 | Doble barra + by-pass | 1 (+ acople) | ✅ | ✅ (con una barra libre) | Ídem 3 | 210 % |
| 5 | Doble barra + secc. de transferencia | 1 (+ acople) | ✅ | ✅ (con B2 libre) | Ídem 3 | 190 % |
| 6 | Doble barra + barra de transferencia | 1 (+ acople + transferencia) | ✅ | ✅ (simultáneo con el acople) | Ídem 3 | 214 % |
| 7 | Anillo | 2 compartidos (N interruptores para N circuitos) | — (no hay barra) | ✅ (anillo abierto) | — (una falla en un tramo equivale a una falla del circuito) | 187 % |
| 8 | Interruptor y medio | 1,5 | ✅ | ✅ | Ningún circuito se pierde | 247 % |
| 9 | Doble interruptor | 2 | ✅ | ✅ | Ningún circuito se pierde | 331 % |
| 10 | Anillo cruzado | 3 compartidos (n + n/2) | — | ✅ | — | ≈ interruptor y medio (no reportado) |

\* Costo relativo de equipos respecto a la barra simple, según el Coordinador Eléctrico Nacional de Chile (2021), para una subestación modelo con 2 líneas y 2 transformadores. Es orientativo.

**Tabla del curso (diapositivas 18 y 34):**

| | Simple barra | SB c/ interruptor de transferencia | Doble barra | DB c/ secc. de transferencia |
|---|---|---|---|---|
| Flexibilidad | No tiene | No tiene | Alta | Alta |
| Confiabilidad | No tiene | Baja | Media (solo en barras) | Alta |
| Seguridad | No tiene | No tiene | No tiene | Baja |

---

## 9. Errores de maniobra y sus consecuencias (modo práctica)

| Error | Consecuencia física | Simulación en la app | Severidad |
|---|---|---|---|
| Abrir un **seccionador con el interruptor cerrado** y sin camino paralelo | Se abre carga con un equipo sin capacidad de extinción: **arco** que destruye el seccionador, puede propagarse entre fases y dañar al operador. | Arco animado en la cuchilla, disparo de la protección (87B si es de barra) y tarjeta de error. | **Crítico** |
| Cerrar un **seccionador sobre una falla o con diferencia de potencial** | Arco de cierre y cortocircuito. | Arco y disparo. | Crítico |
| Cerrar la **puesta a tierra (57)** sin verificar ausencia de tensión, o con la línea energizada desde el extremo remoto | **Cortocircuito franco a tierra**: arco intenso y disparo en ambos extremos. Riesgo mortal. | Arco fuerte y destello. | Crítico |
| Abrir el **acople** durante un cambio de barra en caliente | Las barras dejan de ser equipotenciales: el siguiente selector abre o cierra con diferencia de potencial y se forma un arco. | Advertencia y, si el estudiante continúa, arco en el selector. | Alto |
| Cerrar el **seccionador de transferencia o de by-pass** sin la barra de transferencia energizada y probada, o sin las protecciones transferidas | El circuito puede quedar sin protección; un error de transferencia provoca disparos indeseados. | Advertencia. | Alto |
| Cerrar **dos seccionadores de transferencia** a la vez | Dos circuitos unidos sin interruptor entre ellos. | Error. | Alto |
| Abrir el **interruptor del circuito antes** de cerrar el camino de transferencia | Se interrumpe el servicio que se pretendía mantener. | La carga se apaga y aparece el aviso "continuidad perdida". | Medio |
| Abrir el seccionador de **barra antes** que el de **línea** | No hay arco si el interruptor está abierto, pero viola el orden normalizado. | Aviso pedagógico (no bloquea). | Bajo |
| Omitir la **verificación de ausencia de tensión** | Viola las reglas de oro. | El paso siguiente no se habilita hasta verificar. | Alto |
| Olvidar el **bloqueo (LOTO)** | Riesgo de reenergización por terceros. | Aviso. | Medio |

**Regla del modo práctica:** se acepta cualquier orden **equivalente y seguro** (por ejemplo, abrir `89-L1-B` antes que `89-L2-B` en un mantenimiento de barra), pero no órdenes inseguros. Cada escenario define pasos obligatorios en orden estricto y grupos de pasos intercambiables.

---

## 10. Modo interactivo: reglas de validación

En el modo libre el estudiante arma su propia configuración. Reglas que la app verifica en vivo:

1. **Cada interruptor** debe tener un seccionador a cada lado para poder aislarlo (advertencia si falta).
2. **Cada circuito** (línea o transformador) debe conectarse a una barra o nodo a través de al menos un interruptor.
3. Las **líneas** deberían tener puesta a tierra (57), DPS y, si hay onda portadora, trampa de onda y TP capacitivo (sugerencia).
4. Los **transformadores** deberían tener un DPS cercano (sugerencia).
5. Un **seccionador de transferencia o de by-pass** requiere una barra de transferencia o un interruptor de acople que pueda proteger el circuito (advertencia).
6. Debe existir al menos **una fuente**.
7. **Detección de configuración:** si la topología coincide con una de las 10 conocidas, la app la nombra ("¡Armaste una doble barra!").
8. **Simulación:** el estudiante puede abrir y cerrar equipos y ver la energización en vivo, con las mismas reglas de arco y cortocircuito de §6.4 y §9.

---

## 11. Glosario

- **Acople (interruptor de acople):** interruptor que une dos barras principales.
- **Arco eléctrico:** descarga a través del aire ionizado al separar contactos con corriente; libera energía térmica y luminosa intensa.
- **Bahía / campo / paño / posición:** conjunto de equipos que conecta un circuito a las barras.
- **Barra de transferencia:** barra auxiliar, normalmente desenergizada, para reemplazar el interruptor de un circuito.
- **Bitácora:** registro cronológico de las maniobras de la subestación.
- **By-pass (paso directo):** seccionador que puentea un interruptor.
- **Centro de Control (CC):** autoriza y coordina las maniobras.
- **Consignación:** entrega formal de un equipo desenergizado y seguro para trabajar en él.
- **Corte visible:** separación física observable entre contactos (seccionador abierto).
- **Diámetro:** grupo de interruptores entre las dos barras en interruptor y medio.
- **Disparo (*trip*):** apertura de un interruptor por orden de una protección.
- **Enclavamiento:** dispositivo eléctrico, mecánico o neumático que impide maniobras en un orden incorrecto.
- **Equipotencial:** dos puntos al mismo potencial; entre ellos un seccionador puede operarse sin arco.
- **GIS / AIS:** subestación aislada en gas SF6 / en aire.
- **LOTO (*lockout/tagout*):** bloqueo con candado y tarjeta de señalización.
- **Normalización:** devolver la instalación a su estado normal tras el trabajo.
- **Recierre (79):** cierre automático tras un disparo, para fallas transitorias en líneas.
- **Selector de barra:** seccionador que conecta una bahía a una de las barras en doble barra.
- **Sincronismo (25):** verificación de tensión, frecuencia y ángulo antes de unir dos sistemas energizados.
- **STN / STR / SDL (Colombia):** Sistema de Transmisión Nacional (≥ 220 kV), Sistema de Transmisión Regional (57,5 a 220 kV) y Sistema de Distribución Local.
- **Transferencia en caliente / en frío:** cambio de barra sin interrupción / con interrupción.
- **Unifilar:** diagrama que representa las tres fases con una sola línea y símbolos normalizados.

---

## 12. Preguntas frecuentes

**¿Por qué no se puede abrir un seccionador con carga?**
Porque no tiene cámara de extinción: al separar los contactos con corriente se forma un arco que no puede apagar. El arco quema los contactos, puede saltar entre fases y causar una falla en la barra, y es muy peligroso para el operador. Solo el interruptor está diseñado para cortar carga y cortocircuito.

**Entonces, ¿cómo se cambia un circuito de barra sin cortar el servicio?**
Con el acople cerrado (y bloqueado), las dos barras están al mismo potencial. Se cierra el selector de la barra de destino (no hay diferencia de tensión, no hay arco) y luego se abre el de origen (la corriente simplemente se va por el otro camino). Es una maniobra equipotencial.

**¿Cuántos interruptores hay por circuito en un anillo?**
Cada circuito está entre dos interruptores, pero cada interruptor es compartido por dos circuitos, así que en total hay un interruptor por circuito (N para N circuitos). Aislar un circuito obliga a abrir dos.

**¿En qué se diferencia el anillo de la barra sencilla en confiabilidad y flexibilidad?**
En flexibilidad son similares (no se pueden agrupar circuitos). En confiabilidad y seguridad el anillo es muy superior: permite el mantenimiento de cualquier interruptor sin cortar servicio, y una falla en un tramo solo afecta al circuito asociado.

**Por falla en un interruptor en interruptor y medio, ¿cuántos circuitos quedan sin servicio?**
En el peor caso, el circuito en falla más **uno adicional**: el que comparte el interruptor central dañado.

**¿Qué es más costoso: doble interruptor o interruptor y medio?**
Doble interruptor: 2 interruptores por circuito frente a 1,5 (≈ 331 % frente a 247 % del costo de una barra simple, según el estudio chileno).

**¿Por qué la barra de transferencia se energiza antes de cerrar el seccionador de transferencia del circuito?**
Para comprobar que está sana. Si tuviera una falla, la despejaría el interruptor de transferencia sin afectar al circuito en servicio. Además, el seccionador de transferencia se cierra en condición equipotencial.

**¿Por qué hay que transferir las protecciones?**
Porque al sacar el interruptor del circuito, el que lo protege es el de transferencia (o el acople). Si este no tiene los ajustes del circuito, una falla en la línea no se despejaría correctamente.

**¿Por qué abrir el interruptor no basta para trabajar en una línea?**
Porque la línea puede estar energizada desde la otra subestación y tener tensión inducida por líneas paralelas. Hay que abrir ambos extremos, verificar ausencia de tensión y poner a tierra.

**¿Qué son las cinco reglas de oro?**
1. Corte visible de todas las fuentes. 2. Bloqueo y señalización de los aparatos de corte. 3. Verificación de ausencia de tensión. 4. Puesta a tierra y en cortocircuito. 5. Señalización y delimitación de la zona de trabajo.

**¿Qué es la protección 87B?**
La diferencial de barras: compara la suma de las corrientes que entran y salen de la barra. Si no suman cero, hay una falla dentro de la barra y dispara todos sus interruptores.

**¿Qué es el anillo cruzado?**
Una configuración de conexión de interruptores, ideada por BBC en los años ochenta, que une cada circuito al resto por tres interruptores en "paralelo": dos anillos de interruptores cuyos nodos enfrentados se unen con un interruptor vertical. Usa n + n/2 interruptores, igual que el interruptor y medio.

---

## 13. Fuentes

1. Doria García, J. D. (2026). *Subestaciones Eléctricas — Tema 2: Configuración de Subestaciones* (diapositivas del curso). Universidad del Norte. Archivo: `Tema_2_Configuraciones.pdf`.
2. Universidad Tecnológica de Pereira. *Manual para la operación de subestaciones eléctricas* (cap. 2 *Configuraciones de subestaciones eléctricas*; cap. 3 *Principios de operación*; cap. 6 *Ejecución de maniobras*; cap. 9 *Ejecución de consignas operativas*). https://repositorio.utp.edu.co/server/api/core/bitstreams/45d3d748-ba03-4ca9-8c45-a405093484f7/content
3. Coordinador Eléctrico Nacional (Chile) (2021). *Apéndice V — Análisis de configuraciones de barra de SS/EE de transmisión zonal* (figuras 3.1–3.11; tablas 3.2, 3.3 y 3.6). https://www.coordinador.cl/wp-content/uploads/2021/01/05-Ap%C3%A9ndice-V-An%C3%A1lisis-de-configuraciones-de-barra-de-SSEE-de-transmisi%C3%B3n-zonal.pdf
4. Ministerio de Minas y Energía de Colombia. *Reglamento Técnico de Instalaciones Eléctricas — RETIE* (Res. 181294 de 2008, Art. 19.1 *Maniobras* y 19.5 *Reglas de oro de la seguridad*). https://normas.cra.gov.co/gestor/docs/resolucion_minminas_181294_2008.htm
5. Mejía Villegas S.A. / Ramírez, C. F. (2003). *Subestaciones de alta y extra alta tensión*, 2.ª ed. (referencia base citada por las fuentes 2 y 3).
6. Universidad Tecnológica de Bolívar. *Elementos de diseño de subestaciones de alta y extra alta tensión* (tesis). https://biblioteca.utb.edu.co/notas/tesis/0044435.pdf
7. EEPower. *Substation Components — Part 5: Busbar Configurations*. https://eepower.com/technical-articles/substation-componentspart-5-busbar-configurations/
8. IDC Technologies. *Bus Switching Configurations in Air Insulated Substations (AIS)*. https://www.idc-online.com/technical_references/pdfs/electrical_engineering/Bus_Switching_Configurations_In_Air_Insulated_Substations_AIS.pdf
