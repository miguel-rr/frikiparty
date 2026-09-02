# Multimedia ("Los Archivos") — plan de acción

**Status: fases 1 y 2 hechas (2026-09-02), fase 3 en curso.** Alcance y
decisiones cerradas con Miguel el 2026-09-02. Bucket `frikiparty-media`
verificado (put, presigned put, lectura pública, borrado); variables en
`.env` y en Vercel (prod/preview/dev). Migración 0015 aplicada en dev.
Pendiente: `media.frikiparty.com` (mover DNS de Vercel a Cloudflare) y
aplicar 0015 en prod al promocionar.
Complementa la sección 7 de `data-model.md`; donde difieren, manda este doc.

## Decisiones

- **Contenido**: fotos y clips de vídeo de móvil. Los vídeos se suben tal cual
  y se reproducen con `<video>` nativo, sin transcodificar (riesgo asumido:
  HEVC de iPhone puede no reproducirse en Chrome/Android/Windows).
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
