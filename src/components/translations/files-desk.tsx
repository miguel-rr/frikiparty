'use client';

import { type FormEvent, useState } from 'react';

import {
  btn,
  input,
  label,
  panel,
  panelGold,
  td,
  th,
} from '@/components/theme/primitives';
import { StrText } from '@/components/translations/str-text';
import type { StrLanguage } from '@/server/db/schema/translations';
import type { ImportReport, ImportResult } from '@/server/translations/import';
import { api, type RouterOutputs } from '@/trpc/react';

type Overview = RouterOutputs['translations']['overview'];

const select =
  'w-full appearance-none rounded-lg border border-(--hair) bg-(--night-2) px-3 py-2 text-(--parchment) transition-colors hover:border-(--hair-gold) focus:border-(--gold) focus:outline-none';
const field = 'flex flex-col';
const LANGUAGE_TEXT: Record<StrLanguage, string> = {
  en: 'Original (inglés)',
  es: 'Traducción (español)',
};

const formatDate = (value: Date | string) =>
  new Date(value).toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

type Conflict = Extract<ImportResult, { ok: false }>['conflict'];

/** Upload form: version, language, source, the file; confirms a replacement. */
const UploadForm = ({
  overview,
  onDone,
}: {
  overview: Overview;
  onDone: (report: ImportReport) => void;
}) => {
  const utils = api.useUtils();
  const [versionId, setVersionId] = useState(overview.versions[0]?.id ?? '');
  const [language, setLanguage] = useState<StrLanguage>('en');
  const [source, setSource] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<Conflict | null>(null);
  const [newVersion, setNewVersion] = useState<{
    gameId: string;
    version: string;
  } | null>(null);
  const createVersion = api.translations.createVersion.useMutation({
    onSuccess: async (created) => {
      await utils.translations.overview.invalidate();
      setVersionId(created.id);
      setNewVersion(null);
    },
  });

  const send = async (replace: boolean) => {
    if (!file || !versionId) return;
    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.set('file', file);
      body.set('gameVersionId', versionId);
      body.set('language', language);
      body.set('source', source);
      if (replace) body.set('replace', '1');
      const response = await fetch('/api/translations/upload', {
        method: 'POST',
        body,
      });
      const payload = (await response.json()) as
        | ImportResult
        | { error: string };
      if ('error' in payload) {
        setError(payload.error);
      } else if (!payload.ok) {
        setConflict(payload.conflict);
      } else {
        setConflict(null);
        setFile(null);
        await utils.translations.invalidate();
        onDone(payload.report);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo subir.');
    } finally {
      setBusy(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setConflict(null);
    void send(false);
  };

  return (
    <form className={`${panelGold} flex flex-col gap-4 p-5`} onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className={field}>
          <span className={label}>Versión del juego</span>
          {newVersion ? (
            <div className="flex flex-col gap-2">
              <select
                className={select}
                onChange={(e) =>
                  setNewVersion({ ...newVersion, gameId: e.target.value })
                }
                value={newVersion.gameId}
              >
                {overview.games.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <input
                  className={input}
                  onChange={(e) =>
                    setNewVersion({ ...newVersion, version: e.target.value })
                  }
                  placeholder="9.3.4"
                  value={newVersion.version}
                />
                <button
                  className={btn.secondary}
                  disabled={
                    createVersion.isPending || newVersion.version.trim() === ''
                  }
                  onClick={() => createVersion.mutate(newVersion)}
                  type="button"
                >
                  Crear
                </button>
                <button
                  className={btn.ghost}
                  onClick={() => setNewVersion(null)}
                  type="button"
                >
                  Cancelar
                </button>
              </div>
              {createVersion.error ? (
                <p className="text-(--ember) text-xs">
                  {createVersion.error.message}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="flex gap-2">
              <select
                className={select}
                onChange={(e) => setVersionId(e.target.value)}
                value={versionId}
              >
                {overview.versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.gameName} {v.version}
                  </option>
                ))}
              </select>
              <button
                className={`${btn.secondary} whitespace-nowrap`}
                onClick={() =>
                  setNewVersion({
                    gameId: overview.games[0]?.id ?? '',
                    version: '',
                  })
                }
                type="button"
              >
                Nueva versión
              </button>
            </div>
          )}
        </div>
        <div className={field}>
          <span className={label}>Idioma</span>
          <select
            className={select}
            onChange={(e) => setLanguage(e.target.value as StrLanguage)}
            value={language}
          >
            {(Object.keys(LANGUAGE_TEXT) as StrLanguage[]).map((code) => (
              <option key={code} value={code}>
                {LANGUAGE_TEXT[code]}
              </option>
            ))}
          </select>
        </div>
        <div className={field}>
          <label className={label} htmlFor="str-source">
            Origen
          </label>
          <input
            className={input}
            id="str-source"
            onChange={(e) => setSource(e.target.value)}
            placeholder={language === 'en' ? 'oficial' : 'Galcano11'}
            value={source}
          />
        </div>
        <div className={field}>
          <label className={label} htmlFor="str-file">
            Fichero lotr.str
          </label>
          <input
            accept=".str,text/plain"
            className="text-(--parchment) text-sm file:mr-3 file:cursor-pointer file:rounded-full file:border file:border-(--hair-gold) file:bg-(--night-2) file:px-3 file:py-1 file:font-mono file:text-(--gold) file:text-2xs file:uppercase file:tracking-2xl"
            id="str-file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            type="file"
          />
        </div>
      </div>
      {conflict ? (
        <div className="rounded-lg border border-(--ember)/45 bg-(--ember)/8 p-4 text-sm">
          <p className="text-(--parchment)">
            Ya hay un fichero de ese idioma para esa versión
            {conflict.source ? ` (${conflict.source})` : ''}, subido el{' '}
            {formatDate(conflict.uploadedAt)} con {conflict.entryCount} bloques.
            Si lo sustituyes, sus entradas se borran y se cargan las nuevas.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              className={btn.danger}
              disabled={busy}
              onClick={() => void send(true)}
              type="button"
            >
              Sustituir
            </button>
            <button
              className={btn.ghost}
              onClick={() => setConflict(null)}
              type="button"
            >
              Dejarlo como está
            </button>
          </div>
        </div>
      ) : null}
      {error ? <p className="text-(--ember) text-sm">{error}</p> : null}
      <div className="flex items-center gap-3">
        <button
          className={btn.primary}
          disabled={busy || !file || !versionId}
          type="submit"
        >
          {busy ? 'Subiendo…' : 'Subir'}
        </button>
        {busy ? (
          <span className="text-(--faded) text-sm">
            Leyendo el fichero, guardando sus 24.000 bloques…
          </span>
        ) : null}
      </div>
    </form>
  );
};

const ISSUE_TEXT: Record<ImportReport['issues'][number]['kind'], string> = {
  unterminated: 'Bloque sin END',
  'stray-end': 'END suelto',
  'no-colon': 'Clave sin categoría',
  'odd-key': 'Clave con caracteres raros',
  'no-value': 'Bloque sin valor',
  unquoted: 'Valor sin comillas',
  trailing: 'Texto tras la comilla de cierre',
};

/** What the last upload found. */
const Report = ({ report }: { report: ImportReport }) => (
  <div className={`${panel} flex flex-col gap-4 p-5 text-sm`}>
    <p className="text-(--parchment)">
      <strong className="text-(--gold-hi)">
        {LANGUAGE_TEXT[report.language]} {report.version}
      </strong>{' '}
      {report.replaced ? 'sustituido' : 'guardado'}: {report.blocks} bloques,{' '}
      {report.uniqueKeys} claves distintas, {report.categories.length}{' '}
      categorías.
    </p>
    {report.previous ? (
      <p className="text-(--parchment)">
        Respecto a la {report.previous.version}:{' '}
        <strong>{report.previous.addedCount}</strong> claves nuevas,{' '}
        <strong>{report.previous.removedCount}</strong> eliminadas,{' '}
        <strong>{report.previous.changedCount}</strong> con el texto cambiado.
      </p>
    ) : (
      <p className="text-(--faded)">
        No había un fichero anterior de este idioma con el que comparar.
      </p>
    )}
    {report.review.length > 0 ? (
      <div>
        <p className="text-(--gold-hi)">
          {report.review.length} cadenas propias pasan a revisión porque su
          original ha cambiado:
        </p>
        <ul className="mt-1 flex flex-wrap gap-1.5">
          {report.review.map((key) => (
            <li className="font-mono text-(--parchment) text-2xs" key={key}>
              {key}
            </li>
          ))}
        </ul>
      </div>
    ) : null}
    {report.issues.length > 0 ? (
      <details>
        <summary className="cursor-pointer text-(--parchment)">
          {report.issues.length} avisos del parser
        </summary>
        <ul className="mt-2 flex flex-col gap-1 text-(--faded)">
          {report.issues.map((issue) => (
            <li key={`${issue.kind}-${issue.line}`}>
              línea {issue.line + 1}: {ISSUE_TEXT[issue.kind]}
              {issue.key ? (
                <span className="ml-2 font-mono text-(--parchment) text-2xs">
                  {issue.key}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </details>
    ) : null}
    {report.duplicates.length > 0 ? (
      <details>
        <summary className="cursor-pointer text-(--parchment)">
          {report.duplicates.length} claves repetidas con valores distintos (el
          juego se queda con el último)
        </summary>
        <ul className="mt-2 flex flex-col gap-2 text-(--faded)">
          {report.duplicates.map((dup) => (
            <li key={dup.key}>
              <span className="font-mono text-(--parchment) text-2xs">
                {dup.key}
              </span>
              <ul className="ml-4">
                {dup.distinct.map((value) => (
                  <li key={value}>
                    <StrText value={value} />
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </details>
    ) : null}
    {report.previous && report.previous.changed.length > 0 ? (
      <details>
        <summary className="cursor-pointer text-(--parchment)">
          Muestra de textos cambiados
        </summary>
        <ul className="mt-2 flex flex-col gap-2 text-(--faded)">
          {report.previous.changed.slice(0, 40).map((row) => (
            <li key={row.key}>
              <span className="font-mono text-(--parchment) text-2xs">
                {row.key}
              </span>
              <div className="ml-4 text-(--ember)">
                <StrText value={row.before} />
              </div>
              <div className="ml-4 text-(--gold-hi)">
                <StrText value={row.after} />
              </div>
            </li>
          ))}
        </ul>
      </details>
    ) : null}
  </div>
);

/** The uploaded files, newest version first, each removable. */
const FilesTable = ({ files }: { files: Overview['files'] }) => {
  const utils = api.useUtils();
  const [confirming, setConfirming] = useState<string | null>(null);
  const remove = api.translations.deleteFile.useMutation({
    onSuccess: () => {
      setConfirming(null);
      void utils.translations.invalidate();
    },
  });
  if (files.length === 0)
    return (
      <p className="text-(--faded) text-sm">
        Aún no hay ficheros. Sube el original y la traducción de la versión que
        se juegue.
      </p>
    );
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-160 border-collapse text-sm">
        <thead>
          <tr>
            <th className={th}>Versión</th>
            <th className={th}>Idioma</th>
            <th className={th}>Origen</th>
            <th className={th}>Bloques</th>
            <th className={th}>Subido</th>
            <th className={th}>Avisos</th>
            <th className={th} />
          </tr>
        </thead>
        <tbody>
          {files.map((file) => (
            <tr key={file.id}>
              <td className={`${td} whitespace-nowrap text-(--gold-hi)`}>
                {file.gameName} {file.version}
              </td>
              <td className={td}>{LANGUAGE_TEXT[file.language]}</td>
              <td className={td}>
                <span className="text-(--parchment)">{file.source ?? '—'}</span>
                {file.header ? (
                  <p
                    className="mt-0.5 max-w-64 truncate text-(--faded) text-xs"
                    title={file.header}
                  >
                    {file.header.split('\n')[0]}
                  </p>
                ) : null}
              </td>
              <td className={td}>{file.entryCount}</td>
              <td className={`${td} whitespace-nowrap text-(--faded)`}>
                {formatDate(file.uploadedAt)}
                {file.uploadedBy ? ` · ${file.uploadedBy}` : ''}
              </td>
              <td className={td}>{file.issues.length}</td>
              <td className={`${td} text-right`}>
                {confirming === file.id ? (
                  <span className="inline-flex gap-1.5">
                    <button
                      className={`${btn.danger} px-3 py-1 text-xs`}
                      disabled={remove.isPending}
                      onClick={() => remove.mutate({ fileId: file.id })}
                      type="button"
                    >
                      Borrar
                    </button>
                    <button
                      className={`${btn.ghost} px-3 py-1 text-xs`}
                      onClick={() => setConfirming(null)}
                      type="button"
                    >
                      No
                    </button>
                  </span>
                ) : (
                  <button
                    className={`${btn.ghost} px-3 py-1 text-xs`}
                    onClick={() => setConfirming(file.id)}
                    type="button"
                  >
                    Borrar
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {remove.error ? (
        <p className="mt-2 text-(--ember) text-xs">{remove.error.message}</p>
      ) : null}
    </div>
  );
};

/** Upload form, the last report and the table of files. */
const FilesDesk = () => {
  const overview = api.translations.overview.useQuery();
  const [report, setReport] = useState<ImportReport | null>(null);
  if (!overview.data)
    return <p className="text-(--faded) text-sm">Cargando…</p>;
  return (
    <div className="flex flex-col gap-8">
      <UploadForm onDone={setReport} overview={overview.data} />
      {report ? <Report report={report} /> : null}
      <FilesTable files={overview.data.files} />
    </div>
  );
};

export { FilesDesk };
