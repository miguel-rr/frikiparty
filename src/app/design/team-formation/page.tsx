import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { ProposalLabel } from '@/app/design/parchment/_components/ink';
import { SiteShell } from '@/components/layout/site-shell';
import { Divider, Section, SectionHeader } from '@/components/theme/primitives';

import {
  AnnexLink,
  PollCard,
  type PollOption,
  TokenPoll,
} from './_components/interactive';
import {
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
} from './_components/sections';

export const metadata: Metadata = {
  robots: { index: false },
  title: 'Frikiparty — Diseño de la propuesta de formación de equipos',
};

const AUCTION_POLL: PollOption[] = [
  { key: 'yes', label: 'A favor de la subasta', votes: 9 },
  { key: 'no', label: 'En contra', votes: 3 },
];

const PROPOSAL_POLL: PollOption[] = [
  { key: 'strict', label: 'Estricta', votes: 2 },
  { key: 'intermediate', label: 'Intermedia', votes: 4 },
  { key: 'free', label: 'Libre', votes: 7 },
];

const Variant = ({
  label,
  caption,
  children,
}: {
  label: string;
  caption: string;
  children: ReactNode;
}) => (
  <div className="flex flex-col gap-5">
    <ProposalLabel caption={caption} text={label} />
    {children}
  </div>
);

const SECTIONS = [
  { id: 'opening', title: '1 · Apertura' },
  { id: 'auction', title: '2 · Subasta y ventajas' },
  { id: 'proposals', title: '3 · Las tres propuestas' },
  { id: 'captain', title: '4 · Por qué la libre' },
  { id: 'polls', title: '5 · Votaciones' },
  { id: 'annexes', title: '6 · Anexos' },
];

const TeamFormationDesignPage = () => (
  <SiteShell>
    <Section id="index">
      <SectionHeader
        eyebrowText="Propuesta de diseño"
        lead="Variantes de cada parte de la página de la propuesta y sus votaciones. El texto es provisional: aquí se juzga la forma."
        title="Formación de equipos 2026"
      />
      <nav className="flex flex-wrap justify-center gap-2">
        {SECTIONS.map((section) => (
          <a
            className="rounded-full border border-(--hair-gold) px-3 py-1 font-mono text-(--gold) text-2xs uppercase tracking-xl hover:text-(--gold-hi)"
            href={`#${section.id}`}
            key={section.id}
          >
            {section.title}
          </a>
        ))}
      </nav>
    </Section>

    <Section id="opening">
      <SectionHeader eyebrowText="1" title="La apertura solemne" />
      <Variant
        caption="El texto como edicto en pergamino con sello de lacre"
        label="A · Edicto"
      >
        <HeaderEdict />
      </Variant>
      <Variant
        caption="El Anillo de la web, título y las firmas con su escudo"
        label="B · Bajo el Anillo"
      >
        <HeaderRing />
      </Variant>
      <Variant
        caption="Panel dorado con lema, capitular y firmas al pie"
        label="C · Acta firmada"
      >
        <HeaderSealed />
      </Variant>
    </Section>
    <Divider />

    <Section id="auction">
      <SectionHeader eyebrowText="2" title="La subasta y sus ventajas" />
      <AuctionIntro />
      <Variant
        caption="Antes y ahora, fila a fila (en móvil se apila)"
        label="A · Antes / Ahora"
      >
        <AdvantagesVersus />
      </Variant>
      <Variant
        caption="Cuatro ventajas con su icono, sin mirar atrás"
        label="B · Cuatro sellos"
      >
        <AdvantagesSeals />
      </Variant>
      <Variant
        caption="Cada queja del grupo con su respuesta"
        label="C · Las quejas, resueltas"
      >
        <AdvantagesComplaints />
      </Variant>
    </Section>
    <Divider />

    <Section id="proposals">
      <SectionHeader
        eyebrowText="3"
        lead="Las tres comparten estructura (ranking, capitanes, subasta) para que se comparen de un vistazo. Los enlaces § llevan al anexo y lo iluminan unos segundos."
        title="Las tres propuestas"
      />
      <Variant
        caption="Una a la vista, con la escala de reglas a libertad"
        label="A · Pestañas"
      >
        <ProposalsTabs />
      </Variant>
      <Variant
        caption="Las tres a la vez; en móvil se apilan"
        label="B · Tres columnas"
      >
        <ProposalsColumns />
      </Variant>
      <Variant caption="Plegadas, la recomendada abierta" label="C · Acordeón">
        <ProposalsAccordion />
      </Variant>
    </Section>
    <Divider />

    <Section id="captain">
      <SectionHeader eyebrowText="4" title="Por qué la libre" />
      <WhyCaptain />
    </Section>
    <Divider />

    <Section id="polls">
      <SectionHeader
        eyebrowText="5"
        lead="La misma tarjeta en cada estado. La barra cuenta los votos sobre los 20 confirmados, con la marca de los 11 que abren los resultados."
        title="Las votaciones"
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Variant
          caption="Sin sesión: ni opciones ni resultados"
          label="Estado 1"
        >
          <PollCard
            options={PROPOSAL_POLL}
            question="¿Qué propuesta prefieres?"
            state="anonymous"
            votes={7}
          />
        </Variant>
        <Variant caption="Con sesión pero sin confirmar 2026" label="Estado 2">
          <PollCard
            options={PROPOSAL_POLL}
            question="¿Qué propuesta prefieres?"
            state="not_confirmed"
            votes={7}
          />
        </Variant>
        <Variant caption="Abierta y sin votar" label="Estado 3">
          <PollCard
            options={AUCTION_POLL}
            question="¿Subasta?"
            state="open"
            votes={7}
          />
        </Variant>
        <Variant caption="Votado, esperando a los 11" label="Estado 4">
          <PollCard
            mine="free"
            options={PROPOSAL_POLL}
            question="¿Qué propuesta prefieres?"
            state="voted_waiting"
            votes={7}
          />
        </Variant>
        <Variant caption="11 o más: resultados en vivo" label="Estado 5">
          <PollCard
            mine="free"
            options={PROPOSAL_POLL}
            question="¿Qué propuesta prefieres?"
            state="results"
            votes={13}
          />
        </Variant>
        <Variant
          caption="Cerrada: resultado final, ganadora destacada"
          label="Estado 6"
        >
          <PollCard
            mine="free"
            options={PROPOSAL_POLL}
            question="¿Qué propuesta prefieres?"
            state="closed"
            votes={13}
          />
        </Variant>
      </div>
      <Variant
        caption="Alternativa para votar: fichas grandes en vez de lista"
        label="Variante B · Fichas"
      >
        <TokenPoll
          options={[
            {
              key: 'strict',
              label: 'Estricta',
              votes: 0,
              hint: 'Bombos de siempre',
            },
            {
              key: 'intermediate',
              label: 'Intermedia',
              votes: 0,
              hint: 'Nuevo portador garantizado',
            },
            {
              key: 'free',
              label: 'Libre',
              votes: 0,
              hint: 'Capitán quien quiera',
            },
          ]}
          question="¿Qué propuesta prefieres?"
        />
      </Variant>
    </Section>
    <Divider />

    <Section id="annexes">
      <SectionHeader
        eyebrowText="6"
        lead="Primero lo común, luego lo de cada propuesta con su etiqueta. Prueba un enlace:"
        title="Anexos"
      />
      <div className="flex flex-wrap justify-center gap-2">
        <AnnexLink target="annex-ties">Empates</AnnexLink>
        <AnnexLink target="annex-volunteers">
          Pocos o muchos voluntarios
        </AnnexLink>
      </div>
      <Variant
        caption="En la página de la encuesta: todos al final"
        label="A · Al final"
      >
        <AnnexList />
      </Variant>
      <Variant
        caption="En la página de cada propuesta: dentro del texto, abierto o plegable"
        label="B · En el texto"
      >
        <InlineAnnex />
      </Variant>
    </Section>
  </SiteShell>
);

export default TeamFormationDesignPage;
