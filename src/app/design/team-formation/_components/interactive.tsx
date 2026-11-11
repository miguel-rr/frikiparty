'use client';

import Link from 'next/link';
import { type ReactNode, useState } from 'react';

import { btn, panel, panelGold, tag } from '@/components/theme/primitives';

/**
 * Client pieces of the team-formation mockup: tabs, accordion, the annex
 * link that scrolls to its note and lights it up for a few seconds, and
 * the poll card in every state it can be in.
 */

const FLASH = ['ring-2', 'ring-(--gold)', 'bg-(--gold)/10'];
const FLASH_MS = 3200;

/** Scrolls to an annex and lights it up for a few seconds. */
const AnnexLink = ({
  target,
  children,
}: {
  target: string;
  children: ReactNode;
}) => (
  <a
    className="inline-flex items-center gap-1 rounded-full border border-(--hair-gold) px-2.5 py-0.5 font-mono text-(--gold) text-2xs uppercase tracking-xl transition-colors hover:border-(--gold) hover:text-(--gold-hi)"
    href={`#${target}`}
    onClick={(event) => {
      const node = document.getElementById(target);
      if (!node) return;
      event.preventDefault();
      node.scrollIntoView({ behavior: 'smooth', block: 'center' });
      node.classList.add(...FLASH);
      window.setTimeout(() => node.classList.remove(...FLASH), FLASH_MS);
    }}
  >
    § {children}
  </a>
);

type TabItem = { key: string; label: string; badge?: string; node: ReactNode };

const Tabs = ({ items, initial }: { items: TabItem[]; initial?: string }) => {
  const [active, setActive] = useState(initial ?? items[0]?.key ?? '');
  const current = items.find((item) => item.key === active) ?? items[0];
  return (
    <div className="flex flex-col gap-5">
      <div
        aria-label="Propuestas"
        className="grid grid-cols-3 gap-1 rounded-full border border-(--hair-gold) bg-(--night-2) p-1"
        role="tablist"
      >
        {items.map((item) => {
          const selected = item.key === current?.key;
          return (
            <button
              aria-selected={selected}
              className={`flex cursor-pointer flex-col items-center rounded-full px-2 py-2 font-bold font-mono text-2xs uppercase tracking-xl transition-colors sm:text-xs ${
                selected
                  ? 'bg-(--gold)/15 text-(--gold-hi) shadow-[inset_0_0_0_1px_var(--gold)]'
                  : 'text-(--faded) hover:text-(--parchment)'
              }`}
              key={item.key}
              onClick={() => setActive(item.key)}
              role="tab"
              type="button"
            >
              {item.label}
              {item.badge ? (
                <span className="text-(--gold) text-3xs">{item.badge}</span>
              ) : null}
            </button>
          );
        })}
      </div>
      {current?.node}
    </div>
  );
};

const Accordion = ({
  items,
  initial,
}: {
  items: TabItem[];
  initial?: string;
}) => {
  const [open, setOpen] = useState<string | null>(initial ?? null);
  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => {
        const expanded = open === item.key;
        return (
          <div
            className={`${expanded ? panelGold : panel} overflow-hidden`}
            key={item.key}
          >
            <button
              aria-expanded={expanded}
              className="flex w-full cursor-pointer items-center justify-between gap-3 px-5 py-4 text-left"
              onClick={() => setOpen(expanded ? null : item.key)}
              type="button"
            >
              <span className="flex flex-wrap items-center gap-3">
                <span className="d-display font-bold text-(--parchment) text-lg uppercase">
                  {item.label}
                </span>
                {item.badge ? <span className={tag}>{item.badge}</span> : null}
              </span>
              <span
                aria-hidden
                className={`text-(--gold) transition-transform ${expanded ? 'rotate-180' : ''}`}
              >
                ▾
              </span>
            </button>
            {expanded ? <div className="px-5 pb-5">{item.node}</div> : null}
          </div>
        );
      })}
    </div>
  );
};

/* ── Polls ──────────────────────────────────────────────────── */

type PollState =
  | 'anonymous'
  | 'not_confirmed'
  | 'open'
  | 'voted_waiting'
  | 'results'
  | 'closed';

type PollOption = { key: string; label: string; votes: number };

const TOTAL = 20;
const QUORUM = 11;

/** Votes so far against everyone who can vote, with the quorum notch. */
const TurnoutBar = ({ votes }: { votes: number }) => {
  const reached = votes >= QUORUM;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative h-2.5 rounded-full bg-(--night-2) shadow-[inset_0_0_0_1px_var(--hair)]">
        <div
          className={`h-full rounded-full ${reached ? 'bg-linear-to-r from-(--gold) to-(--gold-hi)' : 'bg-(--gold)/55'}`}
          style={{ width: `${(votes / TOTAL) * 100}%` }}
        />
        <span
          aria-hidden
          className="absolute -top-1.5 h-5.5 w-0.5 rounded bg-(--parchment)"
          style={{ left: `${(QUORUM / TOTAL) * 100}%` }}
        />
      </div>
      <div className="flex justify-between font-mono text-(--faded) text-2xs uppercase tracking-xl">
        <span>
          <strong className="text-(--parchment)">{votes}</strong> de {TOTAL} han
          votado
        </span>
        <span>
          {reached
            ? 'Resultados visibles'
            : `Resultados con ${QUORUM} · faltan ${QUORUM - votes}`}
        </span>
      </div>
    </div>
  );
};

const ResultBars = ({
  options,
  mine,
  winner,
}: {
  options: PollOption[];
  mine?: string;
  winner?: boolean;
}) => {
  const total = options.reduce((sum, option) => sum + option.votes, 0);
  const top = Math.max(...options.map((option) => option.votes));
  return (
    <div className="flex flex-col gap-3">
      {options.map((option) => {
        const share = total ? Math.round((option.votes / total) * 100) : 0;
        const leading = winner && option.votes === top;
        return (
          <div className="flex flex-col gap-1" key={option.key}>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span
                className={
                  leading ? 'font-bold text-(--gold-hi)' : 'text-(--parchment)'
                }
              >
                {leading ? '♛ ' : ''}
                {option.label}
                {mine === option.key ? (
                  <span className="ml-2 font-mono text-(--gold) text-2xs uppercase tracking-xl">
                    tu voto
                  </span>
                ) : null}
              </span>
              <span className="font-mono text-(--faded) text-xs">
                {share}% · {option.votes}
              </span>
            </div>
            <div className="h-2 rounded-full bg-(--night-2)">
              <div
                className={`h-full rounded-full ${leading ? 'bg-linear-to-r from-(--gold) to-(--gold-hi)' : 'bg-(--faded)/45'}`}
                style={{ width: `${share}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

const OptionButtons = ({
  options,
  chosen,
  onChoose,
  disabled,
}: {
  options: PollOption[];
  chosen: string | null;
  onChoose?: (key: string) => void;
  disabled?: boolean;
}) => (
  <div className="flex flex-col gap-2">
    {options.map((option) => (
      <button
        aria-pressed={chosen === option.key}
        className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors disabled:cursor-not-allowed ${
          chosen === option.key
            ? 'border-(--gold) bg-(--gold)/10 text-(--gold-hi)'
            : 'border-(--hair) text-(--parchment) hover:border-(--hair-gold)'
        }`}
        disabled={disabled}
        key={option.key}
        onClick={() => onChoose?.(option.key)}
        type="button"
      >
        <span
          aria-hidden
          className={`grid size-4.5 flex-none place-items-center rounded-full border ${
            chosen === option.key ? 'border-(--gold)' : 'border-(--faded)/60'
          }`}
        >
          {chosen === option.key ? (
            <span className="size-2.5 rounded-full bg-(--gold)" />
          ) : null}
        </span>
        {option.label}
      </button>
    ))}
  </div>
);

/** One poll in one state (the mockup shows every state side by side). */
const PollCard = ({
  question,
  options,
  state,
  votes,
  mine,
}: {
  question: string;
  options: PollOption[];
  state: PollState;
  votes: number;
  mine?: string;
}) => {
  const [chosen, setChosen] = useState<string | null>(mine ?? null);
  const deadline = 'Cierra el jueves 12 a las 22:00';
  return (
    <div className={`${panelGold} d-corners flex flex-col gap-5 p-5 sm:p-6`}>
      <span className="d-corner-b" />
      <div className="flex flex-col gap-1">
        <span className="font-mono text-(--gold) text-2xs uppercase tracking-2xl">
          Votación · {state === 'closed' ? 'cerrada' : deadline}
        </span>
        <h3 className="d-display font-bold text-(--parchment) text-xl uppercase">
          {question}
        </h3>
      </div>

      {state === 'anonymous' ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-(--gold)/50 border-dashed bg-(--night-2)/70 px-4 py-6 text-center">
          <span aria-hidden className="text-3xl">
            🔒
          </span>
          <p className="max-w-[36ch] text-(--parchment)">
            Para votar y ver los resultados tienes que{' '}
            <strong>entrar con tu cuenta</strong>.
          </p>
          <Link
            className={`${btn.primary} px-8 py-3 text-lg`}
            href="/login?next=/polls/team-formation-2026"
          >
            Entrar para votar
          </Link>
          <span className="text-(--faded) text-xs">
            Al entrar vuelves aquí mismo.
          </span>
        </div>
      ) : null}

      {state === 'not_confirmed' ? (
        <p className="rounded-lg border border-(--hair) bg-(--night-2)/70 px-4 py-4 text-(--faded) text-sm">
          Solo votan los jugadores confirmados para la Frikiparty 2026. Si vas a
          venir, confirma tu asistencia y vuelve.
        </p>
      ) : null}

      {state === 'open' ? (
        <div className="flex flex-col gap-4">
          <OptionButtons
            chosen={chosen}
            onChoose={setChosen}
            options={options}
          />
          <button
            className={`${btn.primary} self-start`}
            disabled={!chosen}
            type="button"
          >
            Votar
          </button>
          <span className="text-(--faded) text-xs">
            Tu voto es anónimo y puedes cambiarlo hasta el cierre.
          </span>
        </div>
      ) : null}

      {state === 'voted_waiting' ? (
        <div className="flex flex-col gap-3">
          <p className="text-(--parchment)">
            Has votado{' '}
            <strong className="text-(--gold-hi)">
              {options.find((option) => option.key === mine)?.label}
            </strong>
            . Los resultados se abren cuando haya votado la mitad más uno.
          </p>
          <button className={`${btn.ghost} self-start px-0`} type="button">
            Cambiar mi voto
          </button>
        </div>
      ) : null}

      {state === 'results' || state === 'closed' ? (
        <ResultBars mine={mine} options={options} winner={state === 'closed'} />
      ) : null}

      {state === 'anonymous' ? null : <TurnoutBar votes={votes} />}
    </div>
  );
};

/** Variant B of the open poll: the options as big tokens. */
const TokenPoll = ({
  question,
  options,
}: {
  question: string;
  options: (PollOption & { hint: string })[];
}) => {
  const [chosen, setChosen] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-5">
      <h3 className="d-display text-center font-bold text-(--parchment) text-2xl uppercase">
        {question}
      </h3>
      <div className="grid gap-3 sm:grid-cols-3">
        {options.map((option) => (
          <button
            aria-pressed={chosen === option.key}
            className={`flex cursor-pointer flex-col items-center gap-2 rounded-2xl border px-4 py-6 text-center transition ${
              chosen === option.key
                ? 'border-(--gold) bg-(--gold)/12 shadow-[0_0_24px_rgba(201,165,87,0.25)]'
                : 'border-(--hair) bg-(--panel) hover:border-(--hair-gold)'
            }`}
            key={option.key}
            onClick={() => setChosen(option.key)}
            type="button"
          >
            <span
              className={`d-display font-black text-3xl uppercase ${chosen === option.key ? 'd-gold-text' : 'text-(--parchment)'}`}
            >
              {option.label}
            </span>
            <span className="text-(--faded) text-xs">{option.hint}</span>
          </button>
        ))}
      </div>
      <button
        className={`${btn.primary} self-center px-10`}
        disabled={!chosen}
        type="button"
      >
        {chosen
          ? `Votar ${options.find((option) => option.key === chosen)?.label}`
          : 'Elige una'}
      </button>
      <TurnoutBar votes={7} />
    </div>
  );
};

export {
  Accordion,
  AnnexLink,
  PollCard,
  type PollOption,
  type PollState,
  type TabItem,
  Tabs,
  TokenPoll,
  TurnoutBar,
};
