# Frikiparty — Módulo de torneo en vivo (plan de acción)

> Documento vivo. Se actualiza cada vez que cambiamos una decisión.
> Fuente de verdad del dominio: `core-logic.md`. Modelo base: `data-model.md`.
> El `/simulator` NO se toma como referencia funcional (fue una primera versión);
> sólo se rescata de él la lógica pura que ya está probada (ver §2).
>
> Estado: **v1.1 — todas las decisiones cerradas; listo para arrancar F0.**
> Última actualización: 2026-09-05.

---

## 0. Cómo leer este documento

- §1 Objetivo y alcance. §2 Qué se reutiliza y qué se descarta. §3 Decisiones de
  arquitectura. §4 Máquina de estados. §5 Modelo de datos. §6 Reglas de juego
  decididas (lo que `core-logic.md` no cubría). §7 Plan por fases de trabajo
  (F0…F8). §8 Pantallas. §9 Realtime en detalle. §10 Permisos. §11 Preguntas
  abiertas. §12 Riesgos. §13 Registro de cambios.
- Las marcas **[SUPUESTO]** son valores por defecto que he fijado yo y se pueden
  cambiar sin coste; las **[DECIDIDO]** vienen de respuestas de Miguel (§13).

---

## 1. Objetivo y alcance

Construir el módulo que gestiona y muestra el torneo **en vivo** durante el evento,
extremo a extremo:

1. Crear un torneo asociado a la edición que toque (**2026**, 12–15 nov; ya existe
   en BD con 8 confirmados a 2026-09-04).
2. Ranking del torneo (histórico / votación / combinado) → **bombos** (editables).
   Los del primer bombo son los capitanes, cada uno de un equipo.
3. Formación de equipos: aleatorio total, aleatorio por bombos, **draft** en vivo,
   **subasta** en vivo. Multi-dispositivo: capitanes con acciones desde su cuenta,
   resto en modo espectador "concurso de TV" (animaciones, nombres que aparecen,
   pujas que suben) sin salirse de la temática y el diseño de la web.
4. Configuración de fases (grupos / eliminatoria / suizo) → generación automática de
   los partidos conocidos → calendario (jornada/ronda 1) al instante.
5. Vistas por fase: grupos (clasificación + jornadas + cuadro de cruces), bracket
   (resolviendo el scroll), suizo (formato estándar por marcador).
6. Ficha de partido con sus partidas: alineaciones, sorteo y reparto de facciones
   (catálogo del juego del torneo), ganador, marcador que avanza solo, partida
   guardada, comentarios.
7. Automatismos: ganar partida → marcador → ganar partido → clasificación / bracket /
   siguiente ronda suiza → siguiente fase (con revisión del admin) → campeón.
8. Diseños épicos y profesionales para semifinales y final.
9. `/council` como centro de mando: cambia solo según la etapa y muestra "dónde
   estamos", "qué toca" y "quién ha hecho qué".
10. **Todo queda en BD**, incluido un registro de eventos que permite **revivir** la
    subasta o el draft como si fuera en directo.

**[DECIDIDO]** El módulo es **genérico**: sirve para el torneo por equipos, para el
individual (equipos de uno) y para otros juegos, con o sin facciones. Nada asume
Age of the Ring salvo el catálogo que se siembra para él.

Todo se monta primero en la ruta temporal `/live` para probarlo desde varios
dispositivos; cuando el torneo se dé por comenzado en la web, los mismos
componentes se muestran en `/council`.

Fuera de alcance por ahora: parser de replays, walkover/incomparecencia. El "pool
de facciones que se gasta" sí entra (§6.8).

---

## 2. Inventario: qué se reutiliza y qué se descarta

### 2.1 Se reutiliza (lógica pura, sin BD, ya probada)

`src/lib/tournament/*`:

| Módulo | Qué aporta | Estado |
|---|---|---|
| `pots.ts` | `generatePots(ranking, potCount)` (trozos contiguos, último bombo corto), `assignRandomWithinPots` | OK; ids sintéticos → ids reales de `team` |
| `ranking.ts` | `sortByHistoricalRanking`, `competitionPositions`, `combineBallotsToRanking` (Borda), `combineRankings(hist, vote, pesoHist%)` | OK |
| `draft.ts` | `buildCaptainOrder`, `buildDraftOrder` (serpiente/lineal, aleatorio fijo/total), `resolveNextTurn`, `getAvailablePotIndices` | OK |
| `auction.ts` + `auction-resolution.ts` | precios mínimos, presupuesto, `applyBid`, `resolveLotTimeoutOnce`, `resolveLockoutEnded`, autoasignación | Ampliar con temporizador inicial, lotes desiertos, segunda vuelta, sorteo final y pausa (§6.3) |
| `group-phase.ts` | round-robin, `computeGroupStandings` | Ampliar: jornadas, grupos múltiples, desempate por enfrentamiento directo (§6.4) |
| `bracket-phase.ts` | `buildBracket` con **play-in en ronda 0** (nunca byes), `recordBracketGame` con propagación | Coincide con lo decidido; añadir 3º/4º opcional |
| `match.ts` | `createPartido`, `recordGame` | OK |
| `factions.ts` | 11 facciones AotR con emblema SVG (`FactionId`) | Presentación; enlazar con tabla `faction` (§5.7) |
| `types.ts` | tipos del motor | OK |

Componentes UI reutilizables (`src/components/tournament/*`): `bracket-board`,
`match-games`, `ranking-table`, `pot-board`, `bid-controls`, `captain-budget-hud`,
`countdown-ring`, `portrait-card`, `hearth-card`, `player-chip`, `honor-podium`.
Social: `comment-thread`, `like-button`, `mention-composer` (el target `editionId`
ya existe: sirve para el tablón del torneo).

Infra: `src/server/storage/r2.ts` (presign PUT directo a R2) para partidas
guardadas; `archive-procedure.ts` como patrón de `playerProcedure`;
`getPlayerForUser`; `getNextEdition`, `listConfirmedPlayers`; `edition-scenes`.

### 2.2 Se descarta

- `src/app/simulator/**` y `src/lib/simulator/**` (wizard local). Se mantienen hasta
  que el módulo nuevo esté probado; después se decide si `/simulator` desaparece.
- `src/server/realtime/*` (salas en memoria: no sobreviven en Vercel).
- `claim-captain-list` y la identificación por "device id": nada de "toca tu
  nombre" **[DECIDIDO]**.

### 2.3 Huecos detectados

Suizo, votación, clasificación de grupos desde BD, calendario, sorteo de facciones,
subida de replays, comentarios en partidos, registro de eventos. Catálogo **vacío**
en dev (0 juegos/versiones/facciones). Sólo **1 de 23** jugadores enlazado.

---

## 3. Decisiones de arquitectura

### 3.1 Rutas **[DECIDIDO]**

```
/live                       hub temporal (misma línea temporal que tendrá /council)
/live/setup                 admin: crear torneo, participantes, ranking, bombos, formación, fases
/live/vote                  jugador: mi votación
/live/formation             draft / subasta en vivo (espectador / capitán / TV)
/live/formation/replay      revivir la subasta o el draft
/live/phase/[phaseId]       vista de fase
/matches/[matchId]          ficha de partido (PERMANENTE, con comentarios)
```

Cuando el torneo se dé por comenzado en la web, `/council` muestra el bloque vivo
**en lugar de** la puerta de Durin y la sede **[DECIDIDO]**; `/live` pasa a
redirigir a `/council`. Rutas en inglés, textos en castellano.

### 3.2 Realtime: Postgres como única fuente de verdad + SSE con sondeo

- Todo estado vivo se guarda en BD. Cada escritura incrementa `version` en
  `live_room` (draft/subasta) o en `live_version` (resto del torneo).
- **Registro de eventos** **[DECIDIDO]**: subasta, draft, partidas y acciones de
  admin se guardan como una secuencia **inmutable y completa con marca de tiempo**
  (`tournament_event`, §5.3), escrita en la **misma transacción** que cada acción y
  cada resolución de temporizador. `live_room.state` es sólo una proyección: se
  reconstruye plegando los eventos con el motor puro. Es lo que permite revivir la
  subasta o el draft (§8.5) y el seguro ante cualquier caída.
- Suscripción tRPC (`httpSubscriptionLink`, ya configurado) a
  `live.onChange({ tournamentId })`: el servidor sondea la BD cada **1 s** en
  estados calientes (subasta/draft) y cada **3 s** en el resto, y emite sólo si
  cambia la versión. Fallback: `refetchInterval` de react-query. La suscripción se
  pausa cuando la pestaña está oculta (plan Hobby, §12). Reconexión automática al
  cortarse la función (`export const maxDuration = 300` en el handler de tRPC).
- **Temporizadores** (bloqueo 1,5 s, cuenta atrás 10 s, temporizador inicial de
  lote): fechas límite en BD (`deadlineAt`), resueltas de forma **perezosa** por la
  primera petición que las observe vencidas, en transacción con guarda de versión.
  La TV siempre está suscrita, así que el reloj no se para.
- Concurrencia: leer estado + versión → función pura del motor → escribir con
  `UPDATE … WHERE version = $v`; si falla, reintento y error legible.
- Mejora opcional: `LISTEN/NOTIFY` con conexión directa a Neon.

### 3.3 Identidad **[DECIDIDO]**

- Acciones personales (votar, pujar, elegir, sorteo/reparto de facciones, declarar
  derrota, subir replay, comentar) → **usuario logueado con jugador enlazado**:
  nuevo `playerProcedure` (patrón `archiveProcedure`) con `ctx.player`.
- Capitanes: al dar los bombos por definitivos, cada jugador del bombo de capitanes
  queda asignado a un equipo y **sólo su cuenta** verá las acciones de draft o
  subasta.
- **"Entrar como" para pruebas — sólo admin y sólo fuera de producción**
  (`VERCEL_ENV !== 'production'`): plugin `admin` de better-auth (incluido en la
  1.6.25 instalada, sin dependencia nueva). En `/admin/players`, por fila:
  "Crear cuenta de pruebas" (`admin.createUser` sin contraseña, email inventado
  tipo `richar@frikiparty.test`, enlazada al jugador en el mismo paso) y "Entrar
  como" (`admin.impersonateUser`: esa pestaña/navegador pasa a ser ese usuario;
  un navegador o perfil de Chrome por capitán). Banda fija "Estás actuando como
  Richar · Volver a mi cuenta" (`stopImpersonating`). Duración 12 h. Sólo `admin`,
  nunca sobre otro admin.
- Consecuencia: en producción **cada capitán necesita su cuenta enlazada**. No
  hay plan B **[DECIDIDO]**: los capitanes siempre están presentes porque juegan
  con su equipo. `/council` avisa desde `pots_review` de qué capitanes no tienen
  cuenta todavía.
- Tarea organizativa: repartir códigos de enlace a los 22 jugadores restantes;
  `/council` mostrará quién tiene cuenta y quién no.

### 3.4 Render

- Páginas en vivo **dinámicas** (excepción justificada a la regla SSG). `/council`
  conserva la cáscara estática (`revalidate = 3600`); el bloque vivo es un
  componente cliente que se hidrata por tRPC + suscripción.
- `/matches/[id]` dinámica mientras el torneo está abierto; al terminar, estática.
- Al completarse el torneo: `revalidatePath` de `/`, `/editions/*`, `/ranking`,
  `/players/*`, `/champions`.

### 3.5 Motor puro + capa de persistencia + eventos

Toda regla vive en `src/lib/tournament/*` (puro, testeable). `src/server/live/*`
carga filas → motor → escribe filas. El motor tiene dos caras: `apply*(state, …)
→ state` y `fold*(events) → state`; cada acción produce sus eventos. Invariante de
pruebas: `fold(events) === live_room.state`.

### 3.6 Genericidad (otros juegos, individual) **[DECIDIDO]**

- `tournament.kind = 'team' | 'individual'`. Individual = `teamSize 1`: cada
  participante es un `team` de un miembro (capitán de sí mismo); no hay bombos ni
  draft ni subasta (la formación es directa).
- Facciones y mapas sólo si el juego del torneo tiene catálogo (`faction` /
  `game_map` para su versión); si no, la ficha de partida omite ese paso.
- Nada en las vistas nombra a AotR: nombres de juego, versión y facciones vienen
  del catálogo.

---

## 4. Máquina de estados del torneo

Columna `tournament.stage`:

```
setup            creado; privado (admin). /council sigue mostrando la puerta
voting           votación abierta — PÚBLICO desde aquí: la puerta desaparece
ranking_review   ranking resultante, editable por el admin
pots_review      bombos generados, editables; al confirmarlos, capitanes asignados
formation        formación en vivo (draft/subasta) o revelación (aleatorios)
teams_ready      equipos publicados; falta configurar fases
phase_setup      fases configuradas y fase 1 generada, en revisión
in_progress      en juego
completed        campeón proclamado
```

- "Dar comienzo al torneo" (admin) = `setup → voting` si hay votación, o
  `setup → ranking_review` si el ranking es el histórico. Desde ese momento el
  torneo es público y `/council` cambia **[DECIDIDO]**.
- El resto de transiciones son botones del admin, salvo `in_progress → completed`
  (automática al cerrar el último partido). Cada transición registra `stageChangedAt`
  y un evento `stage_changed`.
- Dentro de `in_progress`, la etapa fina se deriva: fase actual = primera con
  partidos sin completar; semifinal/final se detectan por `roundIndex` en el
  último bracket.
- **Pausa** **[DECIDIDO]**: `live_room.status = 'paused'` bloquea toda acción de
  capitanes en draft/subasta y congela los temporizadores (se guardan los
  milisegundos restantes y se reprograman al reanudar).

---

## 5. Cambios en el modelo de datos

Migración 0021 al arrancar F0. Convenciones de `data-model.md`.

### 5.1 `tournament`

| Campo | Tipo | Notas |
|---|---|---|
| `kind` | `'team' \| 'individual'` | |
| `stage` | text | §4 |
| `stageChangedAt` | timestamp | |
| `teamSize` | integer | **Jugadores por equipo (máximo)** = nº de bombos. Fija el nº de equipos: `ceil(N / teamSize)` |
| `rankingSource` | `'historical' \| 'vote' \| 'combined'` | |
| `historicalWeightPercent` | integer nullable | Sólo `combined`; por defecto 50 |
| `formationMethod` | `'random' \| 'pots_random' \| 'draft' \| 'auction'` | Aleatorio total es independiente de bombos |
| `captainPotIndex` | integer | Por defecto 0 |
| `createdByUserId` | text FK user | |

`teamRankingSnapshot uuid[]` (existente) = ranking definitivo para bombos.
`tournament_ranking_snapshot` (existente) = participantes + ranking histórico
congelado; se regenera con cada cambio de participantes hasta `formation`.

**Equipos vacíos desde el principio [DECIDIDO]**: al fijar `teamSize` se calcula el
reparto (p. ej. 21 jugadores y 5 por equipo → 5 equipos: cuatro de 4 y uno de 5) y
se crean ya las filas de `team` (sin miembros). El asistente muestra ese reparto
en el momento.

### 5.2 Votación (nueva)

`tournament_vote`: `id, tournamentId, voterPlayerId, order uuid[] (mejor→peor, todos
los demás participantes), submittedAt`. `unique(tournamentId, voterPlayerId)`.
**Sellada al enviar** (doble confirmación; no se edita) **[DECIDIDO]**. Privada
para todos, admin incluido: ningún procedimiento devuelve papeletas; sólo el
agregado tras el cierre y la lista de quién ha votado. Durante el desarrollo, un
visor de papeletas gateado por `VERCEL_ENV !== 'production'` + admin, que no
existe en producción **[DECIDIDO]**.

### 5.3 Estado vivo y registro de eventos (nuevas)

**`tournament_event`** — fuente de verdad de todo lo que pasa en vivo:

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `tournamentId` | FK | |
| `stream` | `'auction' \| 'draft' \| 'match' \| 'admin'` | Secuencia que se reproduce |
| `seq` | integer | Orden estricto; `unique(tournamentId, seq)` |
| `type` | text | Catálogo abajo |
| `payload` | jsonb | Validado con zod por tipo |
| `at` | timestamp | Momento **real**; en temporizadores, la hora límite, no la de observación |
| `actorUserId` | text FK user nullable | Null en eventos del sistema |
| `impersonatedByUserId` | text nullable | Si la sesión era suplantada |
| `undoneBySeq` | integer nullable | Un "deshacer" no borra: anula y añade su propio evento |

Tipos: `auction`: `auction_started`, `lot_opened` (con temporizador inicial),
`bid_placed`, `lockout_started`, `countdown_started`, `lot_sold`, `lot_unsold`
(temporizador inicial agotado), `lot_skipped_confirmed` (admin confirma pasar),
`pot_second_round_started`, `raffle_started`, `raffle_assigned`,
`lot_auto_assigned`, `next_lot_confirmed`, `auction_config_changed`, `paused`,
`resumed`, `auction_closed`,
`undo`. `draft`: `draft_started`, `round_order_drawn`, `turn_started`,
`player_picked`, `paused`, `resumed`, `draft_closed`, `undo`. `match`:
`captain_ready_for_draw`, `factions_drawn`, `factions_assigned`,
`factions_confirmed`, `map_set`, `game_lost_declared`, `game_won`, `match_won`,
`game_undone`, `result_overridden`, `save_file_uploaded`. `admin`:
`stage_changed`, `participants_changed`, `ranking_edited`, `pots_edited`,
`captains_assigned`, `teams_published`, `team_named`, `phase_generated`,
`bracket_confirmed`, `tiebreak_resolved`.

Las tablas existentes `draft/draft_pick` y `auction/auction_lot/auction_bid` se
escriben **a la vez** que el evento (misma transacción) y son las proyecciones que
leen las páginas de edición y jugador. `auction_bid` guarda todas las pujas.

**`live_room`**: `id, tournamentId, kind ('draft' | 'auction'), state jsonb,
version, lastSeq, deadlineAt nullable, pausedRemainingMs nullable, status ('open'
| 'paused' | 'closed'), createdAt, updatedAt`. `unique(tournamentId, kind)`.
Proyección reconstruible; se conserva tras el cierre.

**`live_version`**: `tournamentId PK, version, updatedAt`. Contador global del
torneo para las vistas de `/council` y de fase.

### 5.4 Fases

- `phase`: + `name` text nullable.
- `phase_group_config`: + `groupCount` (por defecto **1** **[DECIDIDO]**),
  + `qualifiersPerGroup`, + `groupDistribution` (`'random' \| 'manual'`),
  + `tiebreakChain` jsonb: lista ordenada de criterios activos (§6.4), p. ej.
  `['head_to_head', 'ranking_inverse', 'draw']`. Sustituye a `tiebreakMethod`.
- **nueva** `phase_group`: `id, phaseId, groupIndex, label`.
- **nueva** `phase_group_team`: `id, groupId, teamId, seed`.
- **nueva** `phase_bracket_config` (1:1): `phaseId`, `hasThirdPlaceMatch boolean`
  (por defecto **false** **[DECIDIDO]**), `seedingSource` (`'previous_phase' |
  'ranking' | 'manual'`). Byes **no existen**: siempre play-in **[DECIDIDO]**.
  Rondas y sus partidas necesarias en `phase_bracket_round_config` (final BO3,
  semis BO1…).
- **nueva** `phase_faction_rules` (1:1, sólo juegos con facciones):
  `allowRepeatAcrossTeams boolean` (por defecto **true** **[DECIDIDO]**),
  `poolMode ('fresh' | 'depleting')` (por defecto `fresh`; el modo "pool que se
  gasta" se implementa ya, §6.8 **[DECIDIDO]**), `poolCarriesOver boolean` (si
  `depleting`: continuar el pool gastado en la fase anterior en vez de empezar
  con todas) **[SUPUESTO: false]**.
- `auction` (existente): + `initialTimerMs` (30 000), `countdownMs` (20 000),
  `countdownShortMs` (15 000), `countdownShortAfterBids` (6), `lockoutMs` (1 500).
  Editables antes y durante la subasta (§6.3).
- `tournament_swiss_config` (existente): sin cambios. Suizo puro hasta que quede uno
  **[DECIDIDO]**.

### 5.5 Partidos y partidas

- `match`: + `groupId` FK nullable, + `order` (orden dentro de jornada/ronda),
  + `isThirdPlace`, + `isTiebreak` (partido de desempate de grupo),
  + `byeTeamId` nullable (suizo: quién descansa esa ronda, sin rival).
  `roundIndex` = jornada en grupos, ronda en suizo y en bracket (0 = play-in).
- `match_game`: + `status` (`'pending' | 'awaiting_draw' | 'factions_drawn' |
  'ready' | 'completed'`), + `readyTeamAAt/readyTeamBAt` (OK de cada capitán para
  el sorteo), + `confirmedTeamAAt/confirmedTeamBAt` (reparto confirmado),
  + `mapId` FK nullable (además de `map` texto, para el catálogo).
- **nueva** `match_game_faction_draw`: `id, matchGameId, teamId, factionId,
  drawOrder` (lo sorteado; el reparto va a `match_game_player_faction`).
- `match_game_save_file` (existente) + procedimientos presign/finalize; extensión
  `.BfME2Replay` para AotR/BotME, cualquier archivo para otros juegos; límite
  **50 MB** por archivo (los replays de BFME2 pesan normalmente muy por debajo;
  el límite sólo evita subidas absurdas y se puede subir si hiciera falta).
- `team`: + `name` ya existe (nullable): el capitán puede bautizar al equipo; la UI
  siempre da el peso a los jugadores **[DECIDIDO]**.

### 5.6 Social

- `like` y `comment`: + `matchId` FK (cascade); actualizar `CHECK`, índices
  parciales, `targetSchema`, `SocialTarget`. El tablón del torneo en `/council`
  usa el target `editionId` **ya existente**: los comentarios quedan asociados a la
  edición **[DECIDIDO]**.

### 5.7 Catálogo

- `faction`: + `code` text unique (= `FactionId` de `factions.ts`), + `sortOrder`.
- **nueva** `game_map`: `id, gameId, name, players integer nullable, createdAt`,
  `unique(gameId, name)`. Catálogo que crece al escribir (patrón `tag`) y que se
  puede sembrar si conseguimos la lista de la wiki de AotR
  (`aotr.fandom.com/wiki/Maps` bloquea la lectura automática; se extrae a mano o
  con el navegador en F5). Si no hay lista, texto libre con autocompletado
  **[DECIDIDO]**.
- Script `db:seed:catalog` (idempotente, dev y prod): "Age of the Ring" (oficial)
  con **dos versiones**: **9.2.0** (la jugada en la edición 2025 **[DECIDIDO]**,
  `releaseOrder 1`) y **9.3.0** (la que se jugará en 2026 **[DECIDIDO]**,
  `releaseOrder 2`); "Battle for Middle-earth II" (oficial, sin
  versiones por ahora); y las 11 facciones con `introducedInVersionId = 9.2.0`
  (el roster no cambia entre 9.2.0 y la actual): Gondor, Rohan, Rivendell,
  Lothlórien, Woodland Realm, Erebor, Mordor, Isengard, Misty Mountains, Dol
  Guldur, Haradwaith. Se muestra la lista a Miguel antes de sembrar
  **[DECIDIDO]**. El torneo de 2025 se enlaza a la 9.2.0 (`gameVersionId`) en
  el mismo script. Las 6 facciones inventadas del seed de demo se eliminan de dev.

### 5.8 Auth (plugin `admin` de better-auth)

`user`: + `banned`, `banReason`, `banExpires`. `session`: + `impersonatedBy`.
`config.ts`: `plugins: [admin({ adminRoles: ['admin'], impersonationSessionDuration:
60 * 60 * 12 })]`; `client.ts`: `adminClient()`. Los endpoints de suplantación se
envuelven para rechazar en producción.

### 5.9 Datos de prueba persistentes **[DECIDIDO]**

Script `db:seed:live-test` (sólo dev): crea cuentas de pruebas para todos los
jugadores sin cuenta y deja un torneo de pruebas en el estado que se indique
(`--stage=pots_review`, `--stage=in_progress`…) para que Miguel pueda ver cada
pantalla sin repetir el flujo. Se puede borrar y regenerar. El histórico real no se
toca.

---

## 6. Reglas de juego decididas (complemento a `core-logic.md`)

### 6.1 Participantes y equipos
- Participantes = confirmados de la edición, y se puede **añadir cualquier
  jugador** no confirmado o quitar alguno.
- Primero `teamSize` → nº de equipos fijo y equipos vacíos en BD. Equipos
  desiguales permitidos (21 y 5 → 4,4,4,4,5).

### 6.2 Votación
- Cada participante ordena a **todos los demás** (mejor arriba). Orden inicial de
  la papeleta: **ranking histórico**. Envío con doble confirmación; sellada.
- Quien no vota no cuenta (Borda sobre las papeletas recibidas). Combinado 50/50
  por defecto.
- Público: resultado final y lista de quién ha votado / quién falta (en `/council`).

### 6.3 Subasta (ampliaciones)
- **Temporizadores configurables [DECIDIDO]**, con valores por defecto para
  empezar a probar y ajustables desde el setup y también entre lotes por el admin
  ("no lo veré claro hasta que lo pruebe"):
  - Temporizador **inicial** de cada lote (hasta la primera puja): **30 s**.
  - Cuenta atrás tras cada puja: **20 s**; a partir de la puja **nº 6** del mismo
    lote **[SUPUESTO]** baja a **15 s** (los tres valores editables).
  - Bloqueo anti-doble-toque tras cada puja: 1,5 s (reglamento).
  Todos se guardan en `auction` (§5.3) y cada cambio en caliente es un evento
  `auction_config_changed`, así la reproducción usa los tiempos reales de cada
  momento.
- Si el temporizador inicial vence sin puja, la TV anuncia "desierto" y el admin
  confirma para pasar al siguiente.
- Cuando se agotan los lotes del bombo, los desiertos vuelven a subastarse
  (**segunda vuelta**), y así sucesivamente.
- Si una vuelta completa termina sin pujas con **más de un** jugador sin vender:
  **sorteo** entre los capitanes que aún no tienen jugador de ese bombo, con
  mecanismo escénico (rueda/dados temáticos). El jugador **siempre llega previo
  pago del precio mínimo** del bombo **[DECIDIDO]**; si al capitán no le queda
  tanto, paga lo que le quede (hasta 0). Si queda exactamente uno: autoasignación
  con la misma regla de pago.
- Capitán sin dinero para el mínimo: no puja en ese bombo (reglamento); si son
  varios, pujan sin mínimo cuando sólo queden ellos.
- Pausa y deshacer (admin).

### 6.4 Grupos
- `groupCount` configurable, normalmente 1. Por grupo: ida / ida y vuelta,
  clasificados. Varios grupos: reparto aleatorio + edición manual.
- Cruces clásicos tras el play-in: 1º contra último, 2º contra penúltimo…
  (4 equipos: 1–4, 2–3).
- Play-in **siempre** que los clasificados no sean potencia de 2 (motor actual).
- **Desempate [DECIDIDO 2026-09-05]**: una **cadena ordenable** de criterios que
  se configura al crear la fase de grupos. Se muestran todos los criterios
  disponibles y el admin los ordena (arrastrar) y activa/desactiva; el orden
  resultante es el que se aplica y el que se enseña en la clasificación para que
  todo el mundo sepa cómo se resuelve un empate. Criterios disponibles:
  - `head_to_head` — enfrentamientos directos entre los empatados (con tres o más,
    mini-clasificación de los partidos entre ellos).
  - `ranking_inverse` — ranking inverso del reglamento: el equipo con peor ranking
    medio queda por encima.
  - `rings_inverse` — anillos inverso del reglamento: el equipo con menos anillos
    sumados queda por encima.
  - `draw` — a suertes: sorteo escénico, registrado en eventos.
  - `tiebreak_match` — partido(s) de desempate generados como `match.isTiebreak`
    (varios si son varios equipos).
  Reglas: los criterios automáticos (`head_to_head`, `ranking_inverse`,
  `rings_inverse`) se aplican solos en el orden dado; `draw` y `tiebreak_match`
  requieren acción del admin (botón "Resolver empate") y siempre van al final,
  el que quede último es el definitivo. Orden por defecto: `head_to_head` →
  `ranking_inverse` → `draw`, con `rings_inverse` y `tiebreak_match`
  desactivados; se cambia por fase.
- Grupos → bracket: propuesta automática con posiciones resueltas; el admin
  **revisa y confirma**.

### 6.5 Bracket
- Sin byes. 3º/4º opcional, desmarcado por defecto. Partidas necesarias por
  ronda.

### 6.6 Suizo
- Puro hasta que quede uno sin eliminar. Impar → **sorteo de quién descansa**
  (`byeTeamId`, no cuenta como victoria). Emparejar mismos marcadores evitando
  repeticiones cuando sea posible.

### 6.7 Partida
- Sorteo de facciones cuando **ambos capitanes** han pulsado "Listos". Cada equipo
  recibe tantas facciones como jugadores tenga (equipos desiguales OK), sin repetir
  dentro del equipo; entre equipos según `allowRepeatAcrossTeams`.
- Cada capitán reparte; los repartos son **visibles** para todos y ambos capitanes
  **confirman** antes de jugar.
- Resultado: el **capitán del equipo perdedor** declara "hemos perdido" (sólo puede
  declarar su derrota) o el admin marca cualquier resultado; el admin puede
  sobrescribir con botón exclusivo.
- Mapa: catálogo por juego con autocompletado y texto libre.

### 6.8 Pool de facciones que se gasta (`poolMode = 'depleting'`) **[DECIDIDO]**
- Cada equipo tiene, por fase, un pool que empieza con **todas** las facciones de
  la versión del torneo. En cada partida el sorteo saca del pool restante tantas
  facciones como jugadores tenga el equipo (K) y las consume.
- Cuando quedan **menos de K**: se sacan las R que quedan, el pool se **rellena
  entero** (todas las facciones menos esas R) y se sacan las K − R restantes. Así
  nunca se repite una facción dentro de un mismo sorteo y cada facción se juega
  una vez por "ciclo" antes de repetirse.
- El estado del pool **no se guarda**: se deriva de la secuencia de
  `match_game_faction_draw` del equipo en la fase (o desde la primera fase, si
  `poolCarriesOver`), aplicando la regla de relleno de forma determinista. Es
  visible para todos: "A este equipo le quedan: Rohan, Erebor, Haradwaith".
- Con `allowRepeatAcrossTeams = false`: se sortea primero el equipo con menos
  facciones restantes; el segundo sortea excluyendo las del primero; si con la
  exclusión no llega a K, se relaja la exclusión sólo para lo que falte (evento
  `factions_drawn` lo deja anotado).
- Implementación en el motor puro (`drawFactions(rules, poolStateA, poolStateB,
  rng)`) con pruebas unitarias de los casos límite (pool exacto, relleno a mitad de
  sorteo, equipos desiguales, exclusión imposible).
- Se calcula y se enseña al configurar la fase cuántas partidas caben en un ciclo
  (facciones ÷ K), para que se vea de antemano cuándo empezarían a repetirse.

---

## 7. Plan por fases de trabajo

Cada fase termina con `pnpm run typecheck`, `pnpm run check`, build con
`SKIP_ENV_VALIDATION=1` si se tocan límites cliente/servidor, y prueba manual
guiada. Nada se commitea ni despliega sin preguntar.

### F0 — Cimientos — **HECHO 2026-09-05** (pendiente: build de producción y commit)
- Migración 0021 (§5). Scripts `db:seed:catalog` y `db:seed:live-test`.
- `playerProcedure`. Plugin `admin` de better-auth: "Crear cuenta de pruebas" y
  "Entrar como" en `/admin/players` (fuera de producción), banda de suplantación.
- `src/server/live/` (carga/escritura, guardas de versión, `tournament_event`
  con `seq` atómico) y router `live` (`state`, `onChange`), `maxDuration`.
- Router `tournament` (admin): `create` (edición próxima, kind, juego/versión,
  participantes desde confirmados + cualquier jugador, `teamSize` → equipos
  vacíos), `updateParticipants`, `setTeamSize`, `start` (dar comienzo),
  `setStage`, `delete` (para pruebas, no si `completed`).
- `/live` cáscara con línea temporal; `/live/setup` pasos 1–2.
- `/council`: en `setup` no cambia; desde `voting`/`ranking_review` sustituye
  puerta y sede por el bloque vivo (por ahora: etapa, participantes, cuentas
  enlazadas).

Prueba: crear torneo 2026, participantes, tamaño 5 con 21 → ver "5 equipos: 4,4,4,4,5";
cuentas de pruebas para 6 jugadores; tres navegadores entrando como jugadores
distintos; cambio de etapa visible en <3 s; borrar y recrear.

### F1 — Ranking y bombos — **HECHO 2026-09-05**
- Setup: `rankingSource`; histórico directo o votación.
- `/live/vote`: papeleta con arrastrar + flechas, orden inicial histórico, "Enviar"
  con doble confirmación, sellada. Visor de papeletas sólo fuera de producción.
- `/council` y `/live`: "Han votado 12 de 20", nombres de quien falta, botón Votar.
- Cierre → Borda → combinado → **ranking review** editable → definitivo.
- Bombos: `generatePots` → **pots review** editable → "Definitivos": escribe
  `team_formation_pot_player`, asigna capitanes (bombo `captainPotIndex`) a los
  equipos vacíos (evento `captains_assigned`).
- Revelación de bombos en `/council` con animación de cartas.

Prueba: 6 jugadores votan desde 3 navegadores; comprobar Borda con caso pequeño;
mover jugador de bombo; comprobar que los capitanes ven "Eres capitán".

Nota de implementación (2026-09-05): la lista de participantes y el tamaño de
equipo sólo se editan en `setup`; para añadir a alguien después, el admin
devuelve la etapa a "Preparación" (se anulan votos, ranking y bombos derivados).
El ranking, el agregado de votos y los bombos sólo salen del servidor para
no-admins a partir de `formation` (bombos publicados). La papeleta se abre en
orden histórico; el "Votar ahora" del Concilio sólo aparece a participantes sin
voto. "Eres capitán" queda para F2 (no había sala de formación donde mostrarlo).

### F2 — Formación de equipos — **HECHO 2026-09-05** (ver nota al final)
- Aleatorio total / por bombos: generación + **revelación** sincronizada por
  `live_version` (equipo a equipo, con retardo escénico).
- Draft en vivo: setup (modo, orden editable, serpiente/lineal) → sala. Capitán en
  turno: bombo → jugador. Espectador/TV: **orden completo del turno**, qué ha
  elegido cada uno en ese turno, bombos completos con los ya elegidos tachados,
  ranking de referencia, equipos rellenándose, nombres que aparecen con animación.
  Sin reloj. Admin: pausa, deshacer.
- Subasta en vivo: reglas §6.3. Capitán: `bid-controls`. TV: jugador en subasta
  con retrato grande, precio actual grande, anillo de cuenta atrás (inicial y de
  10 s), presupuestos, equipos formándose, "¡Vendido!" / "Desierto" / sorteo con
  animación. Admin: confirmar siguiente, confirmar pasar, pausa, deshacer.
- Toda acción y temporizador → `tournament_event` + proyecciones `draft_*` /
  `auction_*` + `live_room.state`, misma transacción. Herramienta
  `rebuildRoomFromEvents`.
- Cierre → `team_member` (capitán, `seat` por bombo) → `teams_ready`. El capitán
  puede poner nombre al equipo.
- **Revivir** (§8.5) `/live/formation/replay`: entregable de F2 porque es la mejor
  prueba de que no falta ningún evento.
- `/council`: equipos como fichas (jugadores con retrato, capitán destacado,
  nombre del equipo si lo hay).

Prueba: 4 capitanes en 4 navegadores + TV; subasta con lote desierto, segunda
vuelta, sorteo final, sin dinero, pausa, deshacer; draft serpiente completo; apagar
el servidor a mitad y continuar; reproducir y comparar con lo visto.

### F3 — Fases y calendario — **HECHO 2026-09-05**
- Setup de fases: grupos (§6.4), bracket (§6.5), suizo (§6.6), reglas de facciones
  por fase (§5.4). Motor: `scheduleRoundRobin` (círculo, jornadas), `assignGroups`,
  `seedBracketFrom` (cruces clásicos tras play-in), `pairSwissRound`,
  `resolveGroupTies` (enfrentamientos directos → intervención admin).
- "Generar fase 1" → revisión (intercambiar equipos de grupo) → "Arrancar torneo".
- `Calendar`: jornada/ronda actual destacada, partidos con estado y marcador.

Prueba: 8 equipos, 1 grupo ida, 5 clasificados → play-in 4º–5º → bracket 4 con
final BO3; 2 grupos de 4; 6 equipos suizo 2 derrotas con bye.

### F4 — Vistas de fase (en vivo) — **HECHO 2026-09-05**
- Grupos: clasificación (W-L, partidas, desempate explicado), jornadas, **cuadro de
  cruces**.
- Bracket: escritorio árbol horizontal con cabeceras fijas y minimapa; móvil **una
  ronda por pantalla** con snap; play-in como antesala; "mi partido"; partido en
  juego con glow.
- Suizo: columnas por marcador (estilo Major de CS), fichas que se mueven,
  eliminados apagados, emparejamientos de la ronda, quién descansa.

### F5 — Ficha de partido y partidas (`/matches/[id]`)
- Cabecera cara a cara, marcador grande, "al mejor de N", fase/ronda.
- Por partida: "Listos" de ambos capitanes → sorteo con animación de cartas →
  reparto por arrastre → confirmación de ambos → mapa → "Hemos perdido" (capitán)
  / resultado (admin) → automatismos → partida guardada (varias) → comentarios.
- Sobrescritura de resultado y deshacer (admin), registrados como eventos.
- Catálogo de mapas: intento de extraer la lista de la wiki de AotR.

### F6 — `/council` centro de mando
`LiveCouncil` por etapa:

| Etapa | Bloques |
|---|---|
| sin torneo / `setup` | lo actual (puerta, confirmados, sede) |
| `voting` | "Votación abierta" · han votado X de N · pendientes · Votar |
| `ranking_review` / `pots_review` | "El Concilio delibera" (detalle sólo admin) |
| `formation` | acceso a la sala en vivo · progreso · equipos formándose |
| `teams_ready` / `phase_setup` | equipos revelados · "el calendario se forja" · Revive la subasta/draft |
| `in_progress` | fase actual embebida · próximos partidos · mis partidos · últimos resultados · tablón (`editionId`) |
| semis / final | diseño especial (F7) en primer plano |
| `completed` | campeón · clasificación final · revive · enlace a la edición |

Siempre: "¿Qué está pasando?" / "¿Qué toca ahora?" y accesos de admin a `/live/setup`.

### F7 — Semifinales y final
Diseños épicos y profesionales **[DECIDIDO]**: semis "los ejércitos se reúnen"
(enfrentamientos a página completa, retratos en formación, emblemas de facciones,
antorchas por partida ganada); final "la Batalla por el Anillo" (anillo entre los
dos equipos, filigrana, el anillo gira hacia el vencedor, coronación con podio y
confeti dorado, tema musical propio si la música está activa). Se activan solas por
`roundIndex`.

### F8 — Extremo a extremo y producción
Guion completo en preview con cuentas de pruebas; comprobar anillos y páginas tras
`completed`; migración y seed de catálogo en prod; enlazado de cuentas reales;
destino de `/simulator`.

Orden: F0 → F1 → F2 → F3 → F4 → F5 → F6 → F7 → F8. F6 se alimenta desde F0.

### Calendario objetivo **[DECIDIDO: extremo a extremo probado el 1 de noviembre de 2026]**

| Hito | Fecha límite |
|---|---|
| F0 cimientos + F1 ranking y bombos | 18 sep |
| F2 formación (draft, subasta, revivir) | 2 oct |
| F3 fases y calendario + F4 vistas de fase | 12 oct |
| F5 ficha de partido (facciones, pool, resultados, replays, comentarios) | 19 oct |
| F6 `/council` completo + F7 semis y final | 26 oct |
| F8 prueba completa en preview, migración y seed en prod, cuentas reales | **1 nov** |
| Margen para ajustes tras probarlo "en primera persona" (tiempos de subasta, animaciones) | 1–11 nov |

Las pruebas de subasta con tiempos reales se hacen en cuanto exista F2 (primera
semana de octubre) para que haya margen de ajustar los temporizadores.

---

## 8. Pantallas

### 8.1 `/live/setup` (admin), asistente reentrable
1. Torneo: edición, tipo (equipos/individual), oficial, juego y versión, modelo,
   **jugadores por equipo** → reparto de equipos calculado al instante.
2. Participantes: confirmados precargados; añadir cualquier jugador; ranking
   histórico congelado. "Dar comienzo al torneo".
3. Ranking: fuente; votación (estado, cierre, visor de pruebas); peso; revisión.
4. Bombos: generar, editar, definitivos → capitanes.
5. Formación: método; draft/subasta (orden editable, modo); "Iniciar sala";
   pausa/reanudar/deshacer; aleatorios: "Sortear y revelar".
6. Fases: constructor; "Generar fase 1"; revisión; "Arrancar torneo".
7. En juego: próximos partidos, corregir resultados, resolver desempates, confirmar
   bracket, cerrar fase.

### 8.2 Espectador (móvil y TV)
Comparten componentes; `?display=tv` sin navegación, tipografía grande. Estética
de concurso: entradas animadas de nombres, contador de precio que sube, "vendido"
con sello, transiciones entre lotes, sorteos con rueda/dados temáticos.

### 8.3 Capitán
Vista espectador + panel de acción fijo abajo (pujas / picks / listos / reparto /
"hemos perdido"), doble toque en acciones irreversibles, anti-doble-toque.

### 8.4 Ficha de partido
Cara a cara: A izquierda, B derecha, partidas en el centro como pergaminos; móvil
en acordeón.

### 8.5 Revivir la subasta o el draft
`/live/formation/replay`, luego enlace permanente desde la edición y `/council`.
Reproductor sobre `foldAuctionEvents` / `foldDraftEvents` con los mismos
componentes de espectador: reproducir/pausar, ×1 (tiempos reales), ×4, ×16, saltar
al siguiente evento, barra con marcas por lote/pick, resumen final (precio por
jugador, guerra de pujas más larga, jugador más disputado, capitán que más se
dejó). Los eventos anulados se ven deshacerse como en directo.

---

## 9. Realtime en detalle

- Router `live`: `state({ tournamentId })` (snapshot de lo que muestra `/council`),
  `onChange({ tournamentId })` (suscripción; emite el estado completo, <50 KB).
- `formation.*`: `bid`, `pick`, `confirmNext`, `confirmSkip`, `pause`, `resume`,
  `undo`, `nameTeam`.
- `match.*`: `ready`, `drawFactions` (se dispara solo al segundo "listos"),
  `assignFactions`, `confirmFactions`, `setMap`, `declareLoss`, `setResult`
  (admin), `undoGame`, `presignSaveFile`, `finalizeSaveFile`.
- Cada mutación: transacción → guarda de versión → evento(s) con `seq` → proyección
  → `live_version` → `revalidatePath` al cerrar partidos.
- Idempotencia: `expectedVersion` en pujas/picks.

---

## 10. Permisos

| Acción | Anónimo | Usuario sin jugador | Jugador enlazado | Capitán (su equipo) | Admin |
|---|---|---|---|---|---|
| Ver todo | ✔ | ✔ | ✔ | ✔ | ✔ |
| Votar | | | ✔ (participante) | ✔ | ✔ (participante) |
| Pujar / elegir | | | | ✔ | (sólo entrando como el capitán, fuera de producción) |
| Listos / reparto / confirmar facciones | | | | ✔ | ✔ |
| Declarar derrota | | | | ✔ (sólo la propia) | ✔ (cualquier resultado) |
| Nombre del equipo | | | | ✔ | ✔ |
| Subir partida guardada | | | ✔ (si jugó) | ✔ | ✔ |
| Comentar / me gusta | | | ✔ | ✔ | ✔ |
| Setup, transiciones, pausa, deshacer, sobrescribir, desempates, borrar | | | | | ✔ |
| Crear cuenta de pruebas / Entrar como | | | | | ✔ (fuera de producción) |

---

## 11. Preguntas abiertas

Ninguna. Todas las preguntas de la v0/v1 están resueltas y anotadas en §13. Las
próximas dudas que surjan durante la implementación se añaden aquí.

Valores que quedan como **[SUPUESTO]** ajustables sin coste: cuenta atrás corta a
partir de la puja nº 6; `poolCarriesOver = false`; límite de 50 MB por replay.

---

## 12. Riesgos

- Cuentas sin enlazar: bloquea todo lo personal en producción (sin suplantación).
- Red del evento: fallback de sondeo + temporizadores perezosos; la TV siempre
  conectada.
- **Plan Hobby de Vercel [DECIDIDO]**: funciones hasta 300 s; las suscripciones
  SSE consumen tiempo de función. Mitigación: suscripción sólo en pestaña visible,
  intervalos 1 s / 3 s, un solo canal por pestaña; medir en F2 y, si hace falta,
  `LISTEN/NOTIFY` o intervalos mayores. El uso es puntual (cuatro días al año).
- Migración grande en prod: se prueba en preview antes.
- Extracción del catálogo de mapas: puede no ser posible; queda el texto libre.

---

## 13. Registro de cambios

- 2026-09-04 — v0. Inventario del código, propuesta de arquitectura, modelo y fases.
- 2026-09-04 — Identidad: cuentas de pruebas sin contraseña + "Entrar como" con el
  plugin `admin` de better-auth (sin dependencia nueva), un navegador por jugador.
- 2026-09-04 — "Absolutamente todo en BD": `tournament_event` inmutable escrito en
  cada acción y temporizador; `live_room.state` pasa a proyección; reproductor
  para revivir subasta y draft (§8.5) como entregable de F2.
- 2026-09-04 — **v1** con las 34 respuestas de Miguel: módulo genérico (otros
  juegos, individual); rutas `/live` + `/matches/[id]`; `/council` sustituye la
  puerta al dar comienzo; participantes = confirmados + cualquiera; `teamSize`
  primero y equipos vacíos en BD; votación de todos los demás, orden inicial
  histórico, envío sellado con doble confirmación, privada también para el admin
  (visor sólo fuera de producción), lista pública de quién ha votado en `/council`;
  capitanes = primer bombo, sólo con su cuenta; "Entrar como" sólo fuera de
  producción; subasta con temporizador inicial, lotes desiertos con confirmación
  del admin, segunda vuelta, sorteo escénico; draft sin reloj con pantalla
  completa; pausa y deshacer; nombre de equipo opcional; grupos normalmente 1,
  play-in siempre (nunca byes), 3º/4º opcional desmarcado, desempate por
  enfrentamientos directos y luego suertes o partido; suizo puro con bye sorteado;
  equipos desiguales; bracket propuesto y confirmado por el admin; facciones
  repetibles entre equipos (opción), sorteo al doble "listos", repartos visibles y
  confirmados; derrota declarada por el capitán perdedor o admin; catálogo de
  mapas; replays `.BfME2Replay`; tablón sobre `editionId`; libertad en la BD de
  dev con datos de prueba persistentes; plan Hobby.
- 2026-09-04 — Versiones de AotR: en 2025 se jugó la **9.2.0** (no existía la
  9.3.0) y en 2026 se jugará la **9.3.0**. El seed de catálogo siembra ambas, las
  11 facciones introducidas en 9.2.0, y enlaza el torneo de 2025 a la 9.2.0.
- 2026-09-05 — **v1.1**, últimas seis respuestas: desempate = enfrentamientos
  directos → paso opcional del reglamento (ranking/anillos inverso, desactivado
  por defecto) → suertes o partido; subasta con temporizadores configurables
  (inicial 30 s, cuenta atrás 20 s que baja a 15 s tras 6 pujas, editables en
  caliente y registrados como eventos), sorteo y autoasignación siempre previo pago
  del mínimo o de lo que quede; sin "Entrar como" en producción (los capitanes
  siempre están); pool de facciones que se gasta se implementa ya (§6.8, derivado
  de los sorteos, con relleno automático); fecha objetivo **1 de noviembre de 2026**
  con calendario por hitos en §7; replays con límite de 50 MB.
- 2026-09-05 — Desempate en grupos: cadena ordenable con todos los criterios
  (enfrentamientos directos, ranking inverso, anillos inverso, suertes, partido de
  desempate); el admin fija el orden por fase y la clasificación lo muestra.
  **Arranca F0.**
- 2026-09-05 — **F0 implementado** (sin commit todavía): migración 0021 aplicada
  en dev (nuevas tablas `tournament_event`, `live_room`, `live_version`,
  `tournament_vote`, `phase_group`, `phase_group_team`, `phase_bracket_config`,
  `phase_faction_rules`, `match_game_faction_draw`, `game_map`; columnas nuevas en
  `tournament`, `phase_group_config` (`tiebreak_chain` sustituye a
  `tiebreak_method`), `match`, `match_game`, `auction`, `faction`, `like`/`comment`
  (`match_id`), `user`/`session` para el plugin admin). Catálogo sembrado en dev:
  AotR 9.2.0 y 9.3.0, 11 facciones, BFME II; torneos 2025 enlazados a 9.2.0.
  `playerProcedure`; plugin `admin` de better-auth con "Cuenta de pruebas" y
  "Entrar como" en `/admin/players` (bloqueados en producción por hook) y banda
  "Estás actuando como…"; `src/server/live/tx.ts` (transacción con bloqueo por
  torneo + eventos con `seq`) y `state.ts`; routers `live` (estado + suscripción
  SSE con sondeo 1 s/3 s) y `tournament` (crear, participantes, tamaño, dar
  comienzo, etapa a mano, borrar); rutas `/live` y `/live/setup`; `/council`
  muestra el bloque vivo desde que el torneo es público. Probado en navegador:
  torneo 2026 creado con 21 participantes (5 equipos: cuatro de 4 y uno de 5),
  cambio de etapa reflejado en otra pestaña sin recargar, cuenta de pruebas de
  Richar y "Entrar como" / "Volver a mi cuenta". Queda en dev un torneo 2026 en
  etapa `pots_review` y la cuenta de pruebas de Richar. Pendientes de F0: script
  `db:seed:live-test` escrito pero no ejecutado; `SKIP_ENV_VALIDATION=1 pnpm run
  build` no ejecutado porque el dev server estaba en marcha; seed de catálogo y
  migración en producción (los ejecuta Miguel al desplegar).
- 2026-09-05 — **F1 implementado y probado**: router `vote` (`mine`, `submit`
  sellado, valida que la papeleta ordena a todos los demás; el evento registra
  quién votó, nunca el orden), `/live/vote` con lista reordenable (arrastrar y
  flechas) y doble confirmación; bloque de votación en `/live` y `/council`
  (sellados / faltan, botón "Votar ahora"); en `/live/setup` paneles por etapa:
  cerrar votación (Borda y combinado con peso; visor de papeletas sólo fuera de
  producción), revisión del ranking editable con columnas histórico/voto,
  "Ranking definitivo → bombos" (`generatePots`), revisión de bombos con
  `PotBoard`, "Bombos definitivos → capitanes" (capitanes a los equipos vacíos,
  `stage = formation`). Revelación de bombos en el Concilio con cartas que se
  giran bombo a bombo y bloque del ranking final. Privacidad: ranking, agregado y
  bombos gateados por rol hasta `formation`. Probado: 5 votos (Richar por la UI
  suplantado, cuatro por API), cierre, edición y confirmación del ranking, bombos
  5-5-5-5-1 y capitanes Bordallo, Cordente, Valanton, Juanills y Arsu. Cuentas de
  pruebas creadas para los 21 jugadores sin cuenta (`db:seed:live-test`).
- 2026-09-05 — **F2 implementado**: motores puros con eventos como única verdad
  (`src/lib/tournament/auction-live.ts`, `draft-live.ts`: `fold*(events)` es el
  estado; los comandos proponen eventos; deshacer marca eventos como anulados y
  el lote vuelve a abrirse limpio). Subasta: temporizador inicial, bloqueo,
  cuenta atrás (corta a partir de N pujas), lote desierto con confirmación,
  segunda vuelta con los desiertos, sorteo si una vuelta entera queda sin pujas,
  autoasignación del último con un solo capitán necesitado, pujas libres cuando
  nadie alcanza el mínimo, pausa con tiempo restante, deshacer, tiempos editables
  en caliente (evento `auction_config_changed`). Draft: orden de capitanes
  (ranking/inverso/aleatorio fijo/aleatorio por ronda, primera ronda editable),
  serpiente/lineal, pausa, deshacer, cierre automático al agotarse las
  elecciones. Aleatorio total y por bombos con siembra inmediata. Servidor:
  `src/server/live/formation.ts` (`applyRoomCommand` dentro de la transacción del
  torneo, `settleAuctionTimers` perezoso llamado por la suscripción en cada tick),
  router `formation` (setMethod, startRandom, startDraft, startAuction,
  updateAuctionConfig, bid, pick, confirmNext, confirmSkip, raffle, pause,
  resume, undo, finish, nameTeam, events). Al publicar (`finish`) se sientan los
  equipos (`team_member` con asiento por bombo) y se escriben las proyecciones
  `auction_lot`/`auction_bid` o `draft_pick` desde el registro. UI: `AuctionStage`
  (atril con carta grande, precio con pop, reloj, sellos ¡Vendido!/Desierto/
  Pausa/Sorteo, oro y compras de cada capitán, cola del bombo, controles del
  capitán), `DraftStage` (turno, orden completo, equipos, bombos tachados,
  controles bombo→jugador), `FormationRoom` (detecta al capitán por su cuenta),
  `/live/formation` con `?display=tv`, `FormationPanel` en `/live/setup`,
  `TeamsReveal` en el Concilio con nombre de equipo por el capitán, y
  `/live/formation/replay` (plegado hasta el instante elegido, ×1/×4/×16, saltar
  evento, marcas por venta, resumen final). Identidad del pujador oculta en el
  estado público. Probado en navegador: subasta completa de 16 lotes con pujas
  de varios capitanes suplantados (ventas por cuenta atrás, autoasignación,
  desiertos con segunda vuelta, sorteo del último bombo corto, pausa/reanudar,
  deshacer, cambio de tiempos en caliente), publicación de equipos, revelación
  en el Concilio y reproducción a ×16; draft completo en serpiente con pausa y
  deshacer, cierre automático con el último bombo corto (15 elecciones) y
  publicación. Aviso de prueba: un bot de pujas en una pestaña en segundo plano
  se ralentiza por el throttling de Chrome; no es cosa del servidor.
  El torneo 2026 de dev queda en `teams_ready` formado por draft.
- 2026-09-05 — **F3 implementado**: motor puro `src/lib/tournament/phase-engine.ts`
  (round-robin por método del círculo con jornadas y descansos, ida y vuelta;
  siembra de equipos por el ranking del capitán; reparto en grupos por sorteo o
  serpiente; árbol de eliminatorias con play-in y nunca byes, 3º/4º opcional;
  emparejamiento suizo por marcador con los tres criterios, sin repeticiones
  cuando se puede y descanso sorteado; clasificación con la cadena de desempate
  ordenada: enfrentamientos directos, ranking inverso, anillos inverso, y
  `tiedWith` para los manuales). Vocabulario del desempate en
  `src/lib/tournament/tiebreak.ts` (sin Drizzle). Servidor: `src/server/live/
  phases.ts` (`loadPhases`, `gamesToWinFor`), router `phases` (`savePlan`,
  `generateFirst`, `setGroups`, `startPlay`), fases con partidos y partidas dentro
  del estado en vivo. UI: `PhasesPanel` en `/live/setup` (constructor de fases con
  grupos, eliminatorias y suizo, cadena de desempate reordenable, partidas por
  ronda con nombres Play-in/Cuartos/Semis/Final, reglas de facciones por fase,
  editor de grupos a mano), `Calendar` en `/live` y `/council` (jornadas y rondas,
  la actual destacada, marcador derivado de las partidas, enlace a la ficha),
  ficha de partido mínima en `/matches/[id]` (cabecera cara a cara; el resto llega
  en F5). Probado: plan grupos + playoffs con final BO3, generación de 15 partidos
  en 5 jornadas para 6 equipos, arranque a `in_progress`, calendario en el hub y
  ficha. Motor verificado con casos: 5 y 6 equipos ida/vuelta, bracket de 5 y 6
  con play-in, suizo de 7 con descanso, desempate por enfrentamiento directo.
  El torneo 2026 de dev queda `in_progress` con la jornada 1 pendiente.
- 2026-09-05 — **F4 implementado**: `/live/phase/[phaseId]` con suscripción y
  `PhaseView` por tipo. Grupos (`GroupView`): clasificación con J/G/P y partidas,
  línea de corte de clasificados, el criterio que separó cada fila ("por
  enfrentamientos directos", "por ranking inverso") y aviso de empate pendiente
  para los criterios manuales; cuadro de cruces equipo × equipo con enlace a cada
  partido; helper `src/lib/live/standings.ts` (ranking medio del equipo y anillos
  sumados). Eliminatorias (`BracketView`): en escritorio árbol completo con
  columnas por ronda, cabeceras fijas y conectores SVG medidos tras el layout
  (dorados cuando el alimentador ha terminado) dentro de un marco con scroll
  propio; en móvil una ronda por pantalla con desplazamiento a saltos y sin
  conectores; "Mi partido" centra el partido del espectador; partido en juego con
  brillo. Suizo (`SwissView`): columnas por marcador (3-0, 2-1…), eliminados
  apagados, ronda actual desplegada y anteriores plegadas, descansos. El hub y el
  Concilio embeben la fase actual en modo compacto durante `in_progress`, con
  enlace a la fase completa. Probado con resultados de prueba sembrados (tres
  jornadas y una semifinal): triple empate resuelto por enfrentamientos
  directos, empate a cero resuelto por ranking inverso, corte de clasificados,
  conectores del cuadro y propagación del ganador al hueco de la final. Esos
  resultados de prueba los borrará F5 al implementar el registro real.
