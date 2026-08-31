import { RANKING } from '@/app/design/fixtures';
import {
  btn,
  Gem,
  PlayerBlazon,
  panel,
  RingGlyph,
  rarityForPosition,
  Section,
  SectionHeader,
  td,
  th,
} from '@/components/theme/primitives';
import { HonorPodium } from '@/components/tournament/honor-podium';

const RingsCell = ({
  individualRings,
  rings,
}: {
  individualRings: number;
  rings: number;
}) => (
  <span className="flex flex-wrap items-center gap-1">
    {Array.from({ length: rings }, (_, i) => (
      <RingGlyph key={`team-${String(i)}`} size={15} />
    ))}
    {Array.from({ length: individualRings }, (_, i) => (
      <RingGlyph key={`solo-${String(i)}`} size={12} tone="solitaire" />
    ))}
  </span>
);

/**
 * Competition positions ("1224"): individual rings break ring ties
 * (core-logic ranking rules); full ties share a number, the next skips.
 */
const outranks = (
  a: { rings: number; individualRings: number },
  b: { rings: number; individualRings: number },
) =>
  a.rings > b.rings ||
  (a.rings === b.rings && a.individualRings > b.individualRings);

const POSITIONS = RANKING.map(
  (player) => RANKING.filter((other) => outranks(other, player)).length + 1,
);

const Ranking = () => (
  <Section id="ranking">
    <SectionHeader
      eyebrowText="Ranking histórico · Desde 2005"
      lead="Cada campeonato forja un anillo de oro: alianza por equipos, solitario con gema en el individual. El solitario desempata; a empate total, mismo puesto."
      title="El Escalafón"
    />
    <HonorPodium players={RANKING} />
    <div className={`${panel} overflow-x-auto`}>
      <table className="w-full border-collapse sm:min-w-[480px]">
        <thead>
          <tr>
            <th className={`${th} w-16`}>#</th>
            <th className={th}>Jugador</th>
            <th className={th}>Anillos</th>
          </tr>
        </thead>
        <tbody>
          {RANKING.map((player, index) => {
            const position = POSITIONS[index] ?? index + 1;
            const leader = position === 1;
            return (
              <tr
                className={
                  leader
                    ? 'bg-linear-to-r from-[#c9a5571a] to-transparent shadow-[inset_3px_0_0_var(--gold)]'
                    : undefined
                }
                key={player.name}
              >
                <td className={td}>
                  <span className="flex items-center gap-2">
                    <span className="w-4 font-bold font-mono text-(--faded) text-sm">
                      {position}
                    </span>
                    <Gem rarity={rarityForPosition(position)} />
                  </span>
                </td>
                <td className={td}>
                  <span className="flex items-center gap-2.5">
                    <PlayerBlazon name={player.name} size="sm" />
                    <span
                      className={`font-bold ${leader ? 'text-(--gold-hi)' : ''}`}
                    >
                      {player.name}
                    </span>
                  </span>
                </td>
                <td className={td}>
                  <RingsCell
                    individualRings={player.individualRings}
                    rings={player.rings}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-5 font-mono text-(--faded) text-[0.62rem] uppercase tracking-[0.18em]">
        <span className="flex items-center gap-1.5">
          <RingGlyph size={13} /> Campeonato por equipos
        </span>
        <span className="flex items-center gap-1.5">
          <RingGlyph size={11} tone="solitaire" /> Campeonato individual
        </span>
      </div>
      <a className={btn.ghost} href="#top">
        Ver ranking completo →
      </a>
    </div>
  </Section>
);

export { Ranking };
