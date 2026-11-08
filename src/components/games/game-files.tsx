'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';

import {
  type Progress,
  UploadCancelled,
  uploadParts,
} from '@/components/games/multipart-upload';
import { btn, input, label, panel } from '@/components/theme/primitives';
import {
  formatBytes,
  GAME_FILE_CATEGORY_LABELS,
  GAME_FILE_CATEGORY_ORDER,
  GAME_FILE_CATEGORY_SINGULAR,
  GAME_FILE_MAX_BYTES,
  titleFromFileName,
} from '@/lib/games/files';
import type { GameFileCategory } from '@/server/db/schema/game-file';
import type { GameFileRow } from '@/server/games/files';
import { api } from '@/trpc/react';

type Option = { id: string; name: string };

type GameFilesProps = {
  gameId: string;
  slug: string;
  files: GameFileRow[];
  versions: Option[];
  maps: Option[];
  /** Preselected in the upload form: the page's version, or the latest. */
  defaultVersionId: string | null;
  viewerId: string;
  canModerate: boolean;
  /** Version page: says the list is that version's plus the generic ones. */
  versionLabel?: string;
};

type Placement = {
  category: GameFileCategory;
  title: string;
  description: string;
  gameVersionId: string;
  gameMapId: string;
};

const select = `${input} appearance-none`;

const formatDate = (value: Date | string) =>
  new Date(value).toLocaleDateString('es-ES', { dateStyle: 'medium' });

const formatDuration = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '';
  }
  if (seconds < 60) {
    return `${Math.ceil(seconds)} s`;
  }
  if (seconds < 3600) {
    return `${Math.ceil(seconds / 60)} min`;
  }
  return `${Math.floor(seconds / 3600)} h ${Math.ceil((seconds % 3600) / 60)} min`;
};

const toInput = (placement: Placement) => ({
  category: placement.category,
  title: placement.title.trim() || null,
  description: placement.description.trim() || null,
  gameVersionId: placement.gameVersionId || null,
  gameMapId: placement.category === 'map' ? placement.gameMapId || null : null,
});

/**
 * The game's downloads, grouped by kind, with the upload button and,
 * on each row, edit and delete for its uploader and the moderators.
 */
const GameFiles = (props: GameFilesProps) => {
  const { files, versionLabel } = props;
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState<GameFileRow | null>(null);
  const groups = GAME_FILE_CATEGORY_ORDER.map((category) => ({
    category,
    items: files.filter((file) => file.category === category),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="d-display font-bold text-(--parchment) text-xl uppercase">
          Ficheros
        </h3>
        <button
          className={`${btn.secondary} px-5 py-2 text-sm`}
          onClick={() => setUploading(true)}
          type="button"
        >
          Subir fichero
        </button>
      </div>
      {versionLabel ? (
        <p className="text-(--faded) text-xs">
          Los de la versión {versionLabel} y los que valen para cualquiera.
        </p>
      ) : null}
      {groups.length === 0 ? (
        <p className="text-(--faded) text-sm">
          Todavía no hay nada. Mapas, instalables, parches: lo que subáis queda
          aquí para todos.
        </p>
      ) : (
        groups.map((group) => (
          <div className="flex flex-col gap-2" key={group.category}>
            <span className="font-bold font-mono text-(--gold) text-2xs uppercase tracking-4xl">
              {GAME_FILE_CATEGORY_LABELS[group.category]}
            </span>
            <ul className="flex flex-col gap-2">
              {group.items.map((file) => (
                <FileRow
                  canEdit={
                    props.canModerate ||
                    file.uploadedByUserId === props.viewerId
                  }
                  file={file}
                  key={file.id}
                  onEdit={() => setEditing(file)}
                  slug={props.slug}
                />
              ))}
            </ul>
          </div>
        ))
      )}
      {uploading ? (
        <FileDialog {...props} onClose={() => setUploading(false)} />
      ) : null}
      {editing ? (
        <FileDialog
          {...props}
          editing={editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </div>
  );
};

const FileRow = ({
  file,
  slug,
  canEdit,
  onEdit,
}: {
  file: GameFileRow;
  slug: string;
  canEdit: boolean;
  onEdit: () => void;
}) => {
  const router = useRouter();
  const remove = api.gameFiles.remove.useMutation({
    onSuccess: () => router.refresh(),
  });
  const confirmRemove = () => {
    if (window.confirm(`¿Borrar «${file.title}»? No se puede deshacer.`)) {
      remove.mutate({ id: file.id });
    }
  };
  const meta = [
    file.version ? `v${file.version}` : 'Cualquier versión',
    file.mapName,
    formatBytes(file.fileSize),
    file.uploadedBy ? `subido por ${file.uploadedBy}` : null,
    formatDate(file.createdAt),
    `${file.downloadCount} ${file.downloadCount === 1 ? 'descarga' : 'descargas'}`,
  ].filter(Boolean);

  return (
    <li
      className={`${panel} flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between`}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <span className="d-display font-bold text-(--parchment) text-base">
          {file.title}
        </span>
        <span className="font-mono text-(--faded) text-2xs uppercase tracking-wider">
          {meta.join(' · ')}
        </span>
        <span className="truncate text-(--faded) text-xs">{file.fileName}</span>
        {file.description ? (
          <p className="whitespace-pre-line text-(--faded) text-sm">
            {file.description}
          </p>
        ) : null}
        {remove.error ? (
          <span className="text-(--ember) text-xs">{remove.error.message}</span>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {canEdit ? (
          <>
            <button
              className={btn.ghost}
              disabled={remove.isPending}
              onClick={onEdit}
              type="button"
            >
              Editar
            </button>
            <button
              className={btn.ghost}
              disabled={remove.isPending}
              onClick={confirmRemove}
              type="button"
            >
              {remove.isPending ? 'Borrando…' : 'Borrar'}
            </button>
          </>
        ) : null}
        <a
          className={btn.primary}
          download
          href={`/games/${slug}/files/${file.id}`}
        >
          Descargar
        </a>
      </div>
    </li>
  );
};

type UploadState =
  | { status: 'idle' }
  | { status: 'uploading'; progress: Progress; startedAt: number }
  | { status: 'finishing' }
  | { status: 'error'; message: string };

/** Upload (no `editing`) or edit (with it): the same form, the file picker only for a new one. */
const FileDialog = ({
  gameId,
  versions,
  maps,
  defaultVersionId,
  editing,
  onClose,
}: GameFilesProps & { editing?: GameFileRow; onClose: () => void }) => {
  const router = useRouter();
  const start = api.gameFiles.start.useMutation();
  const complete = api.gameFiles.complete.useMutation();
  const abort = api.gameFiles.abort.useMutation();
  const update = api.gameFiles.update.useMutation();
  const fieldId = useId();

  const [file, setFile] = useState<File | null>(null);
  const [placement, setPlacement] = useState<Placement>(() => ({
    category: editing?.category ?? 'map',
    title: editing?.title ?? '',
    description: editing?.description ?? '',
    gameVersionId: editing
      ? (editing.gameVersionId ?? '')
      : (defaultVersionId ?? ''),
    gameMapId: editing?.gameMapId ?? '',
  }));
  const [state, setState] = useState<UploadState>({ status: 'idle' });
  const controllerRef = useRef<AbortController | null>(null);
  const busy = state.status === 'uploading' || state.status === 'finishing';
  const busyRef = useRef(busy);
  busyRef.current = busy;
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busyRef.current) {
        closeRef.current();
      }
    };
    // Closing the tab mid-upload loses it: the browser asks first.
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (busyRef.current) {
        event.preventDefault();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('beforeunload', onBeforeUnload);
      controllerRef.current?.abort();
    };
  }, []);

  const patch = (changes: Partial<Placement>) =>
    setPlacement((current) => ({ ...current, ...changes }));

  const tooBig = file !== null && file.size > GAME_FILE_MAX_BYTES;

  const send = async () => {
    if (!file) {
      return;
    }
    const controller = new AbortController();
    controllerRef.current = controller;
    const startedAt = Date.now();
    setState({
      status: 'uploading',
      progress: { loaded: 0, total: file.size },
      startedAt,
    });
    let ref: { id: string; uploadId: string; fileName: string } | null = null;
    try {
      const signed = await start.mutateAsync({
        gameId,
        fileName: file.name,
        fileSize: file.size,
      });
      ref = { id: signed.id, uploadId: signed.uploadId, fileName: file.name };
      await uploadParts({
        file,
        partSize: signed.partSize,
        partUrls: signed.partUrls,
        signal: controller.signal,
        onProgress: (progress) =>
          setState({ status: 'uploading', progress, startedAt }),
      });
      setState({ status: 'finishing' });
      await complete.mutateAsync({
        ...ref,
        gameId,
        mimeType: file.type || null,
        placement: toInput(placement),
      });
      router.refresh();
      onClose();
    } catch (error) {
      if (ref) {
        abort.mutate(ref);
      }
      if (error instanceof UploadCancelled) {
        setState({ status: 'idle' });
        return;
      }
      setState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Error desconocido.',
      });
    }
  };

  const save = async () => {
    if (!editing) {
      return;
    }
    setState({ status: 'finishing' });
    try {
      await update.mutateAsync({ id: editing.id, ...toInput(placement) });
      router.refresh();
      onClose();
    } catch (error) {
      setState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Error desconocido.',
      });
    }
  };

  const canSubmit = editing ? !busy : !busy && file !== null && !tooBig;

  return (
    <div
      aria-modal
      className="fixed inset-0 z-100 flex items-end justify-center bg-[#05080699] backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
    >
      <div className="d-scape flex max-h-dvh w-full max-w-2xl flex-col rounded-t-2xl border border-(--hair-gold) shadow-[0_-10px_40px_#000000a6] sm:max-h-[90vh] sm:rounded-2xl">
        <header className="flex items-center justify-between gap-4 border-(--hair) border-b px-5 py-4">
          <div>
            <p className="font-bold font-mono text-(--gold) text-2xs uppercase tracking-4xl">
              Ficheros del juego
            </p>
            <h2 className="d-display font-bold text-(--parchment) text-xl uppercase">
              {editing ? 'Editar fichero' : 'Subir fichero'}
            </h2>
          </div>
          <button
            aria-label="Cerrar"
            className="grid size-9 cursor-pointer place-items-center rounded-full border border-(--hair) text-(--faded) transition-colors hover:border-(--hair-gold) hover:text-(--gold-hi) disabled:cursor-not-allowed disabled:opacity-45"
            disabled={busy}
            onClick={onClose}
            type="button"
          >
            ✕
          </button>
        </header>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">
          {editing ? (
            <p className="truncate text-(--faded) text-sm">
              {editing.fileName} · {formatBytes(editing.fileSize)}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              <input
                className="sr-only"
                disabled={busy}
                id={`${fieldId}-file`}
                onChange={(event) => {
                  const picked = event.target.files?.[0] ?? null;
                  event.target.value = '';
                  setFile(picked);
                  setState({ status: 'idle' });
                }}
                type="file"
              />
              {busy ? null : (
                <label
                  className={`${btn.primary} w-full cursor-pointer sm:w-auto`}
                  htmlFor={`${fieldId}-file`}
                >
                  {file ? 'Cambiar fichero' : 'Elegir fichero'}
                </label>
              )}
              {file ? (
                <span className="truncate text-(--parchment) text-sm">
                  {file.name} · {formatBytes(file.size)}
                </span>
              ) : (
                <span className="text-(--faded) text-sm">
                  Cualquier tipo de fichero, hasta 10 GB.
                </span>
              )}
              {tooBig ? (
                <p className="text-(--ember) text-xs">
                  Pasa de 10 GB: no se puede subir.
                </p>
              ) : null}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col">
              <label className={label} htmlFor={`${fieldId}-category`}>
                Tipo
              </label>
              <select
                className={select}
                disabled={busy}
                id={`${fieldId}-category`}
                onChange={(event) =>
                  patch({ category: event.target.value as GameFileCategory })
                }
                value={placement.category}
              >
                {GAME_FILE_CATEGORY_ORDER.map((category) => (
                  <option key={category} value={category}>
                    {GAME_FILE_CATEGORY_SINGULAR[category]}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col">
              <label className={label} htmlFor={`${fieldId}-version`}>
                Versión
              </label>
              <select
                className={select}
                disabled={busy}
                id={`${fieldId}-version`}
                onChange={(event) =>
                  patch({ gameVersionId: event.target.value })
                }
                value={placement.gameVersionId}
              >
                <option value="">Cualquier versión</option>
                {versions.map((version) => (
                  <option key={version.id} value={version.id}>
                    {version.name}
                  </option>
                ))}
              </select>
            </div>
            {placement.category === 'map' && maps.length > 0 ? (
              <div className="flex flex-col sm:col-span-2">
                <label className={label} htmlFor={`${fieldId}-map`}>
                  Mapa del catálogo
                </label>
                <select
                  className={select}
                  disabled={busy}
                  id={`${fieldId}-map`}
                  onChange={(event) => patch({ gameMapId: event.target.value })}
                  value={placement.gameMapId}
                >
                  <option value="">No está en el catálogo</option>
                  {maps.map((map) => (
                    <option key={map.id} value={map.id}>
                      {map.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col">
            <label className={label} htmlFor={`${fieldId}-title`}>
              Título
            </label>
            <input
              className={input}
              disabled={busy}
              id={`${fieldId}-title`}
              maxLength={200}
              onChange={(event) => patch({ title: event.target.value })}
              placeholder={
                file ? titleFromFileName(file.name) : 'El nombre del fichero'
              }
              value={placement.title}
            />
          </div>
          <div className="flex flex-col">
            <label className={label} htmlFor={`${fieldId}-description`}>
              Descripción
            </label>
            <textarea
              className={`${input} min-h-24`}
              disabled={busy}
              id={`${fieldId}-description`}
              maxLength={4000}
              onChange={(event) => patch({ description: event.target.value })}
              placeholder="Cómo se instala, qué cambia, para qué sirve… (opcional)"
              value={placement.description}
            />
          </div>

          <UploadStatus state={state} />
        </div>

        <footer className="flex flex-col gap-3 border-(--hair) border-t px-5 py-4 sm:flex-row sm:items-center sm:justify-end">
          {state.status === 'uploading' ? (
            <button
              className={btn.danger}
              onClick={() => controllerRef.current?.abort()}
              type="button"
            >
              Cancelar subida
            </button>
          ) : null}
          <button
            className={`${btn.primary} disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none disabled:saturate-50`}
            disabled={!canSubmit}
            onClick={editing ? save : send}
            type="button"
          >
            {editing
              ? busy
                ? 'Guardando…'
                : 'Guardar'
              : busy
                ? 'Subiendo…'
                : 'Subir'}
          </button>
        </footer>
      </div>
    </div>
  );
};

const UploadStatus = ({ state }: { state: UploadState }) => {
  if (state.status === 'error') {
    return <p className="text-(--ember) text-sm">{state.message}</p>;
  }
  if (state.status === 'finishing') {
    return <p className="text-(--gold) text-sm">Guardando…</p>;
  }
  if (state.status !== 'uploading') {
    return null;
  }
  const { loaded, total } = state.progress;
  const fraction = total > 0 ? loaded / total : 0;
  const elapsed = (Date.now() - state.startedAt) / 1000;
  const speed = elapsed > 1 ? loaded / elapsed : 0;
  const remaining = speed > 0 ? (total - loaded) / speed : 0;
  return (
    <div className="flex flex-col gap-2" role="status">
      <div className="h-2 w-full overflow-hidden rounded-full bg-(--night)">
        <div
          className="h-full bg-linear-to-r from-(--gold-dark) to-(--gold-hi) transition-[width]"
          style={{ width: `${Math.round(fraction * 100)}%` }}
        />
      </div>
      <span className="font-mono text-(--faded) text-2xs uppercase tracking-wider">
        {Math.round(fraction * 100)}% · {formatBytes(loaded)} de{' '}
        {formatBytes(total)}
        {speed > 0 ? ` · ${formatBytes(speed)}/s` : ''}
        {remaining > 0 ? ` · quedan ${formatDuration(remaining)}` : ''}
      </span>
      <span className="flex items-center gap-2 font-bold text-(--ember) text-sm">
        <span
          aria-hidden="true"
          className="grid size-5 shrink-0 place-items-center rounded-full border border-(--ember) font-mono text-xs"
        >
          !
        </span>
        Subiendo… no cierres esta ventana ni la pestaña.
      </span>
    </div>
  );
};

export { GameFiles };
