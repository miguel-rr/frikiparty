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

type Player = {
  id: string;
  name: string;
  rings: number;
  individualRings: number;
};

type Ballot = {
  voterId: string;
  /** Player ids, best to worst, excluding the voter themselves. */
  order: string[];
};

type Team = {
  id: string;
  name: string;
  playerIds: string[];
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

export type {
  AuctionLot,
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
  DraftState,
  GroupPhase,
  GroupPhaseRuntime,
  GroupRounds,
  GroupTiebreak,
  Partida,
  Partido,
  Phase,
  PhaseRuntime,
  Player,
  Pot,
  Pots,
  SwissConfig,
  SwissPairingCriterion,
  Team,
};
