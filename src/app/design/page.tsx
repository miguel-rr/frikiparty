import type { Metadata } from 'next';
import { Alegreya_Sans, Cinzel } from 'next/font/google';

import { Champions } from '@/app/design/_components/champions';
import { Contest } from '@/app/design/_components/contest';
import { Draft } from '@/app/design/_components/draft';
import { EditMode } from '@/app/design/_components/edit-mode';
import { Hero } from '@/app/design/_components/hero';
import { Auction } from '@/app/design/_components/market';
import { MatchDetail } from '@/app/design/_components/match-detail';
import { ParallaxBackground } from '@/app/design/_components/parallax-bg';
import { Ranking } from '@/app/design/_components/ranking';
import { BlazonDefs, Divider, Footer } from '@/app/design/_components/shared';
import { TopNav } from '@/app/design/_components/top-nav';

import './design.css';

const cinzel = Cinzel({
  display: 'swap',
  subsets: ['latin'],
  variable: '--font-cinzel',
  weight: ['400', '700', '900'],
});

const alegreyaSans = Alegreya_Sans({
  display: 'swap',
  subsets: ['latin'],
  variable: '--font-alegreya',
  weight: ['400', '500', '700', '800'],
});

export const metadata: Metadata = {
  robots: { index: false },
  title: 'Frikiparty — Propuesta de diseño',
};

const DesignPage = () => (
  <div
    className={`dsn ${cinzel.variable} ${alegreyaSans.variable} text-[1.0625rem] leading-relaxed`}
  >
    <BlazonDefs />
    <ParallaxBackground />
    <TopNav />
    <Hero />
    <div className="bg-(--night-2)">
      <Champions />
    </div>
    <Divider />
    <Ranking />
    <Divider />
    <Contest />
    <MatchDetail />
    <Divider />
    <Auction />
    <Divider />
    <Draft />
    <Divider />
    <EditMode />
    <Footer />
  </div>
);

export default DesignPage;
