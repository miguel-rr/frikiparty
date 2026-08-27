# Frikiparty - Modelo de datos

> Diseño validado paso a paso con el usuario, previo a implementar el schema de Drizzle.
> Complementa a `core-logic.md` (glosario y lógica de negocio, la fuente de verdad del dominio).
>
> Convenciones generales: PK `uuid` en todas las tablas propias (vía `pgTableCreator`,
> prefijo `frikiparty_`), salvo las tablas de better-auth (`user`, `session`, `account`,
> `verification`), que se mantienen sin prefijo y no se tocan. Los enums de texto
> (`'a' | 'b'`) se validan a nivel de aplicación (zod), no como `pgEnum`, para poder añadir
> valores sin migración. Regla general aplicada en todo el modelo: **derivar en vez de
> guardar** siempre que un dato se pueda calcular de forma fiable a partir de otros
> (anillos, ordinal de edición, dinero restante en subasta, número de fases…).

## 1. Jugador

### `player`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid`, PK | |
| `name` | `text`, not null | Apodo del jugador |
| `slug` | `text`, not null, unique | URL de la página del jugador (`/players/[slug]`). Se genera del nombre al crear el jugador y no cambia si se edita el nombre, para no romper enlaces |
| `userId` | `text`, FK a `user.id`, nullable, unique | Enlace opcional a cuenta web (better-auth) |
| `avatar` | `text`, not null, con default | Clave de un catálogo fijo en código (estilo PSN, temática ESDLA) |
| `imageUrl` | `text`, nullable | Foto real (Cloudflare R2) — independiente del avatar |
| `bio` | `text`, nullable | Markdown libre |
| `createdAt` | `timestamp` | |

**Anillos / anillos individuales / ediciones jugadas: NO se guardan.** Se derivan por
consulta contando torneos oficiales ganados (rings), torneos individuales oficiales
ganados (individualRings) y ediciones distintas con participación (editionsPlayed).

## 2. Catálogos (juego, versión, facción)

### `game`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid`, PK | |
| `name` | `text`, not null, unique | |
| `isOfficial` | `boolean`, not null, default `false` | Solo `true` para AotR/BotME, pre-sembrados |
| `createdAt` | `timestamp` | |

### `game_version`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid`, PK | |
| `gameId` | `uuid`, FK a `game.id`, not null | |
| `version` | `text`, not null | Ej. "1.06" |
| `releaseOrder` | `integer`, not null | Orden cronológico — los strings de versión no ordenan bien como texto |

`unique(gameId, version)`

### `faction`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid`, PK | |
| `introducedInVersionId` | `uuid`, FK a `game_version.id`, not null | Versión en la que apareció |
| `removedInVersionId` | `uuid`, FK a `game_version.id`, nullable | Versión en la que dejó de existir, si aplica |
| `name` | `text`, not null | |

Las facciones disponibles para un torneo se derivan comparando `releaseOrder` de
`introducedInVersionId`/`removedInVersionId` contra `tournament.gameVersionId` — no hay
tabla de "roster por torneo".

## 3. Edición

### `venue`

Normalizada aparte de `edition` porque las sedes (casas rurales, sobre todo) se repiten
entre ediciones — así el enlace de Google Maps se guarda una sola vez por sitio.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid`, PK | |
| `name` | `text`, not null | Nombre del lugar |
| `mapsUrl` | `text`, nullable | URL de "compartir" de Google Maps |
| `createdAt` | `timestamp` | |

### `edition`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid`, PK | |
| `year` | `integer`, not null | |
| `order` | `integer`, not null, default `1` | Desambigua/ordena ediciones dentro del mismo año |
| `venueId` | `uuid`, FK a `venue.id`, nullable | |
| `createdAt` | `timestamp` | |

`unique(year, order)` (constraint compuesta, no exige `year` único por sí solo).

El ordinal global (I, II, III… XXIII) no se guarda — se deriva ordenando por
`(year, order)`.

## 4. Torneo

### `tournament`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid`, PK | |
| `editionId` | `uuid`, FK a `edition.id`, not null | |
| `gameId` | `uuid`, FK a `game.id`, **nullable** | `NULL` = se sabe que fue oficial pero no si AotR o BotME (histórico) |
| `isOfficial` | `boolean`, not null | Independiente de `game.isOfficial` |
| `gameVersionId` | `uuid`, FK a `game_version.id`, nullable | Solo si `isOfficial = true` |
| `model` | `text` (`'classic' \| 'swiss'`), **nullable** | Nullable porque en histórico puede no conocerse |
| `teamRankingSnapshot` | `uuid[]`, nullable | Solo si `isOfficial = true` y se usó votación/combinado para bombos |
| `createdAt` | `timestamp` | |

Regla de visualización (capa de app, no de esquema): si `isOfficial = true` y `gameId`
es `NULL` se muestra "AotR/BotME"; si `isOfficial = true` y `gameId` apunta a un juego
concreto, se muestra ese nombre; si `isOfficial = false`, `gameId` siempre es conocido.

`tournament.hasDetailedRecord` — deliberadamente **no** existe como campo; se deriva de
si existen filas en `phase` para ese torneo (torneos históricos solo tienen la fila de
`tournament` + el equipo ganador, sin fases/partidos).

### `tournament_swiss_config` (1:1, solo si `model = 'swiss'`)

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid`, PK | |
| `tournamentId` | `uuid`, FK a `tournament.id`, not null, unique | |
| `eliminationLosses` | `integer`, not null | |
| `pairingMethod` | `text` (`'random' \| 'ranking_parity' \| 'ranking_seed'`), not null | |
| `createdAt` | `timestamp` | |

### `tournament_ranking_snapshot` (1:N — una fila por jugador, solo si `isOfficial = true`)

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid`, PK | |
| `tournamentId` | `uuid`, FK a `tournament.id`, not null | |
| `playerId` | `uuid`, FK a `player.id`, not null | |
| `position` | `integer`, not null | |
| `rings` | `integer`, not null | Congelado en ese momento, no se recalcula |
| `individualRings` | `integer`, not null | |
| `editionsPlayed` | `integer`, not null | |

`unique(tournamentId, playerId)`, `unique(tournamentId, position)`

## 5. Formación de equipos

### `team`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid`, PK | |
| `tournamentId` | `uuid`, FK a `tournament.id`, not null | No persiste entre ediciones |
| `name` | `text`, nullable | Decorativo |
| `createdAt` | `timestamp` | |

### `team_member`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid`, PK | |
| `teamId` | `uuid`, FK a `team.id`, not null | |
| `playerId` | `uuid`, FK a `player.id`, **nullable** | `NULL` = jugador sin identificar (ver nota) |
| `tournamentId` | `uuid`, FK a `tournament.id`, not null | Duplicado desde `team.tournamentId` a propósito |
| `isCaptain` | `boolean`, not null, default `false` | |
| `createdAt` | `timestamp` | |

`unique(teamId, playerId)`. `unique(tournamentId, playerId)` — impide que un jugador
esté en dos equipos del mismo torneo (regla forzada a nivel de BD, no de aplicación).
Postgres no compara los `NULL` como iguales en estas constraints, así que puede haber
varios miembros sin identificar en el mismo equipo sin problema.

**Nota histórico**: para torneos importados del histórico solo existe **una** fila de
`team` (el equipo ganador) con sus `team_member` — el resto de equipos no se registran
porque no se conocen. Además, si de ese equipo campeón se recuerda que hubo alguien
pero no quién, esa fila de `team_member` se guarda con `playerId = NULL` en vez de
inventar un jugador ficticio — así ese anillo no se le atribuye por error a nadie en
los cálculos derivados de `rings`/`individualRings`/`editionsPlayed`.

### `team_formation_pot_player` (bombos)

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid`, PK | |
| `tournamentId` | `uuid`, FK a `tournament.id`, not null | |
| `potIndex` | `integer`, not null | 0 = cabezas de serie |
| `playerId` | `uuid`, FK a `player.id`, not null | |

`unique(tournamentId, playerId)`

### `draft` (1:1, solo si se usó draft)

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid`, PK | |
| `tournamentId` | `uuid`, FK a `tournament.id`, not null, unique | |
| `method` | `text` (`'snake' \| 'linear'`), not null | |
| `captainOrderMethod` | `text` (`'ranking' \| 'ranking_inverse' \| 'random_fixed' \| 'random_total'`), not null | |
| `createdAt` | `timestamp` | |

### `draft_pick`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid`, PK | |
| `draftId` | `uuid`, FK a `draft.id`, not null | |
| `captainPlayerId` | `uuid`, FK a `player.id`, not null | |
| `potIndex` | `integer`, not null | Sin FK — validado a nivel de aplicación |
| `pickedPlayerId` | `uuid`, FK a `player.id`, not null | |
| `pickedAt` | `timestamp`, **not null** | Determina el orden — el draft no tiene histórico previo a la app, siempre se captura en directo |

`unique(draftId, pickedPlayerId)`

### `auction` (1:1, solo si se usó subasta)

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid`, PK | |
| `tournamentId` | `uuid`, FK a `tournament.id`, not null, unique | |
| `createdAt` | `timestamp` | |

### `auction_lot`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid`, PK | |
| `auctionId` | `uuid`, FK a `auction.id`, not null | |
| `potIndex` | `integer`, not null | |
| `playerId` | `uuid`, FK a `player.id`, not null | El jugador subastado |
| `soldAt` | `timestamp`, not null | Determina el orden |
| `winningCaptainPlayerId` | `uuid`, FK a `player.id`, not null | |
| `finalPrice` | `integer`, not null | |
| `wasAutoAssigned` | `boolean`, not null, default `false` | Asignado sin pujas (última opción del bombo) |

`unique(auctionId, playerId)`. Precio mínimo por bombo y presupuesto inicial de
capitanes: **no se guardan**, se derivan de la fórmula del reglamento (50/100/150…
según `potIndex`).

### `auction_bid`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid`, PK | |
| `lotId` | `uuid`, FK a `auction_lot.id`, not null | |
| `captainPlayerId` | `uuid`, FK a `player.id`, not null | |
| `amount` | `integer`, not null | |
| `bidAt` | `timestamp`, not null | Determina el orden |

## 6. Competición (fases y partidos)

### `phase`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid`, PK | |
| `tournamentId` | `uuid`, FK a `tournament.id`, not null | |
| `phaseOrder` | `integer`, not null | En suizo siempre `1` — solo hay una fase |
| `type` | `text` (`'group' \| 'bracket' \| 'swiss'`), not null | |
| `createdAt` | `timestamp` | |

`unique(tournamentId, phaseOrder)`. El número de fases del torneo se deriva contando
filas, no se guarda aparte.

**Suizo**: a diferencia de clásico (que puede tener varias fases con reglas distintas
en secuencia), suizo es una única competición continua — siempre **una sola fila** de
`phase` con `type = 'swiss'`. No existe `phase_swiss_config`: la configuración
(`eliminationLosses`, `pairingMethod`) ya vive en `tournament_swiss_config`, a nivel de
torneo. Las rondas del suizo no son filas de `phase` — son valores de
`match.roundIndex` dentro de esa única fase. La eliminación de un equipo se deriva
contando sus `match` perdidos en esa fase frente a `eliminationLosses`, no es un campo.

### `phase_group_config` (1:1, solo si `type = 'group'`)

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid`, PK | |
| `phaseId` | `uuid`, FK a `phase.id`, not null, unique | |
| `roundsFormat` | `text` (`'single' \| 'double'`), not null | Partido único vs. ida y vuelta |
| `gamesToWinMatch` | `integer`, not null | |
| `tiebreakMethod` | `text` (`'ranking_inverse' \| 'rings_inverse'`), not null | |
| `createdAt` | `timestamp` | |

### `phase_bracket_round_config` (1:N por ronda, solo si `type = 'bracket'`)

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid`, PK | |
| `phaseId` | `uuid`, FK a `phase.id`, not null | |
| `roundIndex` | `integer`, not null | Misma numeración que `match.roundIndex` |
| `gamesToWinMatch` | `integer`, not null | Puede variar por ronda (ej. final al mejor de 3, resto a partida única) |

`unique(phaseId, roundIndex)`

### `match`

Los campos específicos de grupo (`leg`) y de bracket/suizo (`roundIndex`,
`feederMatchA/BId`) se dejan **inline** en la misma tabla (no en tablas auxiliares),
a diferencia del patrón usado en el resto del modelo — `match` es de alto volumen y se
lee constantemente, así que se prioriza evitar joins sobre la limpieza de nulls.

`roundIndex` significa "ronda del cuadro" en bracket y "número de ronda suiza" en
swiss — mismo campo, distinto significado según `phase.type`. En suizo,
`feederMatchAId`/`feederMatchBId` se quedan siempre `null`: no hay árbol fijo que
alimentar, el emparejamiento de cada ronda se recalcula en vivo según la
clasificación (derrotas acumuladas), no según qué partido anterior alimenta a cuál.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid`, PK | |
| `phaseId` | `uuid`, FK a `phase.id`, not null | |
| `teamAId` | `uuid`, FK a `team.id`, nullable | Nullable en bracket hasta resolver el partido alimentador |
| `teamBId` | `uuid`, FK a `team.id`, nullable | |
| `winnerTeamId` | `uuid`, FK a `team.id`, nullable | |
| `status` | `text` (`'scheduled' \| 'in_progress' \| 'completed'`), not null, default `'scheduled'` | |
| `playedAt` | `timestamp`, nullable | |
| `leg` | `integer`, nullable | `1`/`2` — solo fase de grupo con `roundsFormat = 'double'` |
| `roundIndex` | `integer`, nullable | Solo bracket |
| `feederMatchAId` | `uuid`, FK a `match.id`, nullable | Solo bracket |
| `feederMatchBId` | `uuid`, FK a `match.id`, nullable | Solo bracket |
| `createdAt` | `timestamp` | |

El marcador del partido se deriva contando `match_game` ganadas por cada equipo frente
a `gamesToWinMatch`. La progresión del cuadro (bracket) es la propia tabla: al cerrarse
un partido, se buscan los partidos que lo tengan como `feederMatchAId`/`feederMatchBId`
y se rellena el hueco correspondiente.

### `match_game` (Partida)

Llamada `match_game` para no chocar con el catálogo `game`.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid`, PK | |
| `matchId` | `uuid`, FK a `match.id`, not null | |
| `winnerTeamId` | `uuid`, FK a `team.id`, nullable | |
| `map` | `text`, nullable | Solo si el torneo es oficial |
| `playedAt` | `timestamp`, nullable | Determina el orden cuando existe (nullable por si se introducen resultados a mano sin hora exacta) |

Sin `gameNumber` — no hace falta, `match_game` no tiene ningún caso histórico que
proteger (o hay seguimiento completo con `playedAt`, o no hay filas en absoluto).

### `match_game_player_faction`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid`, PK | |
| `matchGameId` | `uuid`, FK a `match_game.id`, not null | |
| `playerId` | `uuid`, FK a `player.id`, not null | |
| `factionId` | `uuid`, FK a `faction.id`, not null | |

`unique(matchGameId, playerId)` — solo si el torneo es oficial. Tabla libre: un
jugador que descansa esa partida simplemente no tiene fila (contempla equipos impares).

### `match_game_save_file`

Replay/partida guardada exportada del juego. Cero, una o varias filas por partida
(varios jugadores pueden subir cada uno la suya).

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid`, PK | |
| `matchGameId` | `uuid`, FK a `match_game.id`, not null | |
| `url` | `text`, not null | Ubicación en R2 |
| `fileSize` | `integer`, nullable | |
| `extractedMetadata` | `jsonb`, nullable | Lo que un futuro parser del formato de replay de BFME2 (`"BFME2RPL"`, ver investigación) consiga leer de la cabecera — duración exacta, versión, posible mapa/jugadores. Reproducir el replay en la propia web **no es viable** (formato de comandos, no de estado; requeriría el motor real del juego) |
| `uploadedByUserId` | `text`, FK a `user.id`, nullable | |
| `createdAt` | `timestamp`, not null | |

## 7. Multimedia

### `media`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid`, PK | |
| `type` | `text` (`'image' \| 'video' \| 'audio'`), not null | |
| `mimeType` | `text`, not null | |
| `url` | `text`, not null | Cloudflare R2 |
| `thumbnailUrl` | `text`, nullable | Sobre todo para vídeo |
| `caption` | `text`, nullable | Título corto |
| `description` | `text`, nullable | Markdown, texto largo |
| `width` | `integer`, nullable | |
| `height` | `integer`, nullable | |
| `durationSeconds` | `integer`, nullable | |
| `fileSize` | `integer`, nullable | |
| `takenAt` | `timestamp`, nullable | Fecha real de la toma, puede diferir de `createdAt` (fotos antiguas subidas después) |
| `uploadedByUserId` | `text`, FK a `user.id`, nullable | |
| `createdAt` | `timestamp`, not null | Fecha de subida |

### `media_association`

Asociación polimórfica con FKs reales por columna (en vez de una tabla por tipo de
entidad, o una tabla genérica sin FK) — cada fila es una única asociación.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid`, PK | |
| `mediaId` | `uuid`, FK a `media.id`, not null | |
| `editionId` | `uuid`, FK a `edition.id`, nullable | |
| `tournamentId` | `uuid`, FK a `tournament.id`, nullable | |
| `matchId` | `uuid`, FK a `match.id`, nullable | |
| `matchGameId` | `uuid`, FK a `match_game.id`, nullable | |
| `playerId` | `uuid`, FK a `player.id`, nullable | |

`CHECK (num_nonnulls(editionId, tournamentId, matchId, matchGameId, playerId) = 1)` —
exactamente una asociación por fila. Un mismo archivo con varias asociaciones (ej.
edición + partido + 3 jugadores) genera varias filas repartidas según corresponda.

### `tag` (catálogo libre, lista persistente que crece — mismo patrón que `game`)

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid`, PK | |
| `name` | `text`, not null, unique | |
| `createdAt` | `timestamp` | |

### `media_tag`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid`, PK | |
| `mediaId` | `uuid`, FK a `media.id`, not null | |
| `tagId` | `uuid`, FK a `tag.id`, not null | |

`unique(mediaId, tagId)`. Alcance solo a multimedia por ahora — si en el futuro se
quiere etiquetar otro tipo de entidad, se reutilizaría `tag` con una tabla de enlace
nueva, igual que `media_association`.

## Preguntas abiertas / ideas aparcadas

- **Walkover/incomparecencia**: no contemplado en el reglamento dado, no se ha añadido.
  Aparcado explícitamente por ahora — revisar si alguna vez ha ocurrido en la práctica.
- **Parser del formato de replay de BFME2**: investigado y confirmado viable a nivel de
  cabecera (no de reproducción completa); implementación pendiente, `extractedMetadata`
  ya preparado en el modelo para cuando se construya.
