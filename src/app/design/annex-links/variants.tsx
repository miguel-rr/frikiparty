'use client';

import Link from 'next/link';
import { type ReactNode, useState } from 'react';

import { AnnexLink } from '@/app/polls/team-formation-2026/_components/annex-link';
import {
  type AnnexId,
  annexById,
  PAGE_PATH,
  PROPOSALS,
  type Proposal,
} from '@/app/polls/team-formation-2026/_components/content';
import { linkGold, panel, panelGold } from '@/components/theme/primitives';

/** Which annex each summary step leans on. */
const STEP_ANNEXES: Record<Proposal['key'], Record<string, AnnexId[]>> = {
  free: { Ranking: ['annex-ties'], Capitanes: ['annex-volunteers'] },
  intermediate: { Ranking: ['annex-ties'], Subasta: ['annex-ringless'] },
  strict: { Ranking: ['annex-ties'], Subasta: ['annex-pots'] },
};

const firstSentence = (text: string) => `${text.split('. ')[0] ?? text}.`;

const Card = ({
  proposal,
  children,
  footer,
}: {
  proposal: Proposal;
  children: ReactNode;
  footer?: ReactNode;
}) => (
  <div
    className={`${proposal.recommended ? panelGold : panel} relative flex flex-col gap-4 p-5`}
  >
    {proposal.recommended ? (
      <span className="absolute -top-3 left-5 rounded-full bg-(--gold) px-3 py-0.5 font-bold font-mono text-(--night) text-2xs uppercase tracking-xl">
        La que defendemos
      </span>
    ) : null}
    <h3 className="d-display font-black text-(--parchment) text-2xl uppercase">
      {proposal.name}
    </h3>
    <p className="text-(--parchment) italic">{proposal.motto}</p>
    {children}
    <div className="mt-auto flex flex-col gap-3">
      {footer}
      <Link className={linkGold} href={`${PAGE_PATH}/${proposal.key}`}>
        Leer la propuesta completa →
      </Link>
    </div>
  </div>
);

const StepNumber = ({ index }: { index: number }) => (
  <span className="grid size-7 flex-none place-items-center rounded-full border border-(--gold)/60 font-bold font-mono text-(--gold) text-xs">
    {index + 1}
  </span>
);

/* A · Footnotes: a small number after the step, the notes at the foot. */
const FootnoteCard = ({ proposal }: { proposal: Proposal }) => {
  const notes: AnnexId[] = [];
  const mark = (id: AnnexId) => {
    if (!notes.includes(id)) notes.push(id);
    return notes.indexOf(id) + 1;
  };
  const steps = proposal.summary.map((step) => ({
    ...step,
    marks: (STEP_ANNEXES[proposal.key][step.title] ?? []).map((id) => ({
      id,
      n: mark(id),
    })),
  }));
  return (
    <Card
      footer={
        <ol className="flex flex-col gap-1 border-(--hair) border-t pt-3 text-xs">
          {notes.map((id, index) => (
            <li className="flex gap-2" key={id}>
              <span className="font-mono text-(--gold)">{index + 1}</span>
              <AnnexLink
                bare
                className="text-(--faded) underline decoration-(--hair-gold) underline-offset-2 hover:text-(--gold-hi)"
                target={id}
              >
                {annexById(id)?.title}
              </AnnexLink>
            </li>
          ))}
        </ol>
      }
      proposal={proposal}
    >
      <ol className="flex flex-col gap-3">
        {steps.map((step, index) => (
          <li className="flex gap-3" key={step.title}>
            <StepNumber index={index} />
            <span className="text-sm">
              <strong className="text-(--parchment)">{step.title}.</strong>{' '}
              <span className="text-(--faded)">{step.text}</span>
              {step.marks.map((m) => (
                <AnnexLink
                  bare
                  className="ml-0.5 align-super font-bold font-mono text-(--gold) text-2xs hover:text-(--gold-hi)"
                  key={m.id}
                  target={m.id}
                >
                  {m.n}
                </AnnexLink>
              ))}
            </span>
          </li>
        ))}
      </ol>
    </Card>
  );
};

/* B · Fine print: one quiet line of links at the foot of the card. */
const FinePrintCard = ({ proposal }: { proposal: Proposal }) => (
  <Card
    footer={
      <p className="border-(--hair) border-t pt-3 text-(--faded) text-xs">
        <span className="font-mono uppercase tracking-xl">Letra pequeña: </span>
        {proposal.annexes.map((id, index) => (
          <span key={id}>
            {index > 0 ? ' · ' : ''}
            <AnnexLink
              bare
              className="text-(--gold) underline decoration-(--hair-gold) underline-offset-2 hover:text-(--gold-hi)"
              target={id}
            >
              {annexById(id)?.title.toLowerCase()}
            </AnnexLink>
          </span>
        ))}
      </p>
    }
    proposal={proposal}
  >
    <Steps proposal={proposal} />
  </Card>
);

const Steps = ({ proposal }: { proposal: Proposal }) => (
  <ol className="flex flex-col gap-3">
    {proposal.summary.map((step, index) => (
      <li className="flex gap-3" key={step.title}>
        <StepNumber index={index} />
        <span className="text-sm">
          <strong className="text-(--parchment)">{step.title}.</strong>{' '}
          <span className="text-(--faded)">{step.text}</span>
        </span>
      </li>
    ))}
  </ol>
);

/* C · "?" on the step: tap for a one-line answer and the way to the annex. */
const InfoCard = ({ proposal }: { proposal: Proposal }) => {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <Card proposal={proposal}>
      <ol className="flex flex-col gap-3">
        {proposal.summary.map((step, index) => {
          const ids = STEP_ANNEXES[proposal.key][step.title] ?? [];
          const key = `${proposal.key}-${step.title}`;
          return (
            <li className="flex flex-col gap-2" key={step.title}>
              <div className="flex gap-3">
                <StepNumber index={index} />
                <span className="text-sm">
                  <strong className="text-(--parchment)">{step.title}.</strong>{' '}
                  <span className="text-(--faded)">{step.text}</span>
                  {ids.length > 0 ? (
                    <button
                      aria-expanded={open === key}
                      aria-label="Más detalle"
                      className={`ml-1.5 inline-grid size-4.5 cursor-pointer place-items-center rounded-full border align-middle font-bold font-mono text-3xs transition-colors ${
                        open === key
                          ? 'border-(--gold) bg-(--gold) text-(--night)'
                          : 'border-(--gold)/70 text-(--gold) hover:bg-(--gold)/15'
                      }`}
                      onClick={() => setOpen(open === key ? null : key)}
                      type="button"
                    >
                      ?
                    </button>
                  ) : null}
                </span>
              </div>
              {open === key
                ? ids.map((id) => {
                    const annex = annexById(id);
                    return annex ? (
                      <div
                        className="ml-10 flex flex-col gap-1 rounded-lg border border-(--hair-gold) bg-(--night-2) px-3 py-2 text-xs"
                        key={id}
                      >
                        <span className="font-bold text-(--gold-hi)">
                          {annex.title}
                        </span>
                        <span className="text-(--faded)">
                          {firstSentence(annex.text)}
                        </span>
                        <AnnexLink
                          bare
                          className="self-start text-(--gold) hover:text-(--gold-hi)"
                          target={id}
                        >
                          Leer el anexo ↓
                        </AnnexLink>
                      </div>
                    ) : null;
                  })
                : null}
            </li>
          );
        })}
      </ol>
    </Card>
  );
};

/* D · Special cases folded inside the card: no jumping anywhere. */
const FoldCard = ({ proposal }: { proposal: Proposal }) => (
  <Card
    footer={
      <details className="group rounded-lg border border-(--hair) bg-(--night-2)/60 px-4 py-2.5">
        <summary className="flex cursor-pointer list-none items-center justify-between font-mono text-(--gold) text-2xs uppercase tracking-xl">
          Casos especiales ({proposal.annexes.length})
          <span
            aria-hidden
            className="transition-transform group-open:rotate-180"
          >
            ▾
          </span>
        </summary>
        <div className="flex flex-col gap-3 pt-3">
          {proposal.annexes.map((id) => {
            const annex = annexById(id);
            return annex ? (
              <div className="flex flex-col gap-0.5 text-xs" key={id}>
                <span className="font-bold text-(--parchment)">
                  {annex.title}
                </span>
                <span className="text-(--faded)">{annex.text}</span>
              </div>
            ) : null;
          })}
        </div>
      </details>
    }
    proposal={proposal}
  >
    <Steps proposal={proposal} />
  </Card>
);

const VARIANTS = {
  footnotes: FootnoteCard,
  fineprint: FinePrintCard,
  info: InfoCard,
  fold: FoldCard,
} as const;

const ProposalRow = ({ variant }: { variant: keyof typeof VARIANTS }) => {
  const Variant = VARIANTS[variant];
  return (
    <div className="grid gap-6 pt-3 lg:grid-cols-3 lg:gap-4">
      {PROPOSALS.map((proposal) => (
        <Variant key={proposal.key} proposal={proposal} />
      ))}
    </div>
  );
};

export { ProposalRow };
