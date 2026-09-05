# Propuesta: valorar y clasificar unidades de Age of the Ring

Fecha: 2026-09-05. Estado: **propuesta aprobada en su enfoque, sin implementar;
aparcada hasta después del módulo en vivo**. Complementa el §14 del plan
(`live-tournament-plan.md`). El §5 dice exactamente dónde se retoma.

## 1. Qué existe fuera

- **La única tier list de unidades** de AotR es la del canal de YouTube
  **Konkwistador31** (konkwi31 en Twitch), para la **8.3.1**, hecha en directo
  con TierMaker junto a otros dos jugadores de PvP (Dranzer, MattysMirks) entre
  febrero y abril de 2025. Es la que vimos para la edición 2025. Lista de
  reproducción "Age of the Ring 8.3.1 Tier Lists"
  (`youtube.com/playlist?list=PLmwZaFgqLxgkEa2VmkxXCU1zbmBnVxJ5Q`):
  - Units Tier List, 3 h 13 min, `AdjBo0WHy7I`. Criterio declarado: precio,
    estadísticas y eficiencia de coste, y además el rendimiento de la unidad
    dentro de su facción; vale para 1v1 y equipos. Niveles S/A/B/C/D/F.
  - Heroes Tier List, 3 h 35 min, `vOYc_kkwHWg`.
  - Spellbook Spells Tier List, 3 h 17 min, `s0QSlC3BGNM`.
  - Siege Units Tier List, 34 min, `owy-6ackb0I`.
  - Factions Tier List, 1 h 35 min, `7gMvybpCfYI`.
  Del mismo canal, solo de facciones: 9.1.5 con Poero (`VFcsu_5ROwk`, octubre
  de 2025, 4 h) y 9.2.2 (`RswYMRoUqE8`, abril de 2026, 12 min). No existe tier
  list de unidades para ninguna 9.x. En el vídeo citan una lista anterior suya
  de mediados de 2024 que solo está en Twitch.
  Las transcripciones automáticas de los siete vídeos están en
  `.claude/research/transcript-*.txt` (con marcas de tiempo). Sirven para leer
  el razonamiento; los nombres salen mal transcritos y el tablero final no se
  reconstruye con fiabilidad desde el texto: lo fiable es el tablero que sale
  en pantalla al final de cada vídeo (pendiente de capturar, Miguel prefirió
  no descargar los vídeos por ahora).
- Aparte: plantillas de TierMaker de facciones y de unidades heroicas sin
  votos, y un hilo de Revora de opinión sobre facciones fuertes y débiles
  (Gondor, Rivendel e Isengard arriba; Rohan abajo). Nada más con números.
- **No hay hoja de datos** pública con daño, armadura y coste por unidad. Los
  datos viven en dos sitios:
  1. La wiki de la comunidad (aotr.fandom.com): por unidad da coste, puntos de
     mando, vida por modelo, nombre del conjunto de armadura, mejoras y
     habilidades. **No da daño, ni tamaño del batallón, ni cadencia, ni alcance,
     ni velocidad.** Sí tiene una página `Armour Sets` con los porcentajes de
     daño recibido por tipo para **390 conjuntos de armadura**: ya la hemos
     parseado (`scripts/wiki-data/armour-sets.json`).
  2. Los ficheros INI del propio mod, dentro de sus archivos `.big`. Ahí está
     todo: daño por golpe y tipo, retardos de ataque, alcance, vida, armadura,
     velocidad, tamaño de horda, coste, tiempo, puntos de mando, bonus por
     nivel. Se extraen con FinalBIG (o `finalBIGv2`, `libbig`, `big4f`) y hay un
     parser de INI de BFME en Python (`ClementJ18/ini_parser`). Requiere la
     instalación de Miguel; una hora de trabajo para sacar la primera tabla.
- **Teoría aplicable** (no específica de AotR):
  - Motor BFME: `daño recibido = daño del arma × % del conjunto de armadura
    para ese tipo`. Tipos: SLASH (espadas), PIERCE (arcos), SPECIALIST (picas),
    CAVALRY (caballería cuerpo a cuerpo), CRUSH (pisotón), SIEGE, FLAME, FROST,
    MAGIC, HERO, HERO_RANGED, STRUCTURAL, POISON. Un swordsman normal
    (`SoldierArmor`) recibe 75 % de SLASH, 25 % de SPECIALIST y 175 % de
    CAVALRY: el piedra-papel-tijera está en las tablas, no en el texto.
  - Cadencia (Edain, mismo motor): muy rápida 1000 ms, media 2000, lenta 3000,
    muy lenta 6000. Subida de nivel: +15 % de daño y vida por nivel en tropa
    normal y de élite; menos en heroicas y monstruos.
  - Valor de combate (leyes de Lanchester, modelos de combate para RTS de
    Stanescu et al. 2016): la fuerza de una unidad es `DPS × vida efectiva`; la
    de un ejército de N unidades iguales crece con `N²` cuando todos disparan a
    todos. De ahí que la métrica útil por unidad sea
    `(DPS contra X × vida efectiva contra X) / coste`, y que la fuerza de un
    batallón no sea la de un modelo por el tamaño de la horda, sino algo
    superlineal.
  - Clasificación en "tiers" del propio motor (Edain la explicita y AotR la
    sigue): **Normal** (batallón < 500), **Élite** (500–1000), **Heroica**
    (> 1000); monstruos: < 1000, 1000–2000, > 2000. Es la única definición
    "oficial" de tier que existe, y es por precio.

## 2. Qué tenemos ya

Con la wiki y lo sembrado hoy podemos calcular, por unidad y por tipo de daño,
la **vida efectiva por modelo** (`vida / %armadura`). Ejemplo (Gondor y
Montañas Nubladas, 9.2.0):

| Unidad | Vida | vs SLASH | vs PIERCE | vs SPECIALIST | vs CAVALRY |
|---|---:|---:|---:|---:|---:|
| Clanes de Lamedon | 190 | 253 | 271 | 760 | 109 |
| Soldados de Minas Tirith | 350 | 438 | 583 | 1167 | 389 |
| Lanceros de Linhir | 215 | 143 | 195 | 215 | 614 |
| Lanceros de Minas Tirith | 315 | 315 | 450 | 450 | 1260 |
| Caballeros del Cisne | 700 | 3500 | 3500 | 583 | 1750 |
| Chillones de Moria | 50 | 40 | 56 | 100 | 25 |
| Berserkers de Gundabad | 600 | 1200 | 1091 | 2000 | 1500 |
| Trol de piedra de Gundabad | 3000 | 12000 | 10000 | 3333 | 12000 |

Es la mitad defensiva del modelo y ya cuenta cosas (un Cisne aguanta 3500 de
espada por jinete; un Berserker no tiene punto débil claro). Falta la mitad
ofensiva (daño, cadencia) y el tamaño del batallón para pasar de "por modelo" a
"por coste".

## 3. Propuesta

### 3.1 Modelo acordado: tiers por eje y un global multiplicativo

Decidido con Miguel el 2026-09-05: **tiers calculados por eje, consultables
por separado, más un global**. Nada se opina a mano; las etiquetas
"fuerte/débil" escritas se conservan solo como contraste.

Ejes por unidad (todo por coste, para poder cruzar facciones):

- **Aguante**: `vida × horda / armadura[tipo]` contra cada tipo de daño
  (SLASH, PIERCE, SPECIALIST, CAVALRY, CRUSH, FLAME, HERO…), resumido con
  pesos. Con la wiki ya tenemos vida por modelo y armaduras; falta la horda.
- **Ataque**: `daño × armadura_rival[tipo de daño propio] / cadencia × horda`
  contra cada categoría rival. Requiere los INI del mod (no está en la wiki).
- **Alcance y velocidad** (INI).
- **Utilidad**: recuento ponderado de habilidades activas, liderazgos,
  formaciones, sigilo y empuje. Es el único eje con criterio, y se documenta.

Global:

- **Valor de combate** `= aguante × ataque / coste²` (Lanchester: un batallón
  el doble de caro debe valer ×4). Es el orden de referencia. La media
  aritmética de las letras se puede enseñar etiquetada como "media de ejes",
  pero engaña: un trol con aguante S y ataque D no es B, es una pared que no
  mata.
- Los pesos de la partida típica (qué proporción de espadas, picas, arcos,
  caballería, monstruos hay enfrente) son configurables y se guardan como
  escenarios.

Letras: por cuartiles (A–D) **dentro de un grupo comparable y de una misma
versión**: batallones de infantería y caballería; monstruos; asedio; héroes.
Se muestra además el tier del motor por precio (Normal < 500, Élite
500–1000, Heroica > 1000; monstruos < 1000, 1000–2000, > 2000). "Élite A"
dice más que "S".

Calibración: comparar el global de 9.2.0 con la tier list de Konkwistador de
la 8.3.1 para Gondor y Montañas Nubladas. Donde coincida, el modelo vale;
donde discrepe, apuntar qué pesa que los números no ven. Lo que el modelo no
captura se dice en la página: habilidades activas, liderazgos, micro, y que
las cifras son de nivel 1 sin mejoras (las mejoras se pueden calcular también,
porque cambian el conjunto de armadura y el daño de forma conocida).

### 3.2 Datos: tres pasos, cada uno útil por sí mismo

1. **Armaduras (hecho a medias, una tarde)**: tabla `armour_set` (nombre, jsonb
   de porcentajes, versión) sembrada desde `armour-sets.json`; `faction_unit.
   armourSet` pasa a referenciarla. Con esto la ficha ya muestra la fila
   "daño que recibe" y la vida efectiva por tipo. Faltan `BodyGuardArmor` y
   `MountainGiantArmor` en la wiki: se sacan del paso 2 o se estiman.
2. **INI del mod (una sesión con la instalación de Miguel)**: extraer
   `data/ini/object/*` y `weapon.ini` de los `.big` de AotR 9.2.0 y 9.3.0,
   parsear y volcar por unidad: daño y tipo por arma, `DelayBetweenShots` y
   `PreAttackDelay`, alcance, velocidad, horda, vida, coste, tiempo, PM, y los
   modificadores de mejoras y nivel. Se guarda en `faction_unit.stats` (que ya
   existe para esto) más columnas para lo fijo (`damage`, `damageType`,
   `attackDelayMs`, `range`, `speed`, `battalionSize`). Bonus: **tendremos las
   diferencias 9.2.0/9.3.0 exactas**, que hoy no distinguimos.
3. **Resto de facciones**: el pipeline del paso 2 saca todas las facciones a la
   vez; el texto de las fichas se escribe después, facción a facción.

### 3.3 Pantallas

- En la ficha de cada unidad: fila de daño recibido por tipo, vida efectiva,
  DPS, tier del motor y letra, mejores y peores enfrentamientos.
- Página **Comparar** (`/games/<juego>/<versión>/compare`): elige dos o más
  unidades de cualquier facción y ve las mismas filas lado a lado, con la
  matriz A contra B en ambas direcciones y un "quién gana a igualdad de coste".
- Página **Ranking de unidades** por versión: la tabla completa ordenable por
  índice, por tier, por rol, con los pesos de la partida típica ajustables y
  guardables como "escenarios" (por ejemplo "contra spam de Moria").
- Una sección en la ficha de facción: cómo se reparte su ejército entre Normal,
  Élite y Heroica y dónde flojea (la matriz agregada por facción).

### 3.4 Esfuerzo

- Paso 1 + fila de daño recibido en la ficha: 1 sesión.
- Paso 2 (extracción y volcado de 9.2.0 y 9.3.0 para todas las facciones): 1–2
  sesiones, necesita el juego instalado y FinalBIG.
- Motor de valoración + Comparar + Ranking: 2 sesiones.
- Escritura de las fichas de las otras 9 facciones: 1 sesión por cada 2–3
  facciones.

Sugerencia de orden: después de F5–F8 del módulo en vivo (fecha objetivo 1 de
noviembre), salvo el paso 1, que es barato y ya mejora la wiki.

## 5. Punto de retorno

Estado el 2026-09-05, para retomar sin releer todo:

- Hecho: fichas completas de Gondor y Montañas Nubladas con números tipados y
  `stats`; 390 tablas de armadura parseadas en
  `scripts/wiki-data/armour-sets.json` (no sembradas aún; faltan
  `BodyGuardArmor` y `MountainGiantArmor`); transcripciones de las tier lists
  en `.claude/research/`; modelo acordado (§3.1).
- Bloqueante: **extraer los INI de AotR 9.2.0 y 9.3.0** de la instalación de
  Miguel. Pasos previstos: localizar los `.big` del mod (carpeta del
  Launcher/aotr), abrirlos con FinalBIG o `finalBIGv2`, exportar
  `data/ini/object/**`, `data/ini/weapon.ini`, `data/ini/upgrade.ini`,
  `data/ini/armor.ini` y `_gamedata.inc`, y pasarme la carpeta. Yo hago el
  parser (`ClementJ18/ini_parser` o propio) y el volcado a `faction_unit`.
- Siguiente sesión, en este orden: (1) tabla `armour_set` + fila "daño que
  recibe" en la ficha; (2) parser de INI y volcado; (3) motor de ejes, tiers y
  global; (4) páginas Comparar y Ranking; (5) calibración contra la lista de
  Konkwistador; (6) resto de facciones.
- Fuera del alcance: descargar los vídeos para capturar los tableros finales
  (descartado por ahora; se puede hacer con `yt-dlp --download-sections` y el
  ffmpeg del proyecto si hace falta).

## 6. Fuentes

- Wiki AotR: `Armour Sets` y subpáginas; fichas de unidad.
- Edain Mod Wiki, `Game Mechanics` (mismo motor): cadencias, subida de nivel,
  definición de tiers por precio.
- GameReplays, guías de armadura de BFME2 1.09; Revora, hilos de modding
  (`Damage Types`, `Damage of Weapon`).
- Stanescu, Barriga, Buro, *Combat Models for RTS Games* (arXiv 1605.05305);
  Lanchester, leyes cuadráticas.
- Herramientas: `ClementJ18/finalBIGv2`, `ClementJ18/ini_parser`,
  `feliwir/libbig`, `withmorten/big4f`.
