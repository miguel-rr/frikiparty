import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { SiteShell } from '@/components/layout/site-shell';
import { linkGold, pageWidth, panel, tag } from '@/components/theme/primitives';

import { AnnexLink } from '../_components/annex-link';
import { AnnexCard } from '../_components/blocks';
import {
  type AnnexId,
  annexById,
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

/**
 * One proposal from start to end. Each annex sits under the first step
 * that names it; later mentions link back to it.
 */
const ProposalPage = async ({ params }: { params: Promise<Params> }) => {
  const proposal = proposalByKey((await params).proposal);
  if (!proposal) notFound();
  const shown = new Set<AnnexId>();
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

        <ol className="flex flex-col gap-8">
          {proposal.steps.map((step, index) => {
            const fresh = (step.annexes ?? []).filter((id) => !shown.has(id));
            const repeated = (step.annexes ?? []).filter((id) => shown.has(id));
            for (const id of fresh) shown.add(id);
            return (
              <li className="flex flex-col gap-3" key={step.title}>
                <div className="flex gap-4">
                  <span className="grid size-9 flex-none place-items-center rounded-full border border-(--gold)/60 font-bold font-mono text-(--gold)">
                    {index + 1}
                  </span>
                  <div className="flex flex-col gap-2 pt-1">
                    <h2 className="d-display font-bold text-(--parchment) text-xl uppercase">
                      {step.title}
                    </h2>
                    <p className="text-(--parchment)">{step.text}</p>
                    {step.list ? (
                      <ul className="flex flex-col gap-1 text-(--faded) text-sm">
                        {step.list.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    ) : null}
                    {repeated.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {repeated.map((id) => (
                          <AnnexLink key={id} target={id}>
                            {annexById(id)?.title}
                          </AnnexLink>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
                {fresh.map((id) => {
                  const annex = annexById(id);
                  return annex ? (
                    <div className="sm:ml-13" key={id}>
                      <AnnexCard annex={annex} inline />
                    </div>
                  ) : null;
                })}
              </li>
            );
          })}
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
