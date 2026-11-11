import Link from 'next/link';

import {
  btn,
  CoinStack,
  linkGold,
  panel,
  panelGold,
  tag,
} from '@/components/theme/primitives';

import { AnnexLink } from './annex-link';
import {
  ADVANTAGES,
  ANNEXES,
  type Annex,
  AUCTION,
  annexById,
  OPENING,
  PAGE_PATH,
  PROPOSALS,
  type Proposal,
  WHY_FREE,
} from './content';

const SCOPE_NAMES = {
  free: 'Libre',
  intermediate: 'Intermedia',
  strict: 'Estricta',
} as const;

/** The signed act that opens the page. */
const Opening = () => (
  <div
    className={`${panelGold} d-corners mx-auto flex max-w-3xl flex-col gap-6 p-7 sm:p-10`}
  >
    <span className="d-corner-b" />
    <span className={`${tag} self-center`}>{OPENING.tag}</span>
    <h1 className="d-display text-center font-black text-(--parchment) text-3xl uppercase leading-tight sm:text-4xl">
      {OPENING.titleTop}
      <br />
      <span className="d-gold-text">{OPENING.titleGold}</span>
    </h1>
    {OPENING.paragraphs.map((paragraph, index) => (
      <p
        className={
          index === 0
            ? 'text-(--parchment) text-lg first-letter:float-left first-letter:mr-2 first-letter:font-black first-letter:text-(--gold) first-letter:text-6xl first-letter:leading-[0.8]'
            : 'text-(--faded)'
        }
        key={paragraph.slice(0, 24)}
      >
        {paragraph}
      </p>
    ))}
    <div className="flex flex-wrap items-end justify-between gap-6 border-(--hair-gold) border-t pt-5">
      <span className="font-mono text-(--faded) text-2xs uppercase tracking-xl">
        {OPENING.given}
      </span>
      <div className="flex gap-8">
        {OPENING.signatures.map((person) => (
          <span className="flex flex-col items-center gap-1" key={person.name}>
            <span className="font-[cursive] text-(--gold-hi) text-xl italic">
              {person.name}
            </span>
            <span className="h-px w-24 bg-(--hair-gold)" />
            <span className="font-mono text-(--faded) text-3xs uppercase tracking-2xl">
              {person.role}
            </span>
          </span>
        ))}
      </div>
    </div>
  </div>
);

const AuctionIntro = () => (
  <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
    <span className="flex items-center gap-3">
      <CoinStack value={100} />
      <span className="font-mono text-(--faded) text-2xs uppercase tracking-xl">
        monedas por capitán
      </span>
    </span>
    <h2 className="d-display font-bold text-3xl uppercase sm:text-4xl">
      {AUCTION.title}
    </h2>
    {AUCTION.paragraphs.map((paragraph) => (
      <p className="max-w-[60ch] text-(--faded)" key={paragraph.slice(0, 24)}>
        {paragraph}
      </p>
    ))}
    <div className="grid w-full gap-4 pt-2 text-left sm:grid-cols-2">
      {AUCTION.summaries.map((summary) => (
        <div className={`${panel} flex flex-col gap-3 p-5`} key={summary.annex}>
          <h3 className="d-display font-bold text-(--gold-hi) text-lg uppercase">
            {summary.title}
          </h3>
          <p className="text-(--faded) text-sm">{summary.text}</p>
          <AnnexLink
            bare
            className={`${btn.secondary} mt-auto self-start px-4 py-1.5 text-sm`}
            target={summary.annex}
          >
            Explicación completa ↓
          </AnnexLink>
        </div>
      ))}
    </div>
  </div>
);

/** Before (the pot draft) and now (the auction), row by row. */
const Advantages = () => (
  <div
    className={`${panel} flex flex-col divide-y divide-(--hair) overflow-hidden`}
  >
    <div className="hidden grid-cols-[1fr_1fr] gap-6 bg-(--night-2) px-5 py-3 sm:grid">
      <span className="font-mono text-(--faded) text-2xs uppercase tracking-2xl">
        Draft por bombos
      </span>
      <span className="font-mono text-(--gold) text-2xs uppercase tracking-2xl">
        Subasta
      </span>
    </div>
    {ADVANTAGES.map((advantage) => (
      <div className="flex flex-col gap-2 px-5 py-4" key={advantage.title}>
        <h3 className="font-bold text-(--gold-hi)">{advantage.title}</h3>
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr] sm:gap-6">
          <p className="text-(--faded) text-sm">
            <span className="mr-2 font-mono text-2xs uppercase tracking-xl sm:hidden">
              Antes ·
            </span>
            {advantage.before}
          </p>
          <p className="text-(--parchment) text-sm">
            <span className="mr-2 font-mono text-(--gold) text-2xs uppercase tracking-xl sm:hidden">
              Ahora ·
            </span>
            {advantage.after}
          </p>
        </div>
      </div>
    ))}
  </div>
);

const ProposalCard = ({ proposal }: { proposal: Proposal }) => (
  <div
    className={`${
      proposal.recommended
        ? `${panelGold} lg:-translate-y-3 lg:shadow-[0_0_40px_rgba(201,165,87,0.18)]`
        : panel
    } relative flex flex-col gap-4 p-5`}
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
    <ol className="flex flex-col gap-3">
      {proposal.summary.map((step, index) => (
        <li className="flex gap-3" key={step.title}>
          <span className="grid size-7 flex-none place-items-center rounded-full border border-(--gold)/60 font-bold font-mono text-(--gold) text-xs">
            {index + 1}
          </span>
          <span className="text-sm">
            <strong className="text-(--parchment)">{step.title}.</strong>{' '}
            <span className="text-(--faded)">{step.text}</span>
          </span>
        </li>
      ))}
    </ol>
    <div className="mt-auto flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {proposal.annexes.map((id) => (
          <AnnexLink key={id} target={id}>
            {annexById(id)?.title}
          </AnnexLink>
        ))}
      </div>
      <Link className={linkGold} href={`${PAGE_PATH}/${proposal.key}`}>
        Leer la propuesta completa →
      </Link>
    </div>
  </div>
);

const Proposals = () => (
  <div className="grid gap-6 pt-3 lg:grid-cols-3 lg:gap-4">
    {PROPOSALS.map((proposal) => (
      <ProposalCard key={proposal.key} proposal={proposal} />
    ))}
  </div>
);

const WhyFree = () => (
  <div
    className={`${panelGold} d-corners mx-auto flex max-w-3xl flex-col gap-5 p-6 sm:p-8`}
  >
    <span className="d-corner-b" />
    <span className={`${tag} self-start`}>{WHY_FREE.tag}</span>
    <h2 className="d-display font-bold text-(--parchment) text-2xl uppercase">
      {WHY_FREE.title}
    </h2>
    <p className="text-(--faded)">{WHY_FREE.lead}</p>
    <div className="grid gap-4 sm:grid-cols-2">
      {WHY_FREE.captain.map((reason) => (
        <div className="flex flex-col gap-1" key={reason.title}>
          <span className="font-bold text-(--gold-hi)">{reason.title}</span>
          <span className="text-(--faded) text-sm">{reason.text}</span>
        </div>
      ))}
    </div>
    <ul className="flex flex-col gap-1.5 border-(--hair-gold) border-t pt-4 text-(--faded) text-sm">
      {WHY_FREE.everyone.map((line) => (
        <li className="flex gap-2" key={line}>
          <span aria-hidden className="text-(--gold)">
            ✦
          </span>
          {line}
        </li>
      ))}
    </ul>
  </div>
);

const AnnexCard = ({ annex, inline }: { annex: Annex; inline?: boolean }) => (
  <div
    className={`${
      inline
        ? 'rounded-r-xl border-(--gold) border-l-2 bg-(--gold)/6 px-5 py-4'
        : `${panel} p-5`
    } flex scroll-mt-24 flex-col gap-2 transition-[box-shadow,background-color] duration-700`}
    id={annex.id}
  >
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={
          inline
            ? 'font-mono text-(--gold) text-2xs uppercase tracking-2xl'
            : 'd-display font-bold text-(--parchment) uppercase'
        }
      >
        § {inline ? 'Anexo · ' : ''}
        {annex.title}
      </span>
      {annex.scope && !inline ? (
        <span className={tag}>Propuesta {SCOPE_NAMES[annex.scope]}</span>
      ) : null}
    </div>
    <p className="text-(--faded) text-sm">{annex.text}</p>
  </div>
);

/** Every annex, common ones first, then each proposal's with its tag. */
const Annexes = () => (
  <div className="flex flex-col gap-8">
    {[
      {
        title: 'Comunes a las tres',
        items: ANNEXES.filter((annex) => !annex.scope),
      },
      {
        title: 'De cada propuesta',
        items: ANNEXES.filter((annex) => annex.scope),
      },
    ].map((block) => (
      <div className="flex flex-col gap-3" key={block.title}>
        <span className="font-mono text-(--faded) text-2xs uppercase tracking-2xl">
          {block.title}
        </span>
        {block.items.map((annex) => (
          <AnnexCard annex={annex} key={annex.id} />
        ))}
      </div>
    ))}
  </div>
);

export {
  Advantages,
  AnnexCard,
  Annexes,
  AuctionIntro,
  Opening,
  Proposals,
  SCOPE_NAMES,
  WhyFree,
};
