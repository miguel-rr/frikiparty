# Multimedia ("Los Archivos") — plan de acción

**Status: las cinco fases implementadas (2026-09-02).** Alcance y
decisiones cerradas con Miguel el 2026-09-02. Verificado en navegador:
subida de foto (renditions + orientación EXIF), subida de vídeo, galerías
en jugador/edición/sede, lightbox, `/archive/<id>`, `/archive` con tabla,
edición y borrado (también en R2). **Sin verificar**: captura del póster en el navegador (la pestaña
automatizada no carga medios); probar desde móvil en preview. `next.config.js` lleva
`serverExternalPackages: ['ffmpeg-static']` y `outputFileTracingIncludes`
para que el binario viaje a Vercel (verificado en dev: el paso en segundo
plano desde la interfaz termina con póster y `playback.mp4`). Pendiente
comprobar en la preview que el binario llegó. Migraciones 0015 y 0016
pendientes en prod. El selector de partido no está en el formulario (solo 7 partidos
en toda la historia); el modelo lo soporta para el modo torneo en vivo. Bucket `frikiparty-media`
verificado (put, presigned put, lectura pública, borrado); variables en
`.env` y en Vercel (prod/preview/dev). Migración 0015 aplicada en dev.
**`media.frikiparty.com` descartado (2026-09-03)**: Cloudflare solo
conecta un dominio propio a R2 si la zona vive en su cuenta, y Miguel no
quiere mover los nameservers de `frikiparty.com` fuera de Vercel. El
archivo se sirve desde `r2.dev` de forma definitiva; a esta escala el
rate limit y la falta de caché no importan. No volver a proponerlo. Si
algún día hiciera falta, la vía sería un segundo dominio gestionado en
Cloudflare, nunca un proxy por Vercel (ancho de banda).
Complementa la sección 7 de `data-model.md`; donde difieren, manda este doc.

## Decisiones

- **Contenido**: fotos y clips de vídeo de móvil. El original se guarda
  siempre. Tras catalogar, un paso en segundo plano (`next/server` `after`)
  con `ffmpeg-static` saca el póster si el navegador no lo capturó, lee
  dimensiones y duración, y **solo si el códec/contenedor no se reproduce en
  todas partes** (HEVC, .mov…) genera `playback.mp4` (720p H.264 + AAC,
  faststart) que la ficha usa en lugar del original. Límite: 400 MB y
  200 s de conversión (Hobby corta a 300 s); si falla queda
  `playbackStatus = 'failed'` y el admin puede "Reintentar conversión".
  Plan B si se acumulan fallos: Cloudflare Stream.
- **Almacenamiento**: Cloudflare R2, bucket público, claves con uuid para que
  la URL no sea adivinable (`media/<uuid>/original.<ext>`, `thumb.webp`,
  `display.webp`, y para vídeo `poster.jpg`). Se sirve desde el subdominio
  `r2.dev` gratuito; el dominio público vive en `R2_PUBLIC_URL`, así que
  pasar a `media.frikiparty.com` (DNS a Cloudflare) no toca datos.
- **En DB se guarda la clave, no la URL** (`storageKey`, `thumbnailKey`,
  `displayKey`); la URL se deriva.
- **Subida directa navegador → R2** con URL prefirmada (Vercel no ve el
  archivo, sin límite de tamaño). Al terminar, `media.finalize` descarga el
  original, genera con `sharp` miniatura y versión de pantalla (1600 px webp)
  y crea la fila. Para vídeo el navegador captura un fotograma como póster.
- **Quién sube**: usuario logueado vinculado a un jugador, o con rol
  `editor` (nuevo tercer valor de `user.role`), o `admin`.
- **Vinculación usuario ↔ jugador por código**: `player.linkCode` único,
  generado por un admin desde `/admin/players`. El usuario lo introduce en
  "Vincular jugador" (menú de usuario, junto a Salir); la opción desaparece
  al vincularse.
- **Formulario de subida** desde la página de jugador y la de edición,
  pensado para móvil, multi-archivo con progreso. Validación estricta:
  mínimo un jugador. Edición precargada desde su página y muy sugerida;
  torneo y partido opcionales en cascada; título opcional. Sede no se
  selecciona, se deriva de la edición.
- **Asociaciones**: se añade `venueId` a `media_association` (CHECK ampliado).
  Las galerías derivan en vez de duplicar: edición = explícito ∪ sus
  torneos/partidos/partidas; sede = explícito ∪ ediciones celebradas allí.
- **Permisos de edición**: quien subió puede cambiar título y asociaciones
  (y etiquetas cuando tengan UI); el resto solo admin. Borrado: quien subió o
  admin, y borra también en R2. Sin moderación.
- **Acceso**: todo lo del archivo (galerías, `/archive/<id>`, `/archive`,
  API) exige sesión con acceso: admin, editor o cuenta vinculada a un
  jugador. Anónimos no ven ni el bloque. Como las páginas de jugador,
  edición y sede son estáticas, `ArchiveSection` es cliente: resuelve
  `media.access` y solo entonces pide `media.gallery`; las rutas `/archive`
  son dinámicas y comprueban la sesión en servidor (404 si no).
- **Galería** al final de las páginas de edición, jugador y sede: mosaico +
  lightbox con anterior/siguiente. Cada archivo tiene URL en `/archive/<id>`.
- **/archive, "Los Archivos"**: galería completa con vista de tabla para
  admins (thumbnail + datos clave). Solo admins de momento, flag en
  `site-flags.ts` para abrirla más adelante. Nada en la home.
- **Fuera de esta versión**: etiquetas libres (tabla queda sin UI), fecha de
  toma (se ordena por subida), replays, comentarios/likes, descarga masiva,
  transcodificación, foto real de jugador (el retrato pintado se queda),
  importación masiva (no debe condicionar la UX).

## Fases

1. **Cloudflare y entorno** — cuenta, R2, bucket, CORS, token API; variables
   `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
   `R2_BUCKET_NAME`, `R2_PUBLIC_URL` en `env.js`, `.env.example`, `.env` y
   Vercel. Deps: `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`,
   `sharp`.
2. **Roles y vinculación** — migración (`editor`, `player.linkCode`,
   `media_association.venueId`, claves en `media`), `/admin/players`, opción
   "Vincular jugador" y entrada admin en el menú de usuario.
3. **Subida** — router `media` (presign, finalize, permisos), miniaturas,
   formulario móvil en jugador y edición.
4. **Galerías y lightbox** — componente de galería en las tres páginas,
   `/archive/<id>`.
5. **Los Archivos** — `/archive` con galería, tabla admin, edición y borrado.

Cada fase cierra con `pnpm run typecheck` y `pnpm run check`; commit y
deploy siempre con confirmación previa.

## Login (2026-09-03)

Solo social: Google y Microsoft (tenant `common`: Outlook/Hotmail/Live y
cuentas de trabajo). Contraseña desactivada, GitHub configurado pero sin
botón. Ambos proveedores son de confianza para la vinculación por correo (un
correo, un usuario). El botón de Microsoft solo aparece con sus dos
variables; el **secreto de Azure caduca en septiembre de 2028** (24 meses):
regenerarlo en Azure > App registrations > Frikiparty > Certificates &
secrets y actualizar `BETTER_AUTH_MICROSOFT_CLIENT_SECRET` en Vercel.
