import { AUCTION, LOT_CARD } from '@/app/design/fixtures';
import {
  btn,
  CoinStack,
  PlayerBlazon,
  panelGold,
  Section,
  SectionHeader,
  tag,
} from '@/components/theme/primitives';
import { PortraitCard } from '@/components/tournament/portrait-card';

/** The current lot: the player's card, up for auction. */
const LotCard = () => (
  <div className="flex flex-col items-center gap-3">
    <PortraitCard card={LOT_CARD} className="w-[225px]" />
    <span className="font-bold font-mono text-(--gold) text-[0.6rem] uppercase tracking-[0.2em]">
      Lote {AUCTION.lotNumber}/{AUCTION.totalLots} — {AUCTION.pot}
    </span>
  </div>
);

const CountdownRing = () => {
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative">
        <svg aria-hidden="true" height="64" viewBox="0 0 64 64" width="64">
          <circle
            cx="32"
            cy="32"
            fill="none"
            r={radius}
            stroke="var(--hair)"
            strokeWidth="5"
          />
          <circle
            cx="32"
            cy="32"
            fill="none"
            r={radius}
            stroke="var(--gold)"
            strokeDasharray={`${circumference * AUCTION.fraction} ${circumference}`}
            strokeLinecap="round"
            strokeWidth="5"
            transform="rotate(-90 32 32)"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center font-bold font-mono text-(--gold-hi) text-sm">
          {AUCTION.secondsLeft.toFixed(1)}
        </span>
      </div>
      <span className="font-mono text-(--faded) text-[0.58rem] uppercase tracking-[0.2em]">
        para el cierre
      </span>
    </div>
  );
};

const Auction = () => (
  <Section id="auction">
    <SectionHeader
      eyebrowText="Formación de equipos · Mercado"
      lead="Cada capitán llega con su bolsa de monedas. El mejor postor se lleva la carta; el reloj no perdona."
      title="La Subasta"
    />
    <div
      className={`${panelGold} grid grid-cols-1 gap-8 p-6 sm:p-8 lg:grid-cols-[auto_1fr] lg:gap-10`}
    >
      <div className="flex justify-center">
        <LotCard />
      </div>
      <div className="flex flex-col justify-center gap-7">
        <div className="flex flex-wrap items-center justify-center gap-8 lg:justify-start">
          <div className="flex flex-col items-center gap-1 lg:items-start">
            <span className="font-bold font-mono text-(--faded) text-[0.6rem] uppercase tracking-[0.25em]">
              Puja actual
            </span>
            <span className="flex items-baseline gap-2">
              <span className="font-bold font-mono text-(--gold-hi) text-5xl">
                {AUCTION.currentBid}
              </span>
              <span className="text-(--faded)">de {AUCTION.bidder}</span>
            </span>
          </div>
          <CountdownRing />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2.5 lg:justify-start">
          <button className={btn.primary} type="button">
            Pujar {AUCTION.minNextBid}
          </button>
          <div className="flex items-center gap-2.5">
            {[1, 5, 10].map((raise) => (
              <button
                className={`${btn.secondary} px-4 py-2 font-mono text-sm`}
                key={raise}
                type="button"
              >
                +{raise}
              </button>
            ))}
          </div>
        </div>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {AUCTION.captains.map((captain) => (
            <li
              className={`flex flex-col gap-2.5 rounded-lg border bg-(--night-2) p-3.5 ${
                'active' in captain && captain.active
                  ? 'border-(--gold) shadow-[0_0_18px_rgba(201,165,87,0.18)]'
                  : 'border-(--hair)'
              }`}
              key={captain.name}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 font-bold">
                  <PlayerBlazon name={captain.name} size="sm" />
                  {captain.name}
                </span>
                {'active' in captain && captain.active ? (
                  <span className={tag}>Pujando</span>
                ) : null}
              </span>
              <CoinStack value={captain.budget} />
              <span className="font-mono text-(--faded) text-[0.62rem] uppercase tracking-[0.15em]">
                {captain.roster.length > 0
                  ? captain.roster.join(' · ')
                  : 'Sin fichajes'}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  </Section>
);

export { Auction };
