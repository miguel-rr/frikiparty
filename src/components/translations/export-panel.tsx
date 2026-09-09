'use client';

import { useEffect, useState } from 'react';

import { btn, label, panel, panelGold } from '@/components/theme/primitives';
import { api } from '@/trpc/react';

const select =
  'w-full appearance-none rounded-lg border border-(--hair) bg-(--night-2) px-3 py-2 text-(--parchment) text-sm transition-colors hover:border-(--hair-gold) focus:border-(--gold) focus:outline-none';

const KeyList = ({ keys }: { keys: string[] }) => (
  <ul className="mt-1 flex flex-wrap gap-1.5">
    {keys.slice(0, 60).map((key) => (
      <li className="font-mono text-(--parchment) text-2xs" key={key}>
        {key}
      </li>
    ))}
    {keys.length > 60 ? (
      <li className="text-(--faded) text-xs">… y {keys.length - 60} más</li>
    ) : null}
  </ul>
);

/** Pick the Spanish base and the English filler, read what goes in, download. */
const ExportPanel = () => {
  const overview = api.translations.overview.useQuery();
  const [esId, setEsId] = useState('');
  const [enId, setEnId] = useState<string>('');
  const files = overview.data?.files ?? [];
  const esFiles = files.filter((f) => f.language === 'es');
  const enFiles = files.filter((f) => f.language === 'en');
  useEffect(() => {
    if (!esId && overview.data?.latest.es) setEsId(overview.data.latest.es.id);
    if (!enId && overview.data?.latest.en) setEnId(overview.data.latest.en.id);
  }, [overview.data, esId, enId]);
  const summary = api.translations.exportSummary.useQuery(
    { esFileId: esId, enFileId: enId || null },
    { enabled: esId !== '' },
  );
  if (!overview.data)
    return <p className="text-(--faded) text-sm">Cargando…</p>;
  if (esFiles.length === 0)
    return (
      <p className="text-(--faded) text-sm">
        Hace falta al menos una traducción española subida para exportar.
      </p>
    );
  const href = `/api/translations/export?es=${esId}${enId ? `&en=${enId}` : ''}`;
  const data = summary.data;
  return (
    <div className="flex flex-col gap-6">
      <div className={`${panelGold} grid gap-4 p-5 sm:grid-cols-2`}>
        <div>
          <label className={label} htmlFor="exp-es">
            Base: traducción española
          </label>
          <select
            className={select}
            id="exp-es"
            onChange={(e) => setEsId(e.target.value)}
            value={esId}
          >
            {esFiles.map((f) => (
              <option key={f.id} value={f.id}>
                {f.gameName} {f.version}
                {f.source ? ` · ${f.source}` : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="exp-en">
            Relleno: original para las claves que falten
          </label>
          <select
            className={select}
            id="exp-en"
            onChange={(e) => setEnId(e.target.value)}
            value={enId}
          >
            <option value="">Sin relleno</option>
            {enFiles.map((f) => (
              <option key={f.id} value={f.id}>
                {f.gameName} {f.version}
                {f.source ? ` · ${f.source}` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>
      {data ? (
        <div className={`${panel} flex flex-col gap-3 p-5 text-sm`}>
          <p className="text-(--parchment)">
            Se aplican <strong>{data.overrides}</strong> cadenas propias sobre
            el español {data.es.version}
            {data.en && data.appended.length > 0 ? (
              <>
                {' '}
                y se añaden <strong>{data.appended.length}</strong> claves del
                original {data.en.version} que la traducción no tiene
              </>
            ) : null}
            .
          </p>
          {data.inReview.length > 0 ? (
            <div className="text-(--gold-hi)">
              {data.inReview.length} cadenas siguen en revisión; se exportan tal
              cual están.
              <KeyList keys={data.inReview} />
            </div>
          ) : null}
          {data.unencodable.length > 0 ? (
            <div className="text-(--ember)">
              Caracteres que el juego no puede mostrar (saldrán como ?):
              <ul className="mt-1 flex flex-col gap-0.5">
                {data.unencodable.map((row) => (
                  <li className="font-mono text-2xs" key={row.key}>
                    {row.key}: {row.chars.join(' ')}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {data.orphans.length > 0 ? (
            <div className="text-(--faded)">
              Cadenas propias cuya clave no existe en ninguno de los dos
              ficheros; se quedan fuera:
              <KeyList keys={data.orphans} />
            </div>
          ) : null}
          {data.appended.length > 0 ? (
            <details className="text-(--faded)">
              <summary className="cursor-pointer">
                Claves que se rellenan desde el original
              </summary>
              <KeyList keys={data.appended} />
            </details>
          ) : null}
        </div>
      ) : summary.error ? (
        <p className="text-(--ember) text-sm">{summary.error.message}</p>
      ) : null}
      <div>
        <a className={btn.primary} download="lotr.str" href={href}>
          Descargar lotr.str
        </a>
        <p className="mt-2 text-(--faded) text-xs">
          Windows-1252 y saltos CRLF, como lo espera el juego. Va en
          <span className="font-mono"> aotr/data/lotr.str</span>.
        </p>
      </div>
    </div>
  );
};

export { ExportPanel };
