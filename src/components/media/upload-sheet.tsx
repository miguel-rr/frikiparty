'use client';

import { useRouter } from 'next/navigation';
import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useSessionUser } from '@/components/layout/auth-slot';
import { btn, input, label } from '@/components/theme/primitives';
import { probeVideo } from '@/lib/media/video-poster';
import type { UploadType } from '@/server/api/routers/media';
import { api } from '@/trpc/react';

/** Mirror of the server allowlist; the server re-validates anyway. */
const ACCEPTED_TYPES = new Set<UploadType>([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/quicktime',
  'video/webm',
]);

/** Some browsers hand over files with an empty or odd type: fall back to the extension. */
const TYPE_BY_EXTENSION: Record<string, UploadType> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
};

const resolveUploadType = (file: File): UploadType | null => {
  if (ACCEPTED_TYPES.has(file.type as UploadType)) {
    return file.type as UploadType;
  }
  const extension = file.name.slice(file.name.lastIndexOf('.') + 1);
  return TYPE_BY_EXTENSION[extension.toLowerCase()] ?? null;
};

type Status = 'pending' | 'uploading' | 'processing' | 'done' | 'error';

type Entry = {
  key: string;
  file: File;
  contentType: UploadType;
  previewUrl: string | null;
  caption: string;
  status: Status;
  progress: number;
  error: string | null;
};

type UploadTarget = {
  /** Preselects this player (a player's own page). */
  playerId?: string;
  /** Preselects this edition (an edition's page). */
  editionId?: string;
};

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/** PUT with upload progress, which fetch() still can't report. */
const putWithProgress = (
  url: string,
  body: Blob,
  contentType: string,
  onProgress: (fraction: number) => void,
) =>
  new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(event.loaded / event.total);
      }
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`El almacén respondió ${xhr.status}.`));
    xhr.onerror = () => reject(new Error('Se perdió la conexión al subir.'));
    xhr.send(body);
  });

const chip = (active: boolean) =>
  `cursor-pointer rounded-full border px-3 py-1 font-mono text-2xs font-bold uppercase tracking-xl transition-colors ${
    active
      ? 'border-(--gold) bg-(--gold)/15 text-(--gold-hi)'
      : 'border-(--hair) text-(--faded) hover:border-(--hair-gold) hover:text-(--parchment)'
  }`;

const select = `${input} appearance-none`;

/**
 * "Subir fotos y vídeos" button plus the upload sheet behind it. Files go
 * straight from the browser to R2 (presigned PUT), then the server
 * catalogues each one. Phone-first: full-screen sheet, native picker,
 * one shared set of associations for the whole batch.
 */
const UploadSheet = ({ target }: { target: UploadTarget }) => {
  const { user } = useSessionUser();
  const permission = api.media.access.useQuery(undefined, {
    enabled: user !== undefined,
  });
  const [open, setOpen] = useState(false);

  if (!permission.data?.allowed) {
    return null;
  }
  return (
    <>
      <button
        className={`${btn.secondary} px-5 py-2 text-sm`}
        onClick={() => setOpen(true)}
        type="button"
      >
        Subir fotos y vídeos
      </button>
      {open ? (
        <UploadDialog
          onClose={() => setOpen(false)}
          ownPlayerId={permission.data.playerId}
          target={target}
        />
      ) : null}
    </>
  );
};

const UploadDialog = ({
  onClose,
  ownPlayerId,
  target,
}: {
  onClose: () => void;
  ownPlayerId: string | null;
  target: UploadTarget;
}) => {
  const router = useRouter();
  const context = api.media.uploadContext.useQuery();
  const presign = api.media.presign.useMutation();
  const finalize = api.media.finalize.useMutation();
  const utils = api.useUtils();

  const [entries, setEntries] = useState<Entry[]>([]);
  const [playerIds, setPlayerIds] = useState<string[]>(() =>
    [target.playerId, ownPlayerId].filter(
      (id, index, all): id is string => !!id && all.indexOf(id) === index,
    ),
  );
  const [editionId, setEditionId] = useState<string>(target.editionId ?? '');
  const [tournamentId, setTournamentId] = useState<string>('');
  const [running, setRunning] = useState(false);
  const [rejected, setRejected] = useState<string[]>([]);
  const fileInputId = useId();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const entriesRef = useRef(entries);
  entriesRef.current = entries;

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeRef.current();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKeyDown);
      // Object URLs are released when the sheet unmounts.
      for (const entry of entriesRef.current) {
        if (entry.previewUrl) {
          URL.revokeObjectURL(entry.previewUrl);
        }
      }
    };
  }, []);

  const tournaments = useMemo(
    () =>
      context.data?.editions.find((item) => item.id === editionId)
        ?.tournaments ?? [],
    [context.data, editionId],
  );

  const addFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files ?? []);
    event.target.value = '';
    const refused: string[] = [];
    const accepted: Entry[] = [];
    for (const file of picked) {
      const contentType = resolveUploadType(file);
      if (!contentType) {
        refused.push(file.name);
        continue;
      }
      accepted.push({
        key: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
        file,
        contentType,
        previewUrl: contentType.startsWith('image/')
          ? URL.createObjectURL(file)
          : null,
        caption: '',
        status: 'pending',
        progress: 0,
        error: null,
      });
    }
    setRejected(refused);
    setEntries((current) => [...current, ...accepted]);
  };

  const patch = useCallback((key: string, changes: Partial<Entry>) => {
    setEntries((current) =>
      current.map((entry) =>
        entry.key === key ? { ...entry, ...changes } : entry,
      ),
    );
  }, []);

  const remove = (key: string) => {
    setEntries((current) => {
      const entry = current.find((item) => item.key === key);
      if (entry?.previewUrl) {
        URL.revokeObjectURL(entry.previewUrl);
      }
      return current.filter((item) => item.key !== key);
    });
  };

  const togglePlayer = (id: string) =>
    setPlayerIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );

  const uploadOne = async (entry: Entry) => {
    const { contentType } = entry;
    patch(entry.key, { status: 'uploading', progress: 0, error: null });
    try {
      const isVideo = contentType.startsWith('video/');
      const probe = isVideo ? await probeVideo(entry.file) : null;
      const signed = await presign.mutateAsync({ contentType });
      await putWithProgress(signed.uploadUrl, entry.file, contentType, (f) =>
        patch(entry.key, { progress: f }),
      );
      if (probe?.poster && signed.posterUploadUrl) {
        await putWithProgress(
          signed.posterUploadUrl,
          probe.poster,
          'image/jpeg',
          () => undefined,
        );
      }
      patch(entry.key, { status: 'processing', progress: 1 });
      await finalize.mutateAsync({
        id: signed.id,
        contentType,
        caption: entry.caption.trim() || null,
        width: probe?.width ?? null,
        height: probe?.height ?? null,
        durationSeconds: probe?.durationSeconds ?? null,
        playerIds,
        editionId: editionId || null,
        tournamentId: tournamentId || null,
      });
      patch(entry.key, { status: 'done' });
    } catch (error) {
      patch(entry.key, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Error desconocido.',
      });
    }
  };

  const pending = entries.filter(
    (entry) => entry.status === 'pending' || entry.status === 'error',
  );
  const doneCount = entries.filter((entry) => entry.status === 'done').length;
  const canSubmit =
    !running && pending.length > 0 && playerIds.length > 0 && !!context.data;

  const submit = async () => {
    setRunning(true);
    // One at a time: phones on venue wifi don't love parallel uploads.
    for (const entry of pending) {
      await uploadOne(entry);
    }
    setRunning(false);
    await utils.media.invalidate();
    router.refresh();
  };

  const finished = entries.length > 0 && pending.length === 0 && !running;

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
              Los Archivos
            </p>
            <h2 className="d-display font-bold text-(--parchment) text-xl uppercase">
              Subir fotos y vídeos
            </h2>
          </div>
          <button
            aria-label="Cerrar"
            className="grid size-9 cursor-pointer place-items-center rounded-full border border-(--hair) text-(--faded) transition-colors hover:border-(--hair-gold) hover:text-(--gold-hi)"
            onClick={onClose}
            type="button"
          >
            ✕
          </button>
        </header>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-5 py-5">
          <div className="flex flex-col gap-3">
            <input
              accept="image/*,video/*"
              className="sr-only"
              disabled={running}
              id={fileInputId}
              multiple
              onChange={addFiles}
              type="file"
            />
            <label
              className={`${btn.primary} w-full cursor-pointer sm:w-auto`}
              htmlFor={fileInputId}
            >
              {entries.length === 0 ? 'Elegir archivos' : 'Añadir más'}
            </label>
            {rejected.length > 0 ? (
              <p className="text-(--ember) text-xs">
                Formato no admitido: {rejected.join(', ')}. Valen JPG, PNG,
                WEBP, GIF, MP4, MOV y WEBM.
              </p>
            ) : null}
            {entries.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {entries.map((entry) => (
                  <li
                    className="flex items-center gap-3 rounded-lg border border-(--hair) bg-(--night-2) p-2"
                    key={entry.key}
                  >
                    <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-md bg-(--night)">
                      {entry.previewUrl ? (
                        // biome-ignore lint/performance/noImgElement: local object URL preview
                        <img
                          alt=""
                          className="size-full object-cover"
                          src={entry.previewUrl}
                        />
                      ) : (
                        <span className="font-bold font-mono text-(--faded) text-3xs uppercase tracking-2xl">
                          Vídeo
                        </span>
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-(--faded) text-xs">
                          {entry.file.name} · {formatSize(entry.file.size)}
                        </span>
                        {entry.status === 'pending' ? (
                          <button
                            aria-label={`Quitar ${entry.file.name}`}
                            className="cursor-pointer text-(--faded) text-xs transition-colors hover:text-(--ember)"
                            onClick={() => remove(entry.key)}
                            type="button"
                          >
                            Quitar
                          </button>
                        ) : null}
                      </div>
                      {entry.status === 'pending' ||
                      entry.status === 'error' ? (
                        <input
                          className={`${input} px-2.5 py-1 text-sm`}
                          disabled={running}
                          onChange={(event) =>
                            patch(entry.key, { caption: event.target.value })
                          }
                          placeholder="Título (opcional)"
                          value={entry.caption}
                        />
                      ) : (
                        <span className="truncate text-(--parchment) text-sm">
                          {entry.caption || 'Sin título'}
                        </span>
                      )}
                      <EntryStatus entry={entry} />
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <span className={label}>Jugadores que salen · al menos uno</span>
            {context.data ? (
              <div className="flex flex-wrap gap-1.5">
                {context.data.players.map((item) => (
                  <button
                    aria-pressed={playerIds.includes(item.id)}
                    className={chip(playerIds.includes(item.id))}
                    disabled={running}
                    key={item.id}
                    onClick={() => togglePlayer(item.id)}
                    type="button"
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            ) : (
              <span className="text-(--faded) text-sm">Cargando…</span>
            )}
            {playerIds.length === 0 ? (
              <p className="text-(--ember) text-xs">
                Marca al menos un jugador para poder subir.
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col">
              <label className={label} htmlFor={`${fileInputId}-edition`}>
                Edición
              </label>
              <select
                className={select}
                disabled={running || !context.data}
                id={`${fileInputId}-edition`}
                onChange={(event) => {
                  setEditionId(event.target.value);
                  setTournamentId('');
                }}
                value={editionId}
              >
                <option value="">Sin edición</option>
                {context.data?.editions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
              {editionId === '' ? (
                <p className="mt-1.5 text-[#d9b96a] text-xs">
                  Sin edición no aparecerá en la crónica de ningún año.
                </p>
              ) : null}
            </div>
            {tournaments.length > 0 ? (
              <div className="flex flex-col">
                <label className={label} htmlFor={`${fileInputId}-tournament`}>
                  Torneo
                </label>
                <select
                  className={select}
                  disabled={running}
                  id={`${fileInputId}-tournament`}
                  onChange={(event) => setTournamentId(event.target.value)}
                  value={tournamentId}
                >
                  <option value="">Fuera del torneo</option>
                  {tournaments.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.kind === 'team' ? 'Por equipos' : 'Individual'}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>
        </div>

        <footer className="flex flex-col gap-3 border-(--hair) border-t px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-(--faded) text-sm">
            {finished
              ? `${doneCount} de ${entries.length} en Los Archivos.`
              : running
                ? 'Subiendo… no cierres esta ventana.'
                : entries.length > 0
                  ? `${pending.length} por subir.`
                  : 'Elige fotos o vídeos del móvil o del ordenador.'}
          </span>
          {finished ? (
            <button className={btn.primary} onClick={onClose} type="button">
              Cerrar
            </button>
          ) : (
            <button
              className={btn.primary}
              disabled={!canSubmit}
              onClick={submit}
              type="button"
            >
              {running
                ? 'Subiendo…'
                : `Subir ${pending.length === 1 ? '1 archivo' : `${pending.length} archivos`}`}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
};

const EntryStatus = ({ entry }: { entry: Entry }) => {
  if (entry.status === 'uploading') {
    return (
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-(--night)">
        <div
          className="h-full bg-linear-to-r from-(--gold-dark) to-(--gold-hi) transition-[width]"
          style={{ width: `${Math.round(entry.progress * 100)}%` }}
        />
      </div>
    );
  }
  if (entry.status === 'processing') {
    return <span className="text-(--gold) text-xs">Catalogando…</span>;
  }
  if (entry.status === 'done') {
    return <span className="text-(--gold-hi) text-xs">En Los Archivos</span>;
  }
  if (entry.status === 'error') {
    return <span className="text-(--ember) text-xs">{entry.error}</span>;
  }
  return null;
};

export { UploadSheet };
