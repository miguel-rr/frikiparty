'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import {
  btn,
  input,
  label,
  panel,
  tag,
  td,
  th,
} from '@/components/theme/primitives';
import { StrDiff, StrText } from '@/components/translations/str-text';
import {
  hotkeyOf,
  placeholdersOf,
  unencodable,
  valueText,
} from '@/lib/translations/str';
import { api } from '@/trpc/react';

type Mode = 'all' | 'custom' | 'review' | 'untranslated' | 'missing';
const MODES: { value: Mode; text: string }[] = [
  { value: 'all', text: 'Todas' },
  { value: 'custom', text: 'Con cadena propia' },
  { value: 'review', text: 'En revisión' },
  { value: 'untranslated', text: 'Sin traducir' },
  { value: 'missing', text: 'Faltan en español' },
];

const select =
  'appearance-none rounded-lg border border-(--hair) bg-(--night-2) px-3 py-2 text-(--parchment) text-sm transition-colors hover:border-(--hair-gold) focus:border-(--gold) focus:outline-none';

const useDebounced = (value: string, ms = 300) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(handle);
  }, [value, ms]);
  return debounced;
};

/** The editor's textarea takes real line breaks; the game wants `\n`. */
const toEditable = (text: string) => text.replace(/\\n/g, '\n');
const fromEditable = (text: string) => text.replace(/\r?\n/g, '\\n');

/** Warnings about our text against the Spanish it replaces. */
const warnings = (ours: string, reference: string | null) => {
  const out: string[] = [];
  const bad = unencodable(ours);
  if (bad.length > 0)
    out.push(`Caracteres que el juego no puede mostrar: ${bad.join(' ')}`);
  if (ours.includes('"')) out.push('Las comillas dobles rompen el fichero.');
  if (reference !== null) {
    const theirs = hotkeyOf(reference);
    const mine = hotkeyOf(ours);
    if (theirs && !mine)
      out.push(`El original marca el atajo &${theirs} y el nuestro no.`);
    else if (theirs && mine && theirs.toLowerCase() !== mine.toLowerCase())
      out.push(`El atajo cambia de &${theirs} a &${mine}.`);
    const wanted = placeholdersOf(reference).join(' ');
    const got = placeholdersOf(ours).join(' ');
    if (wanted !== got)
      out.push(
        `Marcadores distintos: el original lleva "${wanted || 'ninguno'}", el nuestro "${got || 'ninguno'}".`,
      );
  }
  return out;
};

/**
 * The row unfolded: the same key read comfortably, every version we hold,
 * and the box to write our string. Saving folds it back.
 */
const InlineEditor = ({
  entryKey,
  onClose,
}: {
  entryKey: string;
  onClose: () => void;
}) => {
  const utils = api.useUtils();
  const entry = api.translations.entry.useQuery({ key: entryKey });
  const [draft, setDraft] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const refresh = async () => {
    await Promise.all([
      utils.translations.search.invalidate(),
      utils.translations.overview.invalidate(),
    ]);
    utils.translations.entry.invalidate({ key: entryKey });
  };
  const save = api.translations.saveCustom.useMutation({
    onSuccess: async () => {
      await refresh();
      onClose();
    },
  });
  const confirm = api.translations.confirmCustom.useMutation({
    onSuccess: async () => {
      await refresh();
      onClose();
    },
  });
  const remove = api.translations.deleteCustom.useMutation({
    onSuccess: async () => {
      await refresh();
      onClose();
    },
  });
  const busy = save.isPending || confirm.isPending || remove.isPending;
  const data = entry.data;
  const latest = (language: 'en' | 'es') =>
    data?.versions.find((v) => v.language === language) ?? null;
  const en = latest('en');
  const es = latest('es');
  const custom = data?.custom ?? null;
  const editable =
    draft ??
    (custom
      ? toEditable(custom.value)
      : toEditable(valueText(es?.value ?? en?.value ?? '') ?? ''));
  const ours = fromEditable(editable);
  const noteValue = note ?? custom?.note ?? '';
  const alerts = useMemo(
    () =>
      warnings(
        ours,
        es ? valueText(es.value) : en ? valueText(en.value) : null,
      ),
    [ours, es, en],
  );
  const older = data?.versions.filter((v) => v !== en && v !== es) ?? [];
  const baselineChanged =
    custom?.status === 'review' &&
    custom.baseEnValue !== null &&
    en !== null &&
    custom.baseEnValue !== en.value;
  const error = save.error ?? confirm.error ?? remove.error;

  if (!data) return <p className="p-4 text-(--faded) text-sm">Cargando…</p>;
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-mono text-(--gold-hi) text-sm">{entryKey}</p>
          {en?.comment ? (
            <p className="text-(--faded) text-xs">{en.comment}</p>
          ) : null}
        </div>
        <button
          className={btn.ghost}
          disabled={busy}
          onClick={onClose}
          type="button"
        >
          Cerrar
        </button>
      </div>
      <div className="grid gap-4 text-sm md:grid-cols-2">
        <div className={`${panel} p-3`}>
          <p className={label}>Original {en ? en.version : ''}</p>
          <StrText
            className="text-(--parchment) leading-relaxed"
            value={en?.value}
          />
        </div>
        <div className={`${panel} p-3`}>
          <p className={label}>Español {es ? es.version : ''}</p>
          <StrText
            className="text-(--parchment) leading-relaxed"
            value={es?.value}
          />
        </div>
      </div>
      {baselineChanged && custom?.baseEnValue && en ? (
        <div className="rounded-lg border border-(--gold)/40 bg-(--gold)/6 p-3 text-sm">
          <p className={label}>
            El original ha cambiado desde que escribimos la nuestra
          </p>
          <p className="text-(--parchment) leading-relaxed">
            <StrDiff
              after={valueText(en.value) ?? en.value}
              before={valueText(custom.baseEnValue) ?? custom.baseEnValue}
            />
          </p>
          <button
            className={`${btn.secondary} mt-3`}
            disabled={busy}
            onClick={() => confirm.mutate({ key: entryKey })}
            type="button"
          >
            Sigue valiendo
          </button>
        </div>
      ) : null}
      {older.length > 0 ? (
        <details className="text-sm">
          <summary className="cursor-pointer text-(--faded)">
            Otras versiones ({older.length})
          </summary>
          <ul className="mt-2 flex flex-col gap-1.5">
            {older.map((v) => (
              <li className="flex gap-3" key={v.fileId}>
                <span className="w-20 shrink-0 font-mono text-(--faded) text-xs">
                  {v.language} {v.version}
                </span>
                <StrText className="text-(--parchment)" value={v.value} />
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className={label} htmlFor={`custom-text-${entryKey}`}>
            Nuestra cadena
          </label>
          <textarea
            className={`${input} min-h-28 font-mono text-sm leading-relaxed disabled:opacity-60`}
            disabled={busy}
            id={`custom-text-${entryKey}`}
            onChange={(e) => setDraft(e.target.value)}
            value={editable}
          />
          <p className="mt-1 text-(--faded) text-xs">
            Intro salta de línea (se guarda como \n). Pon &amp; delante de la
            letra que sea tecla rápida, igual que en el original.
          </p>
          <label
            className={`${label} mt-3`}
            htmlFor={`custom-note-${entryKey}`}
          >
            Nota
          </label>
          <input
            className={`${input} disabled:opacity-60`}
            disabled={busy}
            id={`custom-note-${entryKey}`}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Por qué la cambiamos"
            value={noteValue}
          />
        </div>
        <div>
          <p className={label}>Así se verá</p>
          <div
            className={`${panel} min-h-28 p-3 text-(--parchment) text-sm leading-relaxed`}
          >
            <StrText text={ours} />
          </div>
          {alerts.length > 0 ? (
            <ul className="mt-2 flex flex-col gap-1 text-(--ember) text-xs">
              {alerts.map((alert) => (
                <li key={alert}>{alert}</li>
              ))}
            </ul>
          ) : null}
          {custom ? (
            <p className="mt-2 text-(--faded) text-xs">
              Guardada el{' '}
              {new Date(custom.updatedAt).toLocaleDateString('es-ES')}
              {custom.updatedBy ? ` por ${custom.updatedBy}` : ''}
              {custom.status === 'review' ? ' · en revisión' : ''}
            </p>
          ) : null}
        </div>
      </div>
      {error ? <p className="text-(--ember) text-sm">{error.message}</p> : null}
      <div className="flex flex-wrap items-center gap-2">
        <button
          className={btn.primary}
          disabled={busy || ours.includes('"')}
          onClick={() =>
            save.mutate({ key: entryKey, value: ours, note: noteValue })
          }
          type="button"
        >
          {save.isPending
            ? 'Guardando…'
            : custom
              ? 'Guardar cambios'
              : 'Guardar cadena propia'}
        </button>
        {custom ? (
          <button
            className={btn.danger}
            disabled={busy}
            onClick={() => remove.mutate({ key: entryKey })}
            type="button"
          >
            {remove.isPending ? 'Quitando…' : 'Quitar la nuestra'}
          </button>
        ) : null}
        <button
          className={btn.ghost}
          disabled={busy}
          onClick={onClose}
          type="button"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};

/** Search, filters and the paged table; a click unfolds the row's editor. */
const StringBrowser = () => {
  const params = useSearchParams();
  const router = useRouter();
  const linkedKey = params.get('key');
  // A key in the URL (from Comparar) is searched for, so its row is on screen.
  const [q, setQ] = useState(params.get('q') ?? linkedKey ?? '');
  const [category, setCategory] = useState('');
  const [mode, setMode] = useState<Mode>(
    (params.get('mode') as Mode | null) ?? 'all',
  );
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<string | null>(linkedKey);
  const debouncedQ = useDebounced(q);
  const categories = api.translations.categories.useQuery();
  const search = api.translations.search.useQuery(
    { q: debouncedQ, category, mode, page },
    { placeholderData: (previous) => previous },
  );
  const toggle = (key: string) => {
    setOpen((current) => (current === key ? null : key));
    if (linkedKey) router.replace('/translations');
  };
  const data = search.data;
  const total = data?.total ?? 0;
  const pageSize = data?.pageSize ?? 50;
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-60 grow">
          <label className={label} htmlFor="str-search">
            Buscar por clave o texto
          </label>
          <input
            className={input}
            id="str-search"
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
            placeholder="Gorbag, ToolTip, armadura…"
            value={q}
          />
        </div>
        <div>
          <label className={label} htmlFor="str-category">
            Categoría
          </label>
          <select
            className={select}
            id="str-category"
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(0);
            }}
            value={category}
          >
            <option value="">Todas</option>
            {categories.data?.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name || '(sin categoría)'} · {c.count}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="str-mode">
            Mostrar
          </label>
          <select
            className={select}
            id="str-mode"
            onChange={(e) => {
              setMode(e.target.value as Mode);
              setPage(0);
            }}
            value={mode}
          >
            {MODES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.text}
              </option>
            ))}
          </select>
        </div>
      </div>
      {data && !data.en && !data.es ? (
        <p className="text-(--faded) text-sm">
          Sube primero un lotr.str en la pestaña Ficheros.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-200 border-collapse text-sm">
            <thead>
              <tr>
                <th className={th}>Clave</th>
                <th className={th}>Original {data?.en?.version ?? ''}</th>
                <th className={th}>Español {data?.es?.version ?? ''}</th>
                <th className={th}>Nuestra</th>
              </tr>
            </thead>
            <tbody>
              {data?.rows.map((row) => {
                const isOpen = row.key === open;
                return [
                  <tr
                    className={`cursor-pointer transition-colors hover:bg-(--gold)/6 ${
                      isOpen ? 'bg-(--gold)/10' : ''
                    }`}
                    key={row.key}
                    onClick={() => toggle(row.key)}
                  >
                    <td
                      className={`${td} max-w-64 break-all font-mono text-(--gold-hi) text-xs`}
                    >
                      {row.key}
                    </td>
                    <td className={`${td} max-w-80 text-(--parchment)`}>
                      <StrText value={row.en} />
                    </td>
                    <td className={`${td} max-w-80 text-(--parchment)`}>
                      <StrText value={row.es} />
                    </td>
                    <td className={`${td} max-w-80 text-(--parchment)`}>
                      {row.custom !== null ? (
                        <>
                          <StrText text={row.custom} />
                          {row.status === 'review' ? (
                            <span
                              className={`${tag} ml-2 border-(--ember)/60 text-(--ember)`}
                            >
                              revisar
                            </span>
                          ) : null}
                        </>
                      ) : (
                        <span className="text-(--faded)/60">—</span>
                      )}
                    </td>
                  </tr>,
                  isOpen ? (
                    <tr key={`${row.key}-editor`}>
                      <td
                        className="border-(--hair-gold) border-b bg-(--night-2)/60 p-0"
                        colSpan={4}
                      >
                        <InlineEditor
                          entryKey={row.key}
                          onClose={() => setOpen(null)}
                        />
                      </td>
                    </tr>
                  ) : null,
                ];
              })}
            </tbody>
          </table>
          <div className="mt-3 flex items-center justify-between text-(--faded) text-xs">
            <span>
              {total === 0
                ? 'Nada que mostrar'
                : `${page * pageSize + 1}–${Math.min(total, (page + 1) * pageSize)} de ${total}`}
              {search.isFetching ? ' · buscando…' : ''}
            </span>
            <span className="flex gap-2">
              <button
                className={`${btn.ghost} px-3 py-1 text-xs`}
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                type="button"
              >
                Anterior
              </button>
              <button
                className={`${btn.ghost} px-3 py-1 text-xs`}
                disabled={page + 1 >= pages}
                onClick={() => setPage((p) => p + 1)}
                type="button"
              >
                Siguiente
              </button>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export { StringBrowser };
