'use client';

import Link from 'next/link';
import { useState } from 'react';

import { btn, input, label, panelGold } from '@/components/theme/primitives';
import type { AdminPoll } from '@/server/api/routers/poll';
import { api } from '@/trpc/react';

const PAGE_PATHS: Record<string, string> = {
  'team-formation-2026': '/polls/team-formation-2026',
};

const PHASE_TEXT = {
  waiting: 'Aún no abierta',
  open: 'Abierta',
  closed: 'Cerrada',
} as const;

const pad = (n: number) => String(n).padStart(2, '0');

/** A date as the browser's local `datetime-local` value. */
const toLocalInput = (date: Date | null) =>
  date
    ? `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
    : '';

const fromLocalInput = (value: string) => (value ? new Date(value) : null);

const Toggle = ({
  checked,
  onChange,
  text,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  text: string;
  disabled?: boolean;
}) => (
  <button
    aria-pressed={checked}
    className={`flex items-center gap-3 rounded-lg border px-4 py-2 text-sm transition-colors ${
      checked
        ? 'border-(--gold) bg-(--gold)/10 text-(--gold-hi)'
        : 'border-(--hair) text-(--faded) hover:border-(--hair-gold)'
    }`}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    type="button"
  >
    <span
      aria-hidden
      className={`relative h-5 w-9 rounded-full transition-colors ${checked ? 'bg-(--gold)' : 'bg-(--night-2) shadow-[inset_0_0_0_1px_var(--hair)]'}`}
    >
      <span
        className={`absolute top-0.5 size-4 rounded-full bg-(--parchment) transition-[left] ${checked ? 'left-4.5' : 'left-0.5'}`}
      />
    </span>
    {text}
  </button>
);

/** A date-and-time field that saves on demand and can be cleared. */
const TimeField = ({
  title,
  hint,
  value,
  onSave,
  disabled,
}: {
  title: string;
  hint: string;
  value: Date | null;
  onSave: (next: Date | null) => void;
  disabled?: boolean;
}) => {
  const [draft, setDraft] = useState(toLocalInput(value));
  const changed = draft !== toLocalInput(value);
  return (
    <div className="flex flex-col gap-1">
      <span className={label}>{title}</span>
      <div className="flex flex-wrap items-center gap-2">
        <input
          className={`${input} w-auto py-1.5 text-sm`}
          onChange={(event) => setDraft(event.target.value)}
          type="datetime-local"
          value={draft}
        />
        <button
          className={btn.primary}
          disabled={disabled || !changed}
          onClick={() => onSave(fromLocalInput(draft))}
          type="button"
        >
          Guardar
        </button>
        {value ? (
          <button
            className={btn.outline}
            disabled={disabled}
            onClick={() => {
              setDraft('');
              onSave(null);
            }}
            type="button"
          >
            Quitar
          </button>
        ) : null}
      </div>
      <span className="text-(--faded) text-xs">{hint}</span>
    </div>
  );
};

const TextEditor = ({
  poll,
  onDone,
}: {
  poll: AdminPoll;
  onDone: () => void;
}) => {
  const [question, setQuestion] = useState(poll.question);
  const [labels, setLabels] = useState<Record<string, string>>(
    Object.fromEntries(
      poll.options.map((option) => [option.key, option.label]),
    ),
  );
  const edit = api.pollAdmin.editText.useMutation({ onSuccess: onDone });
  if (poll.votes > 0) {
    return (
      <p className="text-(--faded) text-xs">
        Ya hay votos: la pregunta y las opciones no se pueden cambiar.
      </p>
    );
  }
  return (
    <details className="flex flex-col gap-3">
      <summary className="cursor-pointer font-bold text-(--gold) text-sm">
        Editar la pregunta y las opciones
      </summary>
      <div className="flex flex-col gap-3 pt-3">
        <label className="flex flex-col gap-1">
          <span className={label}>Pregunta</span>
          <input
            className={input}
            onChange={(event) => setQuestion(event.target.value)}
            value={question}
          />
        </label>
        {poll.options.map((option) => (
          <label className="flex flex-col gap-1" key={option.key}>
            <span className={label}>Opción · {option.key}</span>
            <input
              className={input}
              onChange={(event) =>
                setLabels({ ...labels, [option.key]: event.target.value })
              }
              value={labels[option.key] ?? ''}
            />
          </label>
        ))}
        <button
          className={`${btn.primary} self-start`}
          disabled={edit.isPending}
          onClick={() => edit.mutate({ id: poll.id, question, labels })}
          type="button"
        >
          Guardar texto
        </button>
        {edit.error ? (
          <span className="text-(--ember) text-sm">{edit.error.message}</span>
        ) : null}
      </div>
    </details>
  );
};

const PollRow = ({ poll, onDone }: { poll: AdminPoll; onDone: () => void }) => {
  const update = api.pollAdmin.update.useMutation({ onSuccess: onDone });
  const closeNow = api.pollAdmin.closeNow.useMutation({ onSuccess: onDone });
  const busy = update.isPending || closeNow.isPending;
  const path = PAGE_PATHS[poll.page];
  return (
    <div className={`${panelGold} flex flex-col gap-5 p-5 sm:p-6`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-(--gold) text-2xs uppercase tracking-2xl">
            {poll.page} · {PHASE_TEXT[poll.phase]}
            {poll.visible ? '' : ' · oculta'}
          </span>
          <h3 className="d-display font-bold text-(--parchment) text-xl uppercase">
            {poll.question}
          </h3>
        </div>
        {path ? (
          <Link className={btn.outline} href={path}>
            Ver la página
          </Link>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-3">
        <Toggle
          checked={poll.visible}
          disabled={busy}
          onChange={(visible) => update.mutate({ id: poll.id, visible })}
          text={poll.visible ? 'Visible' : 'Oculta'}
        />
        <Toggle
          checked={poll.votingOpen}
          disabled={busy}
          onChange={(votingOpen) => update.mutate({ id: poll.id, votingOpen })}
          text={poll.votingOpen ? 'Votación abierta' : 'Votación en pausa'}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <TimeField
          disabled={busy}
          hint="Opcional. Se abre sola a esa hora, aunque esté en pausa."
          key={`opens-${poll.opensAt?.getTime() ?? 'none'}`}
          onSave={(opensAt) => update.mutate({ id: poll.id, opensAt })}
          title="Apertura programada"
          value={poll.opensAt}
        />
        <TimeField
          disabled={busy}
          hint="Opcional. Sin hora de cierre, sigue abierta hasta que pongas una."
          key={`closes-${poll.closesAt?.getTime() ?? 'none'}`}
          onSave={(closesAt) => update.mutate({ id: poll.id, closesAt })}
          title="Cierre"
          value={poll.closesAt}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-(--hair-gold) border-t pt-4">
        <span className="text-(--faded) text-sm">
          Han votado{' '}
          <strong className="text-(--parchment)">{poll.votes}</strong> de{' '}
          {poll.eligible} confirmados · resultados con {poll.quorum}
        </span>
        {poll.phase === 'closed' ? null : (
          <button
            className={btn.outline}
            disabled={busy}
            onClick={() => {
              if (window.confirm('¿Cerrar la votación ahora?')) {
                closeNow.mutate({ id: poll.id });
              }
            }}
            type="button"
          >
            Cerrar ahora
          </button>
        )}
      </div>

      <TextEditor onDone={onDone} poll={poll} />

      {update.error || closeNow.error ? (
        <span className="text-(--ember) text-sm">
          {(update.error ?? closeNow.error)?.message}
        </span>
      ) : null}
    </div>
  );
};

/** Every poll with its switches; the results stay out of here too. */
const PollsAdmin = () => {
  const polls = api.pollAdmin.list.useQuery();
  if (!polls.data) return <p className="text-(--faded) text-sm">Cargando…</p>;
  if (polls.data.length === 0) {
    return <p className="text-(--faded) text-sm">No hay encuestas.</p>;
  }
  return (
    <div className="flex flex-col gap-6">
      {polls.data.map((poll) => (
        <PollRow key={poll.id} onDone={() => polls.refetch()} poll={poll} />
      ))}
    </div>
  );
};

export { PollsAdmin };
