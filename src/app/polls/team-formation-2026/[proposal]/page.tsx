import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { SiteShell } from '@/components/layout/site-shell';
import { linkGold, pageWidth, panel, tag } from '@/components/theme/primitives';

import {
  DEPARTMENT,
  PAGE_PATH,
  PROPOSALS,
  proposalByKey,
} from '../_components/content';

type Params = { proposal: string };

export const generateStaticParams = () =>
  PROPOSALS.map((proposal) => ({ proposal: proposal.key }));

export const dynamicParams = false;

export const generateMetadata = async ({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> => {
  const proposal = proposalByKey((await params).proposal);
  return {
    title: `Frikiparty — Propuesta ${proposal?.name ?? ''}`,
    description: proposal?.lead,
  };
};

/** One proposal from start to end, with its questions under each step. */
const ProposalPage = async ({ params }: { params: Promise<Params> }) => {
  const proposal = proposalByKey((await params).proposal);
  if (!proposal) notFound();
  const others = PROPOSALS.filter((other) => other.key !== proposal.key);
  return (
    <SiteShell>
      <article className={`${pageWidth} flex max-w-3xl flex-col gap-8 py-14`}>
        <Link className={linkGold} href={PAGE_PATH}>
          ← Volver a la propuesta y las votaciones
        </Link>
        <header className="flex flex-col gap-3">
          <span className="font-mono text-(--gold) text-2xs uppercase tracking-3xl">
            {DEPARTMENT}
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="d-display font-black text-(--parchment) text-4xl uppercase">
              Propuesta {proposal.name}
            </h1>
            {proposal.recommended ? (
              <span className={tag}>La que defendemos</span>
            ) : null}
          </div>
          <p className="text-(--faded) text-lg">{proposal.lead}</p>
        </header>

        <ol className="flex flex-col gap-10">
          {proposal.steps.map((step, index) => (
            <li className="flex gap-4" key={step.title}>
              <span className="grid size-9 flex-none place-items-center rounded-full border border-(--gold)/60 font-bold font-mono text-(--gold)">
                {index + 1}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-3 pt-1">
                <h2 className="d-display font-bold text-(--parchment) text-xl uppercase">
                  {step.title}
                </h2>
                {step.paragraphs.map((paragraph) => (
                  <p className="text-(--parchment)" key={paragraph}>
                    {paragraph}
                  </p>
                ))}
                {step.list ? (
                  <ul className="flex flex-col gap-1 text-(--faded) text-sm">
                    {step.list.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                ) : null}
                {step.aside ? (
                  <section className={`${panel} mt-2 flex flex-col gap-3 p-5`}>
                    <h3 className="d-display font-bold text-(--gold-hi) uppercase">
                      {step.aside.title}
                    </h3>
                    {step.aside.paragraphs.map((paragraph) => (
                      <p className="text-(--faded)" key={paragraph}>
                        {paragraph}
                      </p>
                    ))}
                  </section>
                ) : null}
                {step.questions ? (
                  <dl className="mt-2 flex flex-col gap-4 border-(--gold)/40 border-l-2 pl-5">
                    {step.questions.map((item) => (
                      <div className="flex flex-col gap-1" key={item.question}>
                        <dt className="font-bold text-(--gold-hi)">
                          {item.question}
                        </dt>
                        <dd className="text-(--faded)">{item.answer}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
              </div>
            </li>
          ))}
        </ol>

        <div className={`${panel} flex flex-col gap-2 p-5`}>
          <p className="text-(--parchment)">
            <strong className="text-(--gold-hi)">Lo bueno:</strong>{' '}
            {proposal.good}
          </p>
          <p className="text-(--faded)">
            <strong className="text-(--parchment)">
              {proposal.caveatLabel}:
            </strong>{' '}
            {proposal.caveat}
          </p>
        </div>

        <div className="flex flex-col gap-3 border-(--hair-gold) border-t pt-6">
          <Link className={linkGold} href={`${PAGE_PATH}#polls`}>
            Ir a votar →
          </Link>
          <span className="flex flex-wrap gap-4 text-sm">
            {others.map((other) => (
              <Link
                className="text-(--faded) hover:text-(--gold-hi)"
                href={`${PAGE_PATH}/${other.key}`}
                key={other.key}
              >
                Propuesta {other.name} →
              </Link>
            ))}
          </span>
        </div>
      </article>
    </SiteShell>
  );
};

export default ProposalPage;
