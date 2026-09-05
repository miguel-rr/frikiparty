'use client';

import { useRef, useState } from 'react';

import { btn } from '@/components/theme/primitives';
import type { LiveGame } from '@/server/live/phases';
import { api } from '@/trpc/react';

const formatSize = (bytes: number | null) =>
  bytes === null
    ? ''
    : bytes >= 1024 * 1024
      ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/** PUT with progress, straight to the bucket. */
const put = (
  url: string,
  file: File,
  contentType: string,
  onProgress: (fraction: number) => void,
) =>
  new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`El almacén respondió ${xhr.status}.`));
    xhr.onerror = () => reject(new Error('Se perdió la conexión al subir.'));
    xhr.send(file);
  });

/**
 * The game's saved replays (.BfME2Replay, up to 50 MB): the list with
 * downloads, and the upload for whoever played it or the organiser.
 */
const ReplayBox = ({
  tournamentId,
  matchId,
  game,
  canUpload,
  userId,
  isAdmin,
}: {
  tournamentId: string;
  matchId: string;
  game: LiveGame;
  canUpload: boolean;
  userId: string | null;
  isAdmin: boolean;
}) => {
  const fileInput = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const presign = api.match.presignReplay.useMutation();
  const finalize = api.match.finalizeReplay.useMutation();
  const remove = api.match.removeReplay.useMutation();

  const upload = async (file: File) => {
    setError(null);
    if (!/\.bfme2replay$/i.test(file.name)) {
      setError('Sólo partidas guardadas .BfME2Replay.');
      return;
    }
    try {
      setProgress(0);
      const signed = await presign.mutateAsync({
        tournamentId,
        matchId,
        gameId: game.id,
        fileName: file.name,
        size: file.size,
      });
      await put(signed.uploadUrl, file, signed.contentType, setProgress);
      await finalize.mutateAsync({
        tournamentId,
        matchId,
        gameId: game.id,
        fileId: signed.fileId,
        fileName: file.name,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo subir.');
    } finally {
      setProgress(null);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  if (game.saveFiles.length === 0 && !canUpload) return null;
  return (
    <div className="flex flex-col gap-2">
      <span className="font-mono text-(--faded) text-3xs uppercase tracking-wider">
        Partidas guardadas
      </span>
      {game.saveFiles.length > 0 ? (
        <ul className="flex flex-col gap-1 text-xs">
          {game.saveFiles.map((f) => (
            <li className="flex flex-wrap items-center gap-2" key={f.id}>
              <a
                className="text-(--gold) underline decoration-dotted underline-offset-2 hover:text-(--gold-hi)"
                download={f.fileName ?? undefined}
                href={f.url}
              >
                {f.fileName ?? 'partida.BfME2Replay'}
              </a>
              <span className="font-mono text-(--faded) text-3xs">
                {formatSize(f.fileSize)}
              </span>
              {isAdmin || f.uploadedByUserId === userId ? (
                <button
                  className="cursor-pointer font-mono text-(--ember) text-3xs uppercase hover:underline"
                  disabled={remove.isPending}
                  onClick={() =>
                    remove.mutate({
                      tournamentId,
                      matchId,
                      gameId: game.id,
                      fileId: f.id,
                    })
                  }
                  type="button"
                >
                  quitar
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {canUpload ? (
        <div className="flex flex-wrap items-center gap-3">
          <input
            accept=".BfME2Replay"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
            }}
            ref={fileInput}
            type="file"
          />
          <button
            className={`${btn.secondary} px-4 py-1.5 text-xs`}
            disabled={progress !== null}
            onClick={() => fileInput.current?.click()}
            type="button"
          >
            {progress === null
              ? 'Subir partida guardada'
              : `Subiendo… ${Math.round(progress * 100)} %`}
          </button>
          {error ? (
            <span className="text-(--ember) text-xs">{error}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export { ReplayBox };
