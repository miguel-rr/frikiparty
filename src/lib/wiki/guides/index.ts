import { AOTR_FACTION_GUIDES } from '@/lib/wiki/guides/aotr/faction-guides';
import { AOTR_START_GUIDE } from '@/lib/wiki/guides/aotr/start-guide';
import { AOTR_VIDEOS } from '@/lib/wiki/guides/aotr/videos';
import type {
  FactionGuide,
  GuideVideo,
  StartGuide,
} from '@/lib/wiki/guides/types';

type GameGuides = {
  start: StartGuide;
  factions: Partial<Record<string, FactionGuide>>;
  videos: GuideVideo[];
};

/** Guides by game slug. Only Age of the Ring has them for now. */
const GUIDES: Record<string, GameGuides> = {
  'age-of-the-ring': {
    start: AOTR_START_GUIDE,
    factions: AOTR_FACTION_GUIDES,
    videos: AOTR_VIDEOS,
  },
};

const guidesOf = (slug: string): GameGuides | null => GUIDES[slug] ?? null;

const gamesWithGuides = () => Object.keys(GUIDES);

const factionGuideOf = (slug: string, code: string | null) =>
  code ? (guidesOf(slug)?.factions[code] ?? null) : null;

const factionVideosOf = (slug: string, code: string | null) =>
  code ? (guidesOf(slug)?.videos.filter((v) => v.faction === code) ?? []) : [];

const DIFFICULTY_LABELS: Record<FactionGuide['difficulty'], string> = {
  easy: 'Fácil para novatos',
  medium: 'Dificultad media',
  hard: 'Pide experiencia',
};

export type { GameGuides };
export {
  DIFFICULTY_LABELS,
  factionGuideOf,
  factionVideosOf,
  gamesWithGuides,
  guidesOf,
};
