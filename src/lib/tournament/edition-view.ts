import { cardSpecFor } from '@/lib/tournament/card-lore';
import { type Scene, sceneForIndex } from '@/lib/tournament/edition-scenes';
import type { EditionListItem } from '@/server/api/routers/edition';
import type { getHistoricalRanking } from '@/server/api/routers/player';

/**
 * What the /editions page renders: the real chronicle, enriched with each
 * champion's painted portrait and ring count so the cards and the list
 * can show faces instead of shields.
 */

type RankedPlayer = Awaited<ReturnType<typeof getHistoricalRanking>>[number];

type ChampionView = {
  name: string | null;
  slug: string | null;
  /** Painted portrait path, null for champions we never recorded. */
  portrait: string | null;
  rings: number;
};

type EditionView = EditionListItem & {
  scene: Scene;
  champions: ChampionView[];
  individual: ChampionView | null;
};

/** Newest-first list (as listEditions returns it) → enriched, same order. */
const buildEditionViews = (
  editions: EditionListItem[],
  players: RankedPlayer[],
): EditionView[] => {
  const byName = new Map(players.map((p) => [p.name, p]));
  const view = (champion: {
    name: string | null;
    slug: string | null;
  }): ChampionView => {
    const player = champion.name ? byName.get(champion.name) : undefined;
    return {
      name: champion.name,
      slug: champion.slug,
      portrait: player
        ? cardSpecFor({
            name: player.name,
            rings: player.rings,
            individualRings: player.individualRings,
            cardPortrait: player.cardPortrait,
          }).portrait
        : null,
      rings: player?.rings ?? 0,
    };
  };
  return editions.map((edition, index) => ({
    ...edition,
    scene: sceneForIndex(index),
    champions: edition.teamChampions.map(view),
    individual: edition.individualChampion
      ? view(edition.individualChampion)
      : null,
  }));
};

export { buildEditionViews, type ChampionView, type EditionView };
