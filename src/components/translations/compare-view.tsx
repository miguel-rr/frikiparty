'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { btn, input, label } from '@/components/theme/primitives';
import { Cell, Row, RowHead } from '@/components/translations/rows';
import { StrDiff, StrText } from '@/components/translations/str-text';
import { valueText } from '@/lib/translations/str';
import { api } from '@/trpc/react';

type Kind = 'changed' | 'added' | 'removed' | 'same';
const KINDS: { value: Kind; text: string }[] = [
  { value: 'changed', text: 'Cambiadas' },
  { value: 'added', text: 'Nuevas' },
  { value: 'removed', text: 'Eliminadas' },
  { value: 'same', text: 'Iguales' },
];

const COLUMNS = 'minmax(0,1.1fr) minmax(0,3fr) auto';

const select =
  'appearance-none rounded-lg border border-(--hair) bg-(--night-2) px-3 py-2 text-(--parchment) text-sm transition-colors hover:border-(--hair-gold) focus:border-(--gold) focus:outline-none';
const chip =
  'cursor-pointer rounded-full border px-3 py-1 font-mono text-2xs font-bold uppercase tracking-2xl transition-colors';

/**
 * Any two uploaded files: a version against the next one in the same
 * language, or the original against its translation.
 */
const CompareView = () => {
  const overview = api.translations.overview.useQuery();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [kind, setKind] = useState<Kind>('changed');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const files = overview.data?.files ?? [];
  // Default: the two newest files of the same language, else en → es.
  useEffect(() => {
    if (from || to || files.length < 2) return;
    const newest = files[0];
    if (!newest) return;
    const sameLanguage = files.find(
      (f) => f.language === newest.language && f.id !== newest.id,
    );
    const other = files.find((f) => f.language !== newest.language);
    const pair = sameLanguage ?? other;
    if (!pair) return;
    if (sameLanguage) {
      setFrom(pair.id);
      setTo(newest.id);
    } else {
      setFrom(newest.language === 'en' ? newest.id : pair.id);
      setTo(newest.language === 'en' ? pair.id : newest.id);
    }
  }, [files, from, to]);
  const ready = from !== '' && to !== '' && from !== to;
  const summary = api.translations.compareSummary.useQuery(
    { fromFileId: from, toFileId: to },
    { enabled: ready },
  );
  const rows = api.translations.compare.useQuery(
    { fromFileId: from, toFileId: to, kind, q, page },
    { enabled: ready, placeholderData: (previous) => previous },
  );
  const fileText = (id: string) => {
    const f = files.find((x) => x.id === id);
    return f ? `${f.version} ${f.language}` : '';
  };
  const total = rows.data?.total ?? 0;
  const pageSize = rows.data?.pageSize ?? 50;

  if (!overview.data)
    return <p className="text-(--faded) text-sm">Cargando…</p>;
  if (files.length < 2)
    return (
      <p className="text-(--faded) text-sm">
        Hacen falta al menos dos ficheros para comparar.
      </p>
    );
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className={label} htmlFor="cmp-from">
            De
          </label>
          <select
            className={select}
            id="cmp-from"
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(0);
            }}
            value={from}
          >
            {files.map((f) => (
              <option key={f.id} value={f.id}>
                {f.gameName} {f.version} · {f.language}
                {f.source ? ` · ${f.source}` : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="cmp-to">
            A
          </label>
          <select
            className={select}
            id="cmp-to"
            onChange={(e) => {
              setTo(e.target.value);
              setPage(0);
            }}
            value={to}
          >
            {files.map((f) => (
              <option key={f.id} value={f.id}>
                {f.gameName} {f.version} · {f.language}
                {f.source ? ` · ${f.source}` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-60 grow">
          <label className={label} htmlFor="cmp-q">
            Buscar
          </label>
          <input
            className={input}
            id="cmp-q"
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
            value={q}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {KINDS.map((k) => (
          <button
            className={`${chip} ${
              kind === k.value
                ? 'border-(--hair-gold) bg-(--night-2) text-(--gold)'
                : 'border-(--hair) text-(--faded) hover:border-(--hair-gold)'
            }`}
            key={k.value}
            onClick={() => {
              setKind(k.value);
              setPage(0);
            }}
            type="button"
          >
            {k.text}
            {summary.data ? ` · ${summary.data[k.value]}` : ''}
          </button>
        ))}
      </div>
      {!ready ? (
        <p className="text-(--faded) text-sm">Elige dos ficheros distintos.</p>
      ) : (
        <div>
          <RowHead columns={COLUMNS}>
            <span>Clave</span>
            <span>
              {kind === 'changed'
                ? `${fileText(from)} → ${fileText(to)}`
                : 'Texto'}
            </span>
            <span />
          </RowHead>
          {rows.data?.rows.map((row) => (
            <Row columns={COLUMNS} key={row.key}>
              <span className="break-all font-mono text-(--gold-hi) text-xs">
                {row.key}
              </span>
              <Cell label="Texto">
                {kind === 'changed' && row.before && row.after ? (
                  <StrDiff
                    after={valueText(row.after) ?? row.after}
                    before={valueText(row.before) ?? row.before}
                  />
                ) : (
                  <StrText value={row.after ?? row.before} />
                )}
              </Cell>
              <span className="md:text-right">
                <Link
                  className={`${btn.ghost} px-3 py-1 text-xs`}
                  href={`/translations?key=${encodeURIComponent(row.key)}`}
                >
                  Cadena propia
                </Link>
              </span>
            </Row>
          ))}
          <div className="mt-3 flex items-center justify-between text-(--faded) text-xs">
            <span>
              {total === 0
                ? 'Nada que mostrar'
                : `${page * pageSize + 1}–${Math.min(total, (page + 1) * pageSize)} de ${total}`}
              {rows.isFetching ? ' · buscando…' : ''}
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
                disabled={(page + 1) * pageSize >= total}
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

export { CompareView };
