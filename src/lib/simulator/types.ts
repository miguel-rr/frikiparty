type OfficialGame = 'age-of-the-ring' | 'battle-of-middle-earth';

type TournamentGame =
  | { kind: 'official'; game: OfficialGame; version: string }
  | { kind: 'unofficial'; game: string };

type TournamentModel = 'classic' | 'swiss';

type GroupRounds = 'single' | 'double';

type GroupTiebreak = 'inverse-ranking' | 'inverse-rings';

type GroupPhase = {
  id: string;
  type: 'group';
  rounds: GroupRounds;
  gamesToWinMatch: number;
  tiebreak: GroupTiebreak;
};

type BracketPhase = {
  id: string;
  type: 'bracket';
  gamesToWinMatch: number;
};

type Phase = GroupPhase | BracketPhase;

type SwissPairingCriterion = 'random' | 'balanced' | 'seeded';

type SwissConfig = {
  lossesToEliminate: number;
  pairingCriterion: SwissPairingCriterion;
};

type TournamentConfig =
  | { game: TournamentGame; model: 'classic'; phases: Phase[] }
  | { game: TournamentGame; model: 'swiss'; swiss: SwissConfig };

type Player = {
  id: string;
  name: string;
  rings: number;
  individualRings: number;
  editionsPlayed: number;
};

type Team = {
  id: string;
  name: string;
  playerIds: string[];
};

type TeamFormationMethod =
  | 'random'
  | 'pots-random'
  | 'pots-draft'
  | 'pots-auction';

type RankingSource = 'historical' | 'voting' | 'combined';

type Ballot = {
  voterId: string;
  /** Player ids, best to worst, excluding the voter themselves. */
  order: string[];
};

/** One seeding tier: the player ids that belong to it. */
type Pot = string[];

/** Ordered tiers, index 0 = top seed / cabezas de serie. */
type Pots = Pot[];

type CaptainOrderMethod =
  | 'ranking'
  | 'inverse-ranking'
  | 'fixed-random'
  | 'full-random';

type DraftMethod = 'snake' | 'linear';

type DraftPick = {
  captainId: string;
  potIndex: number;
  playerId: string;
};

type DraftState = {
  method: DraftMethod;
  /** Precomputed captainId per pick, length = captains.length * pots.length. */
  turnQueue: string[];
  picks: DraftPick[];
};

type Bid = {
  captainId: string;
  amount: number;
  timestamp: number;
};

type AuctionLot = {
  potIndex: number;
  playerId: string;
};

type AuctionStatus = 'open' | 'lockout' | 'closed';

type AuctionState = {
  budgets: Record<string, number>;
  minBidByPot: number[];
  lots: AuctionLot[];
  currentLotIndex: number;
  currentBid: Bid | null;
  status: AuctionStatus;
  lockoutEndsAt: number | null;
  countdownEndsAt: number | null;
  rosters: Record<string, string[]>;
};

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

type Partida = {
  id: string;
  winningTeamId: string;
  /** Whichever players the organizer says played, and what they played. */
  factionByPlayerId: Record<string, string>;
};

type Partido = {
  id: string;
  teamAId: string;
  teamBId: string;
  gamesToWin: number;
  games: Partida[];
  /** Set once one side reaches `gamesToWin`; null while still in progress. */
  winnerTeamId: string | null;
};

type GroupPhaseRuntime = {
  type: 'group';
  matches: Partido[];
};

type BracketMatch = {
  id: string;
  /** 0 = play-in, 1..N = main bracket rounds, last = final. */
  round: number;
  teamAId: string | null;
  teamBId: string | null;
  feederAMatchId: string | null;
  feederBMatchId: string | null;
  partido: Partido | null;
};

type BracketPhaseRuntime = {
  type: 'bracket';
  matches: BracketMatch[];
};

type PhaseRuntime = GroupPhaseRuntime | BracketPhaseRuntime;

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

type WizardState = {
  stepHistory: WizardStep[];

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
  AuctionLot,
  AuctionRoomPayload,
  AuctionState,
  AuctionStatus,
  Ballot,
  Bid,
  BracketMatch,
  BracketPhase,
  BracketPhaseRuntime,
  CaptainOrderMethod,
  DraftMethod,
  DraftPick,
  DraftRoomPayload,
  DraftState,
  GroupPhase,
  GroupPhaseRuntime,
  GroupRounds,
  GroupTiebreak,
  OfficialGame,
  Partida,
  Partido,
  Phase,
  PhaseRuntime,
  Player,
  Pot,
  Pots,
  RankingSource,
  SwissConfig,
  SwissPairingCriterion,
  Team,
  TeamFormationMethod,
  TournamentConfig,
  TournamentGame,
  TournamentModel,
  WizardAction,
  WizardState,
  WizardStep,
};
