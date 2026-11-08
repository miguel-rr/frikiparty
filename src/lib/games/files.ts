import type { GameFileCategory } from '@/server/db/schema/game-file';

/** Every file travels in parts of this size (R2 wants them all equal but the last). */
const GAME_FILE_PART_SIZE = 64 * 1024 * 1024;

const GAME_FILE_MAX_BYTES = 10 * 1024 * 1024 * 1024;

/** In display order, which is also the order of the groups on the page. */
const GAME_FILE_CATEGORY_LABELS: Record<GameFileCategory, string> = {
  installer: 'Instalables',
  patch: 'Parches',
  map: 'Mapas',
  mod: 'Mods',
  tool: 'Herramientas',
  other: 'Otros',
};

/** The singular, for the upload form's picker. */
const GAME_FILE_CATEGORY_SINGULAR: Record<GameFileCategory, string> = {
  installer: 'Instalable',
  patch: 'Parche',
  map: 'Mapa',
  mod: 'Mod',
  tool: 'Herramienta',
  other: 'Otro',
};

const GAME_FILE_CATEGORY_ORDER = Object.keys(
  GAME_FILE_CATEGORY_LABELS,
) as GameFileCategory[];

/** "3.2 GB" / "48.5 MB" / "640 KB". */
const formatBytes = (bytes: number) => {
  if (bytes >= 1024 ** 3) {
    return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  }
  if (bytes >= 1024 ** 2) {
    return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

/** "AotR 10.0 Installer" from "AotR 10.0 Installer.exe": the title a file gets when none is typed. */
const titleFromFileName = (fileName: string) =>
  fileName.replace(/\.[^.]+$/, '').trim() || fileName;

const gameFilePartCount = (fileSize: number) =>
  Math.max(1, Math.ceil(fileSize / GAME_FILE_PART_SIZE));

export {
  formatBytes,
  GAME_FILE_CATEGORY_LABELS,
  GAME_FILE_CATEGORY_ORDER,
  GAME_FILE_CATEGORY_SINGULAR,
  GAME_FILE_MAX_BYTES,
  GAME_FILE_PART_SIZE,
  gameFilePartCount,
  titleFromFileName,
};
