import type { Metadata } from 'next';
import { TopNav } from '@/components/layout/top-nav';
import { BioParchment } from '@/components/players/bio-parchment';
import { ParallaxBackground } from '@/components/theme/parallax-bg';
import {
  BlazonDefs,
  Footer,
  Section,
  SectionHeader,
} from '@/components/theme/primitives';

import { DeckleSheet } from './_components/deckle-sheet';
import { ProposalLabel, SAMPLE } from './_components/ink';
import { ScorchedSheet } from './_components/scorched-sheet';
import { SingedSheet } from './_components/singed-sheet';
import { TideSheet } from './_components/tide-sheet';

export const metadata: Metadata = {
  robots: { index: false },
  title: 'Frikiparty — El contorno del pergamino',
};

/**
 * Four edges for the player chronicle. Everything else — ground, mottle,
 * grain, stains, creases, ink and wax seal — is the live component's,
 * untouched; only the contour changes. The live sheet sits first as the
 * reference.
 */
const ParchmentProposalsPage = () => (
  <div className="theme-night text-[1.0625rem] leading-relaxed">
    <BlazonDefs />
    <ParallaxBackground />
    <TopNav />
    <Section id="parchment-edges">
      <SectionHeader
        eyebrowText="Ficha de jugador · La crónica"
        lead="Cuatro bordes para la hoja de la biografía. Textura, manchas, pliegues, tinta y sello son los de hoy: solo cambia cómo termina el pergamino."
        title="El contorno del pergamino"
      />
      <div className="flex flex-col gap-20">
        <div className="flex flex-col gap-4">
          <ProposalLabel
            caption="Referencia: el contorno que hay hoy en la ficha"
            text="Actual"
          />
          <div className="mx-auto w-full max-w-2xl">
            <BioParchment text={SAMPLE.join('\n\n')} />
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <ProposalLabel
            caption="Carbón negro nítido, franja parda, halo ámbar y tres quemaduras que atraviesan la hoja"
            text="Propuesta A · Cerco quemado"
          />
          <ScorchedSheet />
        </div>
        <div className="flex flex-col gap-4">
          <ProposalLabel
            caption="El mismo fuego, pero solo lamió la hoja: filo tostado y halo ámbar, sin carbón ni agujeros"
            text="Propuesta B · Chamuscado leve"
          />
          <SingedSheet />
        </div>
        <div className="flex flex-col gap-4">
          <ProposalLabel
            caption="Papel que se mojó y secó: borde quebradizo a lascas, línea de marea parda y pecas de óxido"
            text="Propuesta C · Cerco de humedad"
          />
          <TideSheet />
        </div>
        <div className="flex flex-col gap-4">
          <ProposalLabel
            caption="Borde natural de hoja hecha a mano: se adelgaza hasta ser translúcido, fleco pálido y grosor iluminado"
            text="Propuesta D · Borde de barba"
          />
          <DeckleSheet />
        </div>
      </div>
    </Section>
    <Footer
      note={
        <>
          Propuestas de contorno — ruta{' '}
          <span className="font-mono">/design/parchment</span>. Todos los datos
          son de muestra; esta página no escribe en la base de datos.
        </>
      }
    />
  </div>
);

export default ParchmentProposalsPage;
