import Link from 'next/link';

import { BioParchment } from '@/components/players/bio-parchment';
import {
  CoinStack,
  linkGold,
  PlayerBlazon,
  panel,
  panelGold,
  tag,
} from '@/components/theme/primitives';
import { TheRing } from '@/components/theme/ring';

import {
  ADVANTAGES,
  ANNEXES,
  CAPTAIN_REASONS,
  EDICT,
  PROPOSALS,
  type Proposal,
} from './content';
import { Accordion, AnnexLink, Tabs } from './interactive';

const DEPARTMENT =
  'Departamento de Sistemas de Conformación de Equipos y Competición';

const Signatories = () => (
  <div className="flex flex-wrap justify-center gap-10">
    {[
      { name: 'Armonds', role: 'Presidente' },
      { name: 'Palons', role: 'Secretario' },
    ].map((person) => (
      <div className="flex flex-col items-center gap-2" key={person.name}>
        <PlayerBlazon name={person.name} size="md" />
        <span className="font-[cursive] text-(--gold-hi) text-2xl italic">
          {person.name}
        </span>
        <span className="font-mono text-(--faded) text-2xs uppercase tracking-2xl">
          {person.role}
        </span>
      </div>
    ))}
  </div>
);

/* ── 1. Solemn opening ─────────────────────────────────────── */

const HeaderEdict = () => (
  <div className="flex flex-col items-center gap-6">
    <span className="text-center font-mono text-(--gold) text-2xs uppercase tracking-3xl">
      {DEPARTMENT}
    </span>
    <h1 className="d-display d-gold-text text-center font-black text-4xl uppercase sm:text-5xl">
      La Subasta
    </h1>
    <BioParchment text={EDICT.join('\n\n')} />
  </div>
);

const HeaderRing = () => (
  <div className="flex flex-col items-center gap-8 text-center">
    <TheRing className="w-[min(70vw,300px)]" title="Propuesta 2026">
      <span className="font-bold font-mono text-(--gold) text-2xs uppercase tracking-4xl">
        Propuesta
      </span>
      <span className="d-display d-gold-text font-black text-5xl leading-none">
        2026
      </span>
    </TheRing>
    <div className="flex flex-col items-center gap-3">
      <span className="font-mono text-(--faded) text-2xs uppercase tracking-3xl">
        {DEPARTMENT}
      </span>
      <h1 className="d-display font-black text-(--parchment) text-4xl uppercase sm:text-5xl">
        Formación de equipos
      </h1>
      {EDICT.map((paragraph) => (
        <p className="max-w-[58ch] text-(--faded)" key={paragraph.slice(0, 20)}>
          {paragraph}
        </p>
      ))}
    </div>
    <Signatories />
  </div>
);

const HeaderSealed = () => (
  <div
    className={`${panelGold} d-corners mx-auto flex max-w-3xl flex-col gap-6 p-7 sm:p-10`}
  >
    <span className="d-corner-b" />
    <span className={`${tag} self-center`}>
      Frikiparty 2026 · Propuesta oficial
    </span>
    <h1 className="d-display text-center font-black text-(--parchment) text-3xl uppercase leading-tight sm:text-4xl">
      Que cada capitán
      <br />
      <span className="d-gold-text">compre su destino</span>
    </h1>
    <p className="text-(--parchment) text-lg first-letter:float-left first-letter:mr-2 first-letter:font-black first-letter:text-(--gold) first-letter:text-6xl first-letter:leading-[0.8]">
      {EDICT[0]}
    </p>
    <p className="text-(--faded)">{EDICT[1]}</p>
    <div className="flex flex-wrap items-end justify-between gap-6 border-(--hair-gold) border-t pt-5">
      <span className="font-mono text-(--faded) text-2xs uppercase tracking-xl">
        Dado en el Concilio, a 11 de noviembre
      </span>
      <div className="flex gap-8">
        {['Armonds', 'Palons'].map((name) => (
          <span className="flex flex-col items-center" key={name}>
            <span className="font-[cursive] text-(--gold-hi) text-xl italic">
              {name}
            </span>
            <span className="h-px w-24 bg-(--hair-gold)" />
          </span>
        ))}
      </div>
    </div>
  </div>
);

/* ── 2. The auction and its advantages ─────────────────────── */

const AuctionIntro = () => (
  <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
    <span className="flex items-center gap-3">
      <CoinStack value={100} />
      <span className="font-mono text-(--faded) text-2xs uppercase tracking-xl">
        monedas por capitán
      </span>
    </span>
    <h2 className="d-display font-bold text-3xl uppercase sm:text-4xl">
      El centro: la subasta
    </h2>
    <p className="max-w-[60ch] text-(--faded)">
      Todas las propuestas acaban igual: los capitanes pujan por los jugadores
      con sobre cerrado. Lo que cambia entre ellas es lo de antes: el ranking,
      los bombos y quién es capitán. Para eso traemos{' '}
      <strong className="text-(--parchment)">tres opciones</strong>.
    </p>
  </div>
);

const AdvantagesVersus = () => (
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
      <div
        className="grid gap-2 px-5 py-4 sm:grid-cols-[1fr_1fr] sm:gap-6"
        key={advantage.title}
      >
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
    ))}
  </div>
);

const AdvantagesSeals = () => (
  <div className="grid gap-4 sm:grid-cols-2">
    {ADVANTAGES.map((advantage) => (
      <div className={`${panelGold} flex gap-4 p-5`} key={advantage.title}>
        <span
          aria-hidden
          className="grid size-12 flex-none place-items-center rounded-full border border-(--gold)/60 bg-(--gold)/10 text-2xl"
        >
          {advantage.icon}
        </span>
        <div className="flex flex-col gap-1">
          <h3 className="d-display font-bold text-(--parchment) uppercase">
            {advantage.title}
          </h3>
          <p className="text-(--faded) text-sm">{advantage.after}</p>
        </div>
      </div>
    ))}
  </div>
);

const AdvantagesComplaints = () => (
  <div className="flex flex-col gap-4">
    {ADVANTAGES.slice(0, 3).map((advantage, index) => (
      <div
        className={`flex flex-col gap-3 sm:flex-row sm:items-center ${index % 2 ? 'sm:flex-row-reverse' : ''}`}
        key={advantage.title}
      >
        <blockquote className="flex-1 rounded-xl border-(--ember)/60 border-l-4 bg-(--night-2) px-5 py-4 text-(--faded) italic">
          «{advantage.before}»
        </blockquote>
        <span
          aria-hidden
          className="self-center text-(--gold) text-2xl sm:rotate-0"
        >
          ➜
        </span>
        <p className={`${panelGold} flex-1 px-5 py-4 text-(--parchment)`}>
          {advantage.after}
        </p>
      </div>
    ))}
  </div>
);

/* ── 3. The three proposals ────────────────────────────────── */

const RECOMMENDED = 'free';

const ProposalBody = ({ proposal }: { proposal: Proposal }) => (
  <div className="flex flex-col gap-4">
    <p className="text-(--parchment) italic">{proposal.motto}</p>
    <ol className="flex flex-col gap-3">
      {proposal.steps.map((step, index) => (
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
    <div className="flex flex-wrap gap-2">
      {proposal.annexes.map((annex) => (
        <AnnexLink key={annex.id} target={annex.id}>
          {annex.label}
        </AnnexLink>
      ))}
    </div>
    <Link
      className={linkGold}
      href={`/polls/team-formation-2026/${proposal.key}`}
    >
      Leer la propuesta completa →
    </Link>
  </div>
);

const ProposalsTabs = () => (
  <div className="mx-auto flex w-full max-w-2xl flex-col gap-3">
    <div className="flex justify-between font-mono text-(--faded) text-3xs uppercase tracking-2xl">
      <span>← Más reglas</span>
      <span>Más libertad →</span>
    </div>
    <Tabs
      initial={RECOMMENDED}
      items={PROPOSALS.map((proposal) => ({
        key: proposal.key,
        label: proposal.name,
        badge: proposal.key === RECOMMENDED ? 'Recomendada' : undefined,
        node: (
          <div
            className={`${proposal.key === RECOMMENDED ? panelGold : panel} p-5 sm:p-6`}
          >
            <ProposalBody proposal={proposal} />
          </div>
        ),
      }))}
    />
  </div>
);

const ProposalsColumns = () => (
  <div className="grid gap-4 lg:grid-cols-3">
    {PROPOSALS.map((proposal) => {
      const recommended = proposal.key === RECOMMENDED;
      return (
        <div
          className={`${recommended ? `${panelGold} lg:-translate-y-3 lg:shadow-[0_0_40px_rgba(201,165,87,0.18)]` : panel} relative flex flex-col gap-3 p-5`}
          key={proposal.key}
        >
          {recommended ? (
            <span className="absolute -top-3 left-5 rounded-full bg-(--gold) px-3 py-0.5 font-bold font-mono text-(--night) text-2xs uppercase tracking-xl">
              La que defendemos
            </span>
          ) : null}
          <h3 className="d-display font-black text-(--parchment) text-2xl uppercase">
            {proposal.name}
          </h3>
          <ProposalBody proposal={proposal} />
        </div>
      );
    })}
  </div>
);

const ProposalsAccordion = () => (
  <div className="mx-auto w-full max-w-2xl">
    <Accordion
      initial={RECOMMENDED}
      items={PROPOSALS.map((proposal) => ({
        key: proposal.key,
        label: proposal.name,
        badge: proposal.key === RECOMMENDED ? 'Recomendada' : undefined,
        node: <ProposalBody proposal={proposal} />,
      }))}
    />
  </div>
);

/* ── 4. Why be a captain ───────────────────────────────────── */

const WhyCaptain = () => (
  <div
    className={`${panelGold} d-corners mx-auto flex max-w-3xl flex-col gap-5 p-6 sm:p-8`}
  >
    <span className="d-corner-b" />
    <span className={`${tag} self-start`}>Por qué la libre</span>
    <h3 className="d-display font-bold text-(--parchment) text-2xl uppercase">
      ¿Por qué querrías ser capitán?
    </h3>
    <div className="grid gap-4 sm:grid-cols-3">
      {CAPTAIN_REASONS.map((reason) => (
        <div className="flex flex-col gap-1" key={reason.title}>
          <span className="font-bold text-(--gold-hi)">{reason.title}</span>
          <span className="text-(--faded) text-sm">{reason.text}</span>
        </div>
      ))}
    </div>
    <p className="border-(--hair-gold) border-t pt-4 text-(--faded) text-sm">
      Y si eres de los buenos, ser capitán es la única forma de no acabar siendo
      el fichaje de otro.
    </p>
  </div>
);

/* ── 6. Annexes ─────────────────────────────────────────────── */

const SCOPE_NAMES = {
  strict: 'Estricta',
  intermediate: 'Intermedia',
  free: 'Libre',
} as const;

const AnnexList = () => (
  <div className="flex flex-col gap-6">
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
          <div
            className={`${panel} flex scroll-mt-24 flex-col gap-2 p-5 transition-[box-shadow,background-color] duration-700`}
            id={annex.id}
            key={annex.id}
          >
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="d-display font-bold text-(--parchment) uppercase">
                § {annex.title}
              </h4>
              {annex.scope ? (
                <span className={tag}>
                  Propuesta {SCOPE_NAMES[annex.scope]}
                </span>
              ) : null}
            </div>
            <p className="text-(--faded) text-sm">{annex.text}</p>
          </div>
        ))}
      </div>
    ))}
  </div>
);

/** On a full-proposal page: the note sits right where it is named. */
const InlineAnnex = () => {
  const ties = ANNEXES.find((annex) => annex.id === 'annex-ties');
  const volunteers = ANNEXES.find((annex) => annex.id === 'annex-volunteers');
  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-5">
      <span className={`${tag} self-start`}>Propuesta libre · paso 2</span>
      <h3 className="d-display font-bold text-(--parchment) text-2xl uppercase">
        Los capitanes
      </h3>
      <p className="text-(--parchment)">
        Al abrirse la votación, cada confirmado responde en la web si quiere ser
        capitán. Nadie ve las respuestas de los demás hasta el cierre. Con todas
        las respuestas, son capitanes los cinco voluntarios mejor situados en el
        ranking histórico (ver <span className="text-(--gold)">empates</span>).
      </p>
      <aside className="rounded-r-xl border-(--gold) border-l-2 bg-(--gold)/6 px-5 py-4">
        <span className="font-mono text-(--gold) text-2xs uppercase tracking-2xl">
          § Anexo · {ties?.title}
        </span>
        <p className="mt-1 text-(--faded) text-sm">{ties?.text}</p>
      </aside>
      <p className="text-(--parchment)">
        Si se ofrecen menos de cinco o más de cinco, la regla es sencilla.
      </p>
      <details className="group rounded-xl border border-(--hair-gold) bg-(--night-2)/70 px-5 py-3">
        <summary className="cursor-pointer list-none font-mono text-(--gold) text-2xs uppercase tracking-2xl">
          § Anexo · {volunteers?.title}{' '}
          <span className="text-(--faded) group-open:hidden">
            (tocar para abrir)
          </span>
        </summary>
        <p className="mt-2 text-(--faded) text-sm">{volunteers?.text}</p>
      </details>
    </article>
  );
};

export {
  AdvantagesComplaints,
  AdvantagesSeals,
  AdvantagesVersus,
  AnnexList,
  AuctionIntro,
  HeaderEdict,
  HeaderRing,
  HeaderSealed,
  InlineAnnex,
  ProposalsAccordion,
  ProposalsColumns,
  ProposalsTabs,
  WhyCaptain,
};
