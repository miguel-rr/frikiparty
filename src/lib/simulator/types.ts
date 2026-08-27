import type {
  AuctionState,
  Ballot,
  CaptainOrderMethod,
  DraftMethod,
  DraftState,
  Phase,
  PhaseRuntime,
  Pots,
  SwissConfig,
  Team,
} from '@/lib/tournament/types';

type OfficialGame = 'age-of-the-ring' | 'battle-of-middle-earth';

type TournamentGame =
  | { kind: 'official'; game: OfficialGame; version: string }
  | { kind: 'unofficial'; game: string };

type TournamentModel = 'classic' | 'swiss';

type TournamentConfig =
  | { game: TournamentGame; model: 'classic'; phases: Phase[] }
  | { game: TournamentGame; model: 'swiss'; swiss: SwissConfig };

type TeamFormationMethod =
  | 'random'
  | 'pots-random'
  | 'pots-draft'
  | 'pots-auction';

type RankingSource = 'historical' | 'voting' | 'combined';

/**
 * Everything a live multi-device auction room needs, shared as-is between
 * the in-memory server registry, the tRPC router, the host's spectator
 * screen, and every phone that joins. `claims` maps captainId -> deviceId.
 */
type AuctionRoomPayload = {
  pots: Pots;
  captainIds: string[];
  claims: Record<string, string>;
  auction: AuctionState;
};

/** Same shape as `AuctionRoomPayload`, for a live multi-device draft room. */
type DraftRoomPayload = {
  pots: Pots;
  captainIds: string[];
  claims: Record<string, string>;
  draft: DraftState;
};

type WizardStep =
  | 'intro'
  | 'tournament-basics'
  | 'tournament-model'
  | 'tournament-phases'
  | 'tournament-swiss'
  | 'tournament-participants'
  | 'team-method'
  | 'random-config'
  | 'ranking-source'
  | 'simulated-voting'
  | 'ranking-review'
  | 'pots-review'
  | 'captains-config'
  | 'draft-order'
  | 'draft-method'
  | 'draft-simulation'
  | 'draft-room-host'
  | 'auction-config'
  | 'auction-simulation'
  | 'auction-room-host'
  | 'summary'
  | 'phase-play'
  | 'champion';

/** The real players available to pick from — fetched once, server-side, when the simulator page loads. */
type SimulatorPlayer = { id: string; name: string };

type WizardState = {
  stepHistory: WizardStep[];
  players: SimulatorPlayer[];

  game?: TournamentGame;
  model?: TournamentModel;
  phases?: Phase[];
  swiss?: SwissConfig;

  participantIds: string[];

  teamCount?: number;
  teamFormationMethod?: TeamFormationMethod;

  rankingSource?: RankingSource;
  historicalWeight?: number;
  ballots?: Ballot[];
  finalRanking?: string[];

  /** Players per team (max), chosen by the user — also the pot count. */
  maxPlayersPerTeam?: number;
  pots?: Pots;

  captainIds?: string[];
  captainOrderMethod?: CaptainOrderMethod;

  draftMethod?: DraftMethod;
  draft?: DraftState;
  draftRoomCode?: string;

  auction?: AuctionState;
  auctionRoomCode?: string;

  teams?: Team[];

  phaseRuntimes?: PhaseRuntime[];
  currentPhaseIndex?: number;
  champion?: string;
};

type WizardAction =
  | { type: 'ADVANCE' }
  | { type: 'BACK' }
  | { type: 'RESET' }
  | { type: 'SET_TOURNAMENT_BASICS'; game: TournamentGame }
  | { type: 'SET_MODEL'; model: TournamentModel }
  | { type: 'SET_PHASES'; phases: Phase[] }
  | { type: 'SET_SWISS_CONFIG'; swiss: SwissConfig }
  | { type: 'SET_PARTICIPANTS'; participantIds: string[] }
  | { type: 'SET_TEAM_METHOD'; method: TeamFormationMethod }
  | { type: 'SET_TEAM_COUNT'; teamCount: number }
  | { type: 'SET_RANKING_SOURCE'; source: RankingSource }
  | { type: 'SET_HISTORICAL_WEIGHT'; weight: number }
  | { type: 'GENERATE_BALLOTS' }
  | { type: 'SET_FINAL_RANKING'; ranking: string[] }
  | { type: 'SET_MAX_PLAYERS_PER_TEAM'; maxPlayersPerTeam: number }
  | { type: 'GENERATE_POTS' }
  | {
      type: 'MOVE_PLAYER_BETWEEN_POTS';
      playerId: string;
      fromPotIndex: number;
      toPotIndex: number;
    }
  | { type: 'SET_CAPTAINS'; captainIds: string[] }
  | { type: 'SET_CAPTAIN_ORDER_METHOD'; method: CaptainOrderMethod }
  | { type: 'SET_DRAFT_METHOD'; method: DraftMethod }
  | { type: 'START_DRAFT' }
  | {
      type: 'DRAFT_PICK';
      captainId: string;
      potIndex: number;
      playerId: string;
    }
  | { type: 'SET_DRAFT_ROOM_CODE'; code: string }
  | { type: 'IMPORT_DRAFT_RESULT'; draft: DraftState }
  | { type: 'START_AUCTION' }
  | { type: 'PLACE_BID'; captainId: string; amount: number }
  | { type: 'LOCKOUT_ENDED' }
  | { type: 'LOT_TIMEOUT' }
  | { type: 'SET_AUCTION_ROOM_CODE'; code: string }
  | { type: 'IMPORT_AUCTION_RESULT'; auction: AuctionState }
  | { type: 'START_TOURNAMENT' }
  | {
      type: 'RECORD_GAME';
      matchId: string;
      winningTeamId: string;
      factionByPlayerId: Record<string, string>;
    }
  | { type: 'ADVANCE_PHASE' };

export type {
  AuctionRoomPayload,
  Ballot,
  DraftRoomPayload,
  OfficialGame,
  RankingSource,
  SimulatorPlayer,
  TeamFormationMethod,
  TournamentConfig,
  TournamentGame,
  TournamentModel,
  WizardAction,
  WizardState,
  WizardStep,
};
