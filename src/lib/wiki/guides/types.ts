import type { FactionId } from '@/lib/tournament/factions';

/**
 * A piece of guide text. Guides live in the repo (not the database): they
 * are written by hand and change with a deploy, like the rest of /games.
 */
type GuideBlock =
  | { kind: 'text'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'steps'; items: string[] }
  | { kind: 'tip'; title: string; text: string }
  | { kind: 'table'; head: string[]; rows: string[][] }
  | { kind: 'link'; href: string; label: string; text: string };

type GuideSection = {
  /** Anchor in the page, kebab-case. */
  id: string;
  title: string;
  /** One line for the summary card on the game page. */
  summary: string;
  blocks: GuideBlock[];
};

/** The game-wide "Empieza aquí" guide. */
type StartGuide = {
  /** Game version the text was written for. */
  version: string;
  lead: string;
  sections: GuideSection[];
};

type Difficulty = 'easy' | 'medium' | 'hard';

/** "Cómo jugarla": one per core faction. */
type FactionGuide = {
  version: string;
  difficulty: Difficulty;
  /** The faction's plan in one sentence. */
  style: string;
  opening: string[];
  keyUnits: string[];
  heroes: string[];
  powers: string[];
  howToWin: string[];
  howToLose: string[];
  /** Tips for whoever plays against it. */
  against: string[];
};

type VideoLanguage = 'es' | 'en';

type VideoTopic = 'general' | 'faction' | 'match';

type GuideVideo = {
  /** YouTube video id, or playlist id when `playlist` is set. */
  youtubeId: string;
  playlist?: boolean;
  title: string;
  channel: string;
  language: VideoLanguage;
  /** Game version shown in the video, `null` when it doesn't say. */
  version: string | null;
  topic: VideoTopic;
  faction?: FactionId;
  /** Why it is worth watching, one line, ours. */
  why: string;
  /** Shown on the game page too. */
  featured?: boolean;
};

/** One shortcut: alternatives, each a combination of keys pressed together. */
type HotkeyEntry = {
  keys: string[][];
  action: string;
  detail?: string;
  /** One of the handful worth learning first. */
  essential?: boolean;
};

type HotkeyGroup = {
  /** Anchor in the page, kebab-case. */
  id: string;
  title: string;
  note?: string;
  entries: HotkeyEntry[];
};

export type {
  Difficulty,
  FactionGuide,
  GuideBlock,
  GuideSection,
  GuideVideo,
  HotkeyEntry,
  HotkeyGroup,
  StartGuide,
  VideoLanguage,
  VideoTopic,
};
