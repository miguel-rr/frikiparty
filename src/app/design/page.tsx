import type { Metadata } from 'next';

// Re-render per request so the card lore deck reshuffles on every reload.
import { HomeAwaitingHero } from '@/app/_components/home-hero';
import { BioFrames } from '@/app/design/_components/bio-frames';
import { CardGallery } from '@/app/design/_components/card-gallery';
import { Champions } from '@/app/design/_components/champions';
import { Contest } from '@/app/design/_components/contest';
import { Council } from '@/app/design/_components/council';
import { Draft } from '@/app/design/_components/draft';
import { EditMode } from '@/app/design/_components/edit-mode';
import { EditionCardProposals } from '@/app/design/_components/edition-card-proposals';
import { Hero } from '@/app/design/_components/hero';
import { Auction } from '@/app/design/_components/market';
import { MatchDetail } from '@/app/design/_components/match-detail';
import { Ranking } from '@/app/design/_components/ranking';
import { TopNav } from '@/components/layout/top-nav';
import { ParallaxBackground } from '@/components/theme/parallax-bg';
import {
  BlazonDefs,
  Divider,
  Footer,
  tag,
} from '@/components/theme/primitives';

export const metadata: Metadata = {
  robots: { index: false },
  title: 'Frikiparty — Propuesta de diseño',
};

const DesignPage = () => (
  <div className="theme-night text-[1.0625rem] leading-relaxed">
    <BlazonDefs />
    <ParallaxBackground />
    <TopNav />
    <Hero />
    <Divider />
    <div className="flex flex-col">
      <div className="mx-auto flex items-center gap-3 px-4 pt-12">
        <span className={tag}>Estado de espera</span>
        <span className="font-mono text-(--faded) text-2xs uppercase tracking-xl">
          La home cuando no hay edición convocada
        </span>
      </div>
      <HomeAwaitingHero />
    </div>
    <div className="bg-(--night-2)">
      <Champions />
    </div>
    <Divider />
    <CardGallery />
    <Divider />
    <EditionCardProposals />
    <Divider />
    <Ranking />
    <Divider />
    <Council />
    <BioFrames />
    <Divider />
    <Contest />
    <MatchDetail />
    <Divider />
    <Auction />
    <Divider />
    <Draft />
    <Divider />
    <EditMode />
    <Footer
      note={
        <>
          Propuesta de diseño — ruta <span className="font-mono">/design</span>.
          Todos los datos son de muestra; esta página no escribe en la base de
          datos.
        </>
      }
    />
  </div>
);

export default DesignPage;
