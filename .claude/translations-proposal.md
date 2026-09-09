# Propuesta: traducciones propias de Age of the Ring (`lotr.str`)

Fecha: 2026-09-09. Estado: **implementada el 2026-09-09, sin commit; pendiente de que
Miguel la vea en el navegador y de la migración 0026 en producción**. Módulo independiente del torneo en vivo
(`live-tournament-plan.md`); no toca nada de lo que hay en curso.

## 1. Qué es y para qué

AotR lee todos sus textos de `aotr/data/lotr.str`. La comunidad hispana
mantiene una traducción (Galcano11, ModDB) que se sustituye por el original.
Queremos:

1. Subir desde el navegador los ficheros original (inglés) y traducido
   (español) de cada versión del juego y guardarlos en la base de datos.
2. Mantener **nuestras propias cadenas** para algunas claves, persistentes
   entre versiones.
3. Al subir una versión nueva, **saber qué originales cambiaron** para
   revisar las cadenas propias afectadas.
4. **Exportar** un `lotr.str` listo para el juego: la última traducción
   española con nuestras cadenas por encima y, si faltan claves, el último
   inglés para rellenar.

## 2. El formato, verificado con los ficheros de la 9.3.3

Ficheros analizados: `~/Downloads/lotr original.str` (original 9.3.3, 2,78 MB)
y `~/Downloads/lotr.str` (español 9.3.3 de Galcano11, 3,03 MB).

- **Texto plano, Windows-1252, CRLF.** No es UTF-8: aparece `…` como 0x85,
  que solo existe en cp1252. Al exportar hay que volver a cp1252; los
  caracteres que no quepan se avisan antes de descargar.
- **Bloques**:

  ```
  CATEGORIA:Nombre
  "texto del juego\ncon saltos como \n literal y &atajo"
  END
  ```

  `END` también aparece como `End`. Comentarios `//` antes de los bloques y
  también **dentro** (2.960 bloques llevan `// context: …` entre la clave y
  el valor). Trece bloques tienen líneas en blanco dentro. El fichero acaba
  con un `END` suelto tras un comentario. Un bloque tiene texto tras la
  comilla de cierre (`"..."  ;\nwhile Gorbag…`): se conserva tal cual.
- **Tamaño**: 23.748 bloques, 23.556 claves únicas, 77 categorías
  (CONTROLBAR 10.879, OBJECT 2.624, SCRIPT 1.610…). 3.380 valores llevan
  `&` de atajo; 16.434 llevan `\n`.
- **Claves repetidas**: 188, de las que 38 tienen valores distintos. Las
  herramientas de la comunidad (dotstr_edit) asumen que **gana la última**.
  Además hay 10 pares que solo difieren en mayúsculas
  (`LW:DisplayNameSeaOfNurnen` / `LW:DisplayNameSeaofNurnen`).
- **Original vs español (misma versión)**: 21.929 claves traducidas, 1.627
  idénticas al inglés (letras, atajos, nombres propios). Mismo orden de
  bloques salvo uno. El español tiene **una clave corrupta**
  (`CONTROLBAR:ToolTipConstructMirkwoodCaveEntr|`), así que ese tooltip
  sale como MISSING en el juego. La herramienta lo detectará sola.
- Parser: unas decenas de líneas propias en `src/lib/translations/str.ts`,
  sin dependencias. Se prueba con los dos ficheros reales.

## 3. Roles: `translator` y varios roles por cuenta

better-auth ya guarda **varios roles en la misma columna** `user.role`
separados por comas (`"editor,translator"`); su `hasPermission` hace
`role.split(',')`. No hace falta cambiar el esquema ni migrar datos.

Lo que sí cambia:

- `src/lib/roles.ts`: `rolesOf(user)`, `hasRole(user, 'admin')`,
  `isAdmin(user)`, `canModerate(user)` (admin o editor),
  `canTranslate(user)` (admin o translator).
- Los ~35 sitios con `role === 'admin'` / `role === 'editor'` pasan a usar
  esos helpers (routers `match`, `media`, `social`, `player`, `live`,
  `media/access.ts`, `trpc.ts`, componentes de live, media, ediciones,
  `user-menu`). Comportamiento idéntico para quien tenga un solo rol.
- `player.setUserRole` acepta una lista; el selector de `/admin/players`
  pasa a casillas (Editor, Traductor, Admin). Admin sigue sin poder
  quitarse a sí mismo el admin.
- `translatorProcedure` en `trpc.ts` junto a `adminProcedure`.
- El menú de usuario muestra "Traducciones" a admin y translator.

## 4. Modelo de datos (tres tablas, `createTable`)

```
str_file
  id, game_version_id → game_version, language ('en' | 'es'),
  source (texto libre: "oficial", "Galcano11"), uploaded_by → user,
  uploaded_at, entry_count, sha256, r2_key (fichero íntegro en R2),
  header (primeras líneas de comentario)
  unique (game_version_id, language)   ← resubir sustituye

str_entry
  id, file_id → str_file, seq (posición), key, value (línea(s) de valor
  tal cual, con comillas y escapes), comment (texto de los `//` del bloque)
  index (file_id, key)                 ← ~24.000 filas por fichero

custom_string
  key (única), value (nuestro texto, sin comillas), note,
  base_en_file_id, base_en_value  ← el original sobre el que se escribió
  base_es_value                   ← el español que se estaba corrigiendo
  status ('ok' | 'review'), created_by, updated_by, updated_at
```

Versión: enlazada a `game_version` del catálogo (la misma tabla de la wiki
y los torneos). El formulario de subida permite crear una versión nueva de
AotR ahí mismo, como hace el admin de juegos.

El fichero íntegro va a R2 (bucket compartido dev/prod, cliente en
`src/server/storage/r2.ts`) bajo `translations/<version>/<lang>.str`. Es lo
que permite exportar **byte a byte** salvo las líneas cambiadas. Las filas
de `str_entry` sirven para buscar, comparar y detectar cambios sin bajar el
fichero.

Sin tabla de historial de cadenas propias por ahora: `updated_by` y
`updated_at` bastan. Se añade si hace falta.

## 5. Flujos

### Subir un fichero

`/translations/upload`. Idioma, versión (desplegable + "nueva versión"),
origen. El navegador lee el fichero como bytes y lo manda a un route
handler (`POST /api/translations/upload`, FormData; tRPC no está pensado
para 3 MB de cuerpo). El servidor: decodifica cp1252, parsea, sube el
original a R2, borra e inserta las entradas por lotes de 2.000, guarda la
fila de `str_file` y devuelve un **informe**:

- bloques totales, claves únicas, categorías;
- claves repetidas con valores distintos;
- claves sospechosas (caracteres raros, sin `:`), bloques sin cerrar,
  valores sin comillas;
- si ya existía un fichero anterior del mismo idioma: claves nuevas,
  eliminadas y cambiadas respecto a él;
- si es inglés: **cadenas propias cuyo `base_en_value` ya no coincide**,
  que pasan a `status = 'review'` en ese momento.

### Comparar

`/translations/compare`. Dos ficheros del mismo idioma (versión A y B):
nuevas, eliminadas, cambiadas, con diff palabra a palabra. O inglés y
español de la misma versión: sin traducir (idénticas), faltantes en
español (MISSING en el juego), extra en español. Filtro por categoría y
búsqueda por clave o texto. Paginado en servidor (nunca 24.000 filas en
el cliente).

### Editor de cadenas propias

`/translations`. Tabla con buscador por clave o texto, filtro por
categoría y por estado. Cada fila: clave, **inglés (último fichero)**,
**español (último fichero)**, **nuestra cadena**. Al abrir una fila:

- las tres columnas completas con `\n` renderizado como salto y `&`
  resaltado como atajo;
- editor de nuestra cadena con vista previa igual;
- avisos: atajo `&` perdido o cambiado respecto al español, `%d`/`%s`
  que faltan, caracteres fuera de cp1252, longitud muy distinta;
- si está en revisión: **el inglés de la línea base contra el inglés
  actual**, resaltando lo que cambió, y botones "Sigue valiendo" (actualiza
  la línea base) o guardar el texto nuevo (también la actualiza).

Se puede crear una cadena propia desde el comparador o desde cualquier
fila del editor. Borrar una cadena propia vuelve a lo que diga la
traducción de la comunidad.

### Exportar

`/translations/export`. Elige el español base (por defecto el de la
versión más reciente) y, opcionalmente, el inglés de relleno (por defecto
el más reciente). Muestra un resumen antes de descargar: cadenas propias
aplicadas, claves rellenadas desde el inglés, cadenas en revisión (avisa,
no bloquea), caracteres no representables. La descarga va por
`GET /api/translations/export?es=<fileId>&en=<fileId>`:

1. Lee el español íntegro de R2.
2. Recorre los bloques; donde la clave tenga cadena propia, sustituye
   **solo la línea de valor**. Si la clave está repetida, se sustituyen
   todas las apariciones (el juego se queda con la última).
3. Al final, antes del `END` suelto, añade una sección comentada
   `// Frikiparty: claves de <versión inglés> ausentes en esta traducción`
   con los bloques que existen en el inglés y no en el español, con el
   texto inglés (o el nuestro, si lo hay).
4. Añade una cabecera de comentario con fecha, versión base y número de
   cadenas propias. Codifica en cp1252 con CRLF. Nombre de descarga
   `lotr.str`.

## 6. Dónde vive en el código

- `src/lib/translations/str.ts`: parser y serializador puros (sin DB),
  con tests sobre los dos ficheros reales.
- `src/lib/roles.ts`: helpers de rol.
- `src/server/db/schema/translations.ts` + migración `0026`.
- `src/server/api/routers/translations.ts`: `files`, `compare`,
  `customs`, `saveCustom`, `deleteCustom`, `confirmCustom`,
  `exportPreview`. `translatorProcedure`.
- `src/app/api/translations/upload/route.ts` y `export/route.ts`.
- `src/app/translations/…` (páginas) y `src/components/translations/…`.
  Misma estética que el resto (primitives, panel, btn); Tailwind.

## 7. Orden de trabajo (pasos pequeños y verificables) — todos hechos

1. Parser + serializador con tests sobre los ficheros reales.
2. Roles: helpers, refactor de comprobaciones, selector multirol,
   `translatorProcedure`. Build y typecheck.
3. Esquema + migración + subida con informe. Subir los dos 9.3.3.
4. Comparador.
5. Editor de cadenas propias con revisión.
6. Exportación y prueba en el juego con el fichero generado.

Producción necesita la migración `0026` antes del despliegue
(`pnpm run db:migrate:prod`, lo lanza Miguel).

Verificado el 2026-09-09: `pnpm run test` (node:test vía tsx, 15 tests, con
los dos ficheros reales en `.str-samples/`, ignorados por git), typecheck,
Biome y `SKIP_ENV_VALIDATION=1 pnpm run build`. Importación y exportación
probadas contra la base de desarrollo con los ficheros de la 9.3.3 (los dos
quedan subidos): ~4 s por fichero, exportación de 3,03 MB idéntica al
español salvo la cabecera y la clave rellenada desde el inglés. Todas las
procedures del router probadas con `createCaller`. **La interfaz no se ha
visto en el navegador**: el Chrome automatizado no tiene sesión en la web y
el puerto 3000 lo ocupa otro proyecto (BasketGM).

Pendiente: asignar el rol Traductor en /admin/players a quien toque (el
selector ya admite varios roles por cuenta); `exportSummary` tarda ~4 s
porque carga los dos ficheros enteros, aceptable por ahora.

## 8. Supuestos que se han tomado

- El rol `translator` da acceso completo al módulo: subir, editar,
  exportar. **El admin siempre ve todo** lo que ve el traductor. Nadie más
  lo ve.
- Solo AotR por ahora. La tabla enlaza a `game_version`, así que BotME
  cabría sin cambios si algún día hace falta.
- Una cadena propia por clave, global. Las claves repetidas del fichero
  se tratan como una sola.
- Resubir un fichero de la misma versión e idioma lo sustituye entero,
  **previa confirmación** en el formulario (se avisa de que ya existe).
- Sin historial de cambios de cadenas propias en la primera versión.

## 9. Fuentes

- Traducción española en ModDB:
  `moddb.com/mods/the-horse-lords-a-total-modification-for-bfme/downloads/age-of-the-ring-al-espaol`
- Instalación (el fichero va en `aotr/data`): `laterredumilieu.fr/mods/aotr`
- dotstr_edit (parser de la comunidad; latin-1, gana la última clave):
  `github.com/silvasur/dotstr_edit`
- Guía de MAP.STR: `bfme2.heavengames.com/worldbuilder/displaying_text/`
- better-auth admin plugin, roles múltiples separados por coma:
  `better-auth.com/docs/plugins/admin`
