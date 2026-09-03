# Likes y comentarios — plan de acción

**Status: las cinco fases implementadas (2026-09-03).** Alcance cerrado con
Miguel el 2026-09-03. Verificado en navegador (dev, cuenta admin vinculada
a Palons): like y lista de quién, comentario con mención y salto de línea,
edición con marca «editado», borrado con confirmación en sitio, insignias
en las miniaturas y columnas en la tabla admin. Migración **0018** aplicada
en dev; **pendiente en prod** (se aplica al promocionar, como las
anteriores). Queda un archivo de prueba en dev («Prueba de likes y
comentarios», tagged a Palons) para verlo funcionar; se borra desde la
ficha cuando sobre.

## Decisiones

- **Destinos**: el modelo y la API aceptan tres (`mediaId`, `editionId`,
  `playerId`), con el patrón de `media_association`: una columna FK por
  destino y un CHECK de exactamente una. Solo hay interfaz para archivos.
  Ediciones y jugadores tienen páginas estáticas, así que su futura UI será
  un componente cliente como `ArchiveSection`.
- **Likes**: un «me gusta» por persona y destino (índices únicos parciales
  por columna). Contador y, al tocarlo, lista de quién con medallón.
  Toggle optimista.
- **Comentarios**: lista plana, antiguos primero, texto plano con saltos de
  línea, máximo 2000 caracteres. Autor edita y borra los suyos; admin borra
  cualquiera. Sin moderación previa, sin paginación.
- **Menciones**: dentro del texto guardado como `@[Nombre](slug)`
  (`src/lib/social/mentions.ts`). El compositor muestra `@Nombre` y
  convierte al enviar; el servidor descarta las de slug inexistente
  dejándolas como texto. Sin tabla de menciones hasta que haya
  notificaciones.
- **Identidad**: jugador vinculado (nombre enlazado + retrato de la carta,
  resuelto con `cardSpecFor`); cuentas sin jugador muestran el nombre de la
  cuenta con una inicial en el medallón.
- **Permisos**: la regla del archivo (`archiveProcedure`, ahora en
  `src/server/api/archive-procedure.ts`, compartida con `media`).
- **Contadores**: `MediaItem` lleva `likeCount`, `commentCount` y
  `likedByMe` (las consultas puras reciben `viewerUserId`). Insignias en
  las miniaturas cuando hay alguno; columnas Likes y Coment. en la tabla
  admin de `/archive`.
- **Cascada**: las FK a media, edición, jugador y usuario son `ON DELETE
  CASCADE`; `media.remove` no cambia.
- **Fuera de esta versión**: notificaciones, likes en comentarios, UI en
  ediciones y jugadores, tiempo real, paginación, formato enriquecido.

## Piezas

- Esquema `src/server/db/schema/social.ts` (`like`, `comment`), relaciones,
  migración `drizzle/0018_warm_the_leader.sql`.
- Router `social` (`src/server/api/routers/social.ts`): `toggleLike`,
  `likers`, `comments`, `addComment`, `editComment`, `removeComment`.
- UI en `src/components/social/`: `AuthorMedallion`/`AuthorName`,
  `LikeButton`, `MentionComposer` (+ `useComposerBody`), `CommentThread`.
  `MediaFigure` monta el like junto a Editar/Eliminar y el hilo debajo.
- `player.list` ahora devuelve también `slug` (lo usa el autocompletado).

Cada fase cerró con `pnpm run typecheck` y `pnpm run check`; commit y
deploy siempre con confirmación previa.

## Galería: orden, filtro y búsqueda (2026-09-03)

Implementado y verificado en navegador con filas temporales (ya borradas).

- **Orden**: likes (defecto), comentarios, recientes; sentido fijo, empates
  por fecha reciente. **Tipo**: todos, fotos, vídeos, con recuento de lo
  que deja pasar el texto. **Búsqueda**: instantánea, sin acentos, todas las
  palabras deben aparecer en título, descripción, jugadores, sede o
  edición. Todo en cliente (`src/lib/media/gallery-view.ts`, funciones
  puras); el corte a servidor sería mover esas funciones a la consulta.
- **`MediaItem.venue`**: explícita o la de la edición, para la búsqueda.
- **Barra** (`GalleryToolbar`): en `/archive` siempre, con el toggle
  Galería/Tabla del admin integrado; en jugador, edición y sede a partir de
  6 archivos. Sin resultados: mensaje con «Ver todo».
- **URL solo en `/archive`**: `?sort=&type=&q=&view=table`, sin valores por
  defecto, escrita con `replaceState` (sin recarga) y leída al montar. La
  tabla es de admin: otros usuarios con `view=table` ven la galería.
- **Lightbox por id**: sigue al archivo abierto aunque un like lo reordene.
