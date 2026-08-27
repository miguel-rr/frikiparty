import type {
  SimulatorPlayer,
  WizardAction,
  WizardState,
  WizardStep,
} from '@/lib/simulator/types';
import {
  applyBid,
  createAuctionState,
  resolveLockoutEnded,
  resolveLotTimeoutOnce,
} from '@/lib/tournament/auction-resolution';
import {
  buildBracket,
  getBracketChampion,
  getBracketFinalOrder,
  recordBracketGame,
} from '@/lib/tournament/bracket-phase';
import {
  buildCaptainOrder,
  buildDraftOrder,
  getUndraftedPlayersInPot,
  hasPickedFromPot,
  resolveNextTurn,
} from '@/lib/tournament/draft';
import {
  computeGroupStandings,
  generateGroupMatches,
} from '@/lib/tournament/group-phase';
import { recordGame } from '@/lib/tournament/match';
import { assignRandomWithinPots, generatePots } from '@/lib/tournament/pots';
import {
  combineBallotsToRanking,
  combineRankings,
  shuffle,
  simulateVoting,
  sortByHistoricalRanking,
} from '@/lib/tournament/ranking';
import type {
  AuctionState,
  DraftState,
  Phase,
  PhaseRuntime,
  Team,
} from '@/lib/tournament/types';

/** Defaults to 20 random real players (or all of them, if there aren't 20 yet). */
const createInitialState = (players: SimulatorPlayer[]): WizardState => ({
  stepHistory: ['intro'],
  players,
  participantIds: shuffle(players.map((player) => player.id)).slice(0, 20),
});

const getPlayerName = (players: SimulatorPlayer[], playerId: string): string =>
  players.find((player) => player.id === playerId)?.name ?? playerId;

// Real players don't carry historical rings in the simulator — it's a non-persistent
// prototype, so every player starts even and historical ranking falls back to name order.
const getPlayerRings = (_playerId: string): number => 0;

const selectedPlayers = (state: WizardState) =>
  state.players
    .filter((player) => state.participantIds.includes(player.id))
    .map((player) => ({
      ...player,
      rings: 0,
      individualRings: 0,
      editionsPlayed: 0,
    }));

const computeNextStep = (state: WizardState): WizardStep => {
  const current = state.stepHistory.at(-1) ?? 'intro';
  switch (current) {
    case 'intro':
      return 'tournament-basics';
    case 'tournament-basics':
      return 'tournament-model';
    case 'tournament-model':
      return state.model === 'swiss' ? 'tournament-swiss' : 'tournament-phases';
    case 'tournament-phases':
      return 'tournament-participants';
    case 'tournament-swiss':
      return 'tournament-participants';
    case 'tournament-participants':
      return 'team-method';
    case 'team-method':
      return state.teamFormationMethod === 'random'
        ? 'random-config'
        : 'ranking-source';
    case 'random-config':
      return 'summary';
    case 'ranking-source':
      return state.rankingSource === 'historical'
        ? 'ranking-review'
        : 'simulated-voting';
    case 'simulated-voting':
      return 'ranking-review';
    case 'ranking-review':
      return 'pots-review';
    case 'pots-review':
      return state.teamFormationMethod === 'pots-random'
        ? 'summary'
        : 'captains-config';
    case 'captains-config':
      return state.teamFormationMethod === 'pots-draft'
        ? 'draft-order'
        : 'auction-config';
    case 'draft-order':
      return 'draft-method';
    case 'draft-method':
      return state.draftRoomCode ? 'draft-room-host' : 'draft-simulation';
    case 'draft-simulation':
      return 'summary';
    case 'draft-room-host':
      return 'summary';
    case 'auction-config':
      return state.auctionRoomCode ? 'auction-room-host' : 'auction-simulation';
    case 'auction-simulation':
      return 'summary';
    case 'auction-room-host':
      return 'summary';
    case 'summary':
      return 'phase-play';
    case 'phase-play':
      return 'champion';
    default:
      return current;
  }
};

const buildRandomTeams = (
  participantIds: string[],
  teamCount: number,
): Team[] => {
  const teams: Team[] = Array.from({ length: teamCount }, (_, index) => ({
    id: `team-${index + 1}`,
    name: `Equipo ${index + 1}`,
    playerIds: [],
  }));
  shuffle(participantIds).forEach((playerId, index) => {
    teams[index % teamCount]?.playerIds.push(playerId);
  });
  return teams;
};

const buildTeamsFromDraft = (
  players: SimulatorPlayer[],
  captainIds: string[],
  draft: DraftState,
): Team[] =>
  captainIds.map((captainId, index) => ({
    id: `team-${index + 1}`,
    name: `Equipo de ${getPlayerName(players, captainId)}`,
    playerIds: [
      captainId,
      ...draft.picks
        .filter((pick) => pick.captainId === captainId)
        .map((pick) => pick.playerId),
    ],
  }));

const buildTeamsFromAuction = (
  players: SimulatorPlayer[],
  captainIds: string[],
  auction: AuctionState,
): Team[] =>
  captainIds.map((captainId, index) => ({
    id: `team-${index + 1}`,
    name: `Equipo de ${getPlayerName(players, captainId)}`,
    playerIds: [captainId, ...(auction.rosters[captainId] ?? [])],
  }));

const buildPhaseRuntime = (
  phase: Phase,
  seededTeamIds: string[],
): PhaseRuntime =>
  phase.type === 'group'
    ? { type: 'group', matches: generateGroupMatches(seededTeamIds, phase) }
    : { type: 'bracket', matches: buildBracket(seededTeamIds, phase) };

/** Lower is better: average ranking position across the team's roster. */
const teamStrengthMetric = (team: Team, ranking: string[]): number => {
  const positions = team.playerIds.map((id) => {
    const index = ranking.indexOf(id);
    return index === -1 ? ranking.length : index;
  });
  return (
    positions.reduce((sum, position) => sum + position, 0) /
    (positions.length || 1)
  );
};

/**
 * Team order (best first) to seed a phase with: strength-based for the
 * first phase, the previous phase's final standings/results otherwise.
 */
const seedTeamsForPhase = (
  phaseIndex: number,
  state: WizardState,
): string[] => {
  const teams = state.teams ?? [];
  const ranking = state.finalRanking ?? state.participantIds;

  if (phaseIndex === 0) {
    return [...teams]
      .sort(
        (a, b) =>
          teamStrengthMetric(a, ranking) - teamStrengthMetric(b, ranking),
      )
      .map((team) => team.id);
  }

  const previousRuntime = state.phaseRuntimes?.[phaseIndex - 1];
  const previousPhase = state.phases?.[phaseIndex - 1];
  if (previousRuntime?.type === 'group' && previousPhase?.type === 'group') {
    return computeGroupStandings(
      previousRuntime.matches,
      teams,
      previousPhase,
      ranking,
      getPlayerRings,
    ).map((standing) => standing.teamId);
  }
  if (previousRuntime?.type === 'bracket') {
    return getBracketFinalOrder(previousRuntime.matches);
  }
  return teams.map((team) => team.id);
};

/** Runs the side effect tied to leaving the current step, before advancing. */
const applyAdvanceEffects = (state: WizardState): WizardState => {
  const current = state.stepHistory.at(-1) ?? 'intro';

  if (current === 'ranking-source' && state.rankingSource === 'historical') {
    return {
      ...state,
      finalRanking: sortByHistoricalRanking(selectedPlayers(state)),
    };
  }

  if (current === 'simulated-voting') {
    const historical = sortByHistoricalRanking(selectedPlayers(state));
    const voting = combineBallotsToRanking(
      state.ballots ?? [],
      state.participantIds,
    );
    const ranking =
      state.rankingSource === 'combined'
        ? combineRankings(historical, voting, state.historicalWeight ?? 50)
        : voting;
    return { ...state, finalRanking: ranking };
  }

  if (current === 'random-config' && state.teamFormationMethod === 'random') {
    return {
      ...state,
      teams: buildRandomTeams(state.participantIds, state.teamCount ?? 2),
    };
  }

  if (
    current === 'pots-review' &&
    state.teamFormationMethod === 'pots-random' &&
    state.pots &&
    state.teamCount
  ) {
    return {
      ...state,
      teams: assignRandomWithinPots(state.pots, state.teamCount),
    };
  }

  if (current === 'draft-simulation' && state.draft && state.captainIds) {
    return {
      ...state,
      teams: buildTeamsFromDraft(state.players, state.captainIds, state.draft),
    };
  }

  if (current === 'auction-simulation' && state.auction && state.captainIds) {
    return {
      ...state,
      teams: buildTeamsFromAuction(
        state.players,
        state.captainIds,
        state.auction,
      ),
    };
  }

  return state;
};

const wizardReducer = (
  state: WizardState,
  action: WizardAction,
): WizardState => {
  switch (action.type) {
    case 'ADVANCE': {
      const withEffects = applyAdvanceEffects(state);
      const next = computeNextStep(withEffects);
      return {
        ...withEffects,
        stepHistory: [...withEffects.stepHistory, next],
      };
    }

    case 'BACK': {
      if (state.stepHistory.length <= 1) return state;
      return { ...state, stepHistory: state.stepHistory.slice(0, -1) };
    }

    case 'RESET':
      return createInitialState(state.players);

    case 'SET_TOURNAMENT_BASICS':
      return { ...state, game: action.game };

    case 'SET_MODEL':
      return {
        ...state,
        model: action.model,
        phases: undefined,
        swiss: undefined,
      };

    case 'SET_PHASES':
      return { ...state, phases: action.phases };

    case 'SET_SWISS_CONFIG':
      return { ...state, swiss: action.swiss };

    case 'SET_PARTICIPANTS':
      return {
        ...state,
        participantIds: action.participantIds,
        teamCount: undefined,
        teamFormationMethod: undefined,
        rankingSource: undefined,
        historicalWeight: undefined,
        ballots: undefined,
        finalRanking: undefined,
        maxPlayersPerTeam: undefined,
        pots: undefined,
        captainIds: undefined,
        captainOrderMethod: undefined,
        draftMethod: undefined,
        draft: undefined,
        auction: undefined,
        draftRoomCode: undefined,
        auctionRoomCode: undefined,
        teams: undefined,
      };

    case 'SET_TEAM_METHOD':
      return {
        ...state,
        teamFormationMethod: action.method,
        teamCount: undefined,
        rankingSource: undefined,
        historicalWeight: undefined,
        ballots: undefined,
        finalRanking: undefined,
        maxPlayersPerTeam: undefined,
        pots: undefined,
        captainIds: undefined,
        captainOrderMethod: undefined,
        draftMethod: undefined,
        draft: undefined,
        auction: undefined,
        draftRoomCode: undefined,
        auctionRoomCode: undefined,
        teams: undefined,
      };

    case 'SET_TEAM_COUNT':
      return { ...state, teamCount: action.teamCount };

    case 'SET_RANKING_SOURCE':
      return {
        ...state,
        rankingSource: action.source,
        ballots: undefined,
        finalRanking: undefined,
        maxPlayersPerTeam: undefined,
        pots: undefined,
        captainIds: undefined,
        draft: undefined,
        auction: undefined,
        draftRoomCode: undefined,
        auctionRoomCode: undefined,
        teams: undefined,
      };

    case 'SET_HISTORICAL_WEIGHT':
      return { ...state, historicalWeight: action.weight };

    case 'GENERATE_BALLOTS':
      return { ...state, ballots: simulateVoting(selectedPlayers(state)) };

    case 'SET_FINAL_RANKING':
      return { ...state, finalRanking: action.ranking };

    case 'SET_MAX_PLAYERS_PER_TEAM':
      return { ...state, maxPlayersPerTeam: action.maxPlayersPerTeam };

    case 'GENERATE_POTS': {
      const ranking = state.finalRanking ?? state.participantIds;
      const potCount = state.maxPlayersPerTeam ?? 4;
      const { pots, teamCount } = generatePots(ranking, potCount);
      return {
        ...state,
        pots,
        teamCount,
        captainIds: pots[0] ? [...pots[0]] : [],
        draft: undefined,
        auction: undefined,
        draftRoomCode: undefined,
        auctionRoomCode: undefined,
        teams: undefined,
      };
    }

    case 'MOVE_PLAYER_BETWEEN_POTS': {
      if (!state.pots) return state;
      const pots = state.pots.map((pot) => [...pot]);
      const fromPot = pots[action.fromPotIndex];
      const toPot = pots[action.toPotIndex];
      if (!fromPot || !toPot) return state;
      const index = fromPot.indexOf(action.playerId);
      if (index === -1) return state;
      fromPot.splice(index, 1);
      toPot.push(action.playerId);
      const captainsAffected =
        action.fromPotIndex === 0 || action.toPotIndex === 0;
      return {
        ...state,
        pots,
        captainIds:
          captainsAffected && pots[0] ? [...pots[0]] : state.captainIds,
        draft: undefined,
        auction: undefined,
        draftRoomCode: undefined,
        auctionRoomCode: undefined,
        teams: undefined,
      };
    }

    case 'SET_CAPTAINS':
      return { ...state, captainIds: action.captainIds };

    case 'SET_CAPTAIN_ORDER_METHOD':
      return { ...state, captainOrderMethod: action.method };

    case 'SET_DRAFT_METHOD':
      return { ...state, draftMethod: action.method };

    case 'START_DRAFT': {
      if (
        !state.pots ||
        !state.captainIds ||
        !state.captainOrderMethod ||
        !state.draftMethod
      ) {
        return state;
      }
      const ranking = state.finalRanking ?? state.participantIds;
      const baseOrder = buildCaptainOrder(
        state.captainIds,
        ranking,
        state.captainOrderMethod,
      );
      const draftablePotCount = state.pots.length - 1;
      const turnQueue = buildDraftOrder(
        state.captainIds,
        baseOrder,
        draftablePotCount,
        state.captainOrderMethod,
        state.draftMethod,
      );
      return {
        ...state,
        draft: { method: state.draftMethod, turnQueue, picks: [] },
      };
    }

    case 'DRAFT_PICK': {
      if (!state.draft || !state.pots) return state;
      if (resolveNextTurn(state.draft, state.pots) !== action.captainId)
        return state;
      if (hasPickedFromPot(state.draft, action.captainId, action.potIndex))
        return state;
      const undrafted = getUndraftedPlayersInPot(
        state.pots,
        state.draft,
        action.potIndex,
      );
      if (!undrafted.includes(action.playerId)) return state;
      return {
        ...state,
        draft: {
          ...state.draft,
          picks: [
            ...state.draft.picks,
            {
              captainId: action.captainId,
              potIndex: action.potIndex,
              playerId: action.playerId,
            },
          ],
        },
      };
    }

    case 'START_AUCTION': {
      if (!state.pots || !state.captainIds) return state;
      return {
        ...state,
        auction: createAuctionState(state.pots, state.captainIds, Date.now()),
      };
    }

    case 'PLACE_BID': {
      if (!state.auction || !state.pots || !state.captainIds) return state;
      const result = applyBid(
        state.auction,
        state.pots,
        state.captainIds,
        action.captainId,
        action.amount,
        Date.now(),
      );
      if ('error' in result) return state;
      return { ...state, auction: result };
    }

    case 'LOCKOUT_ENDED': {
      if (!state.auction) return state;
      return {
        ...state,
        auction: resolveLockoutEnded(state.auction, Date.now()),
      };
    }

    case 'LOT_TIMEOUT': {
      if (!state.auction || !state.pots || !state.captainIds) return state;
      return {
        ...state,
        auction: resolveLotTimeoutOnce(
          state.auction,
          state.pots,
          state.captainIds,
          Date.now(),
        ),
      };
    }

    case 'SET_DRAFT_ROOM_CODE':
      return { ...state, draftRoomCode: action.code };

    case 'IMPORT_DRAFT_RESULT': {
      if (!state.captainIds) return state;
      return {
        ...state,
        draft: action.draft,
        teams: buildTeamsFromDraft(
          state.players,
          state.captainIds,
          action.draft,
        ),
      };
    }

    case 'SET_AUCTION_ROOM_CODE':
      return { ...state, auctionRoomCode: action.code };

    case 'IMPORT_AUCTION_RESULT': {
      if (!state.captainIds) return state;
      return {
        ...state,
        auction: action.auction,
        teams: buildTeamsFromAuction(
          state.players,
          state.captainIds,
          action.auction,
        ),
      };
    }

    case 'START_TOURNAMENT': {
      const firstPhase = state.phases?.[0];
      if (!firstPhase || !state.teams) return state;
      const seeded = seedTeamsForPhase(0, state);
      const runtime = buildPhaseRuntime(firstPhase, seeded);
      return {
        ...state,
        phaseRuntimes: [runtime],
        currentPhaseIndex: 0,
        champion: undefined,
      };
    }

    case 'RECORD_GAME': {
      const { currentPhaseIndex, phaseRuntimes, phases } = state;
      if (currentPhaseIndex === undefined || !phaseRuntimes || !phases)
        return state;
      const runtime = phaseRuntimes[currentPhaseIndex];
      const phase = phases[currentPhaseIndex];
      if (!runtime || !phase) return state;

      let updatedRuntime: PhaseRuntime;
      if (runtime.type === 'group') {
        updatedRuntime = {
          type: 'group',
          matches: runtime.matches.map((match) =>
            match.id === action.matchId
              ? recordGame(
                  match,
                  action.winningTeamId,
                  action.factionByPlayerId,
                )
              : match,
          ),
        };
      } else {
        if (phase.type !== 'bracket') return state;
        updatedRuntime = {
          type: 'bracket',
          matches: recordBracketGame(
            runtime.matches,
            action.matchId,
            action.winningTeamId,
            action.factionByPlayerId,
            phase,
          ),
        };
      }

      return {
        ...state,
        phaseRuntimes: phaseRuntimes.map((r, index) =>
          index === currentPhaseIndex ? updatedRuntime : r,
        ),
      };
    }

    case 'ADVANCE_PHASE': {
      const { currentPhaseIndex, phases, phaseRuntimes, teams } = state;
      if (currentPhaseIndex === undefined || !phases || !phaseRuntimes)
        return state;
      const nextIndex = currentPhaseIndex + 1;
      const nextPhase = phases[nextIndex];

      if (!nextPhase) {
        const currentPhase = phases[currentPhaseIndex];
        const runtime = phaseRuntimes[currentPhaseIndex];
        let champion: string | undefined;
        if (runtime?.type === 'group' && currentPhase?.type === 'group') {
          champion = computeGroupStandings(
            runtime.matches,
            teams ?? [],
            currentPhase,
            state.finalRanking ?? state.participantIds,
            getPlayerRings,
          )[0]?.teamId;
        } else if (runtime?.type === 'bracket') {
          champion = getBracketChampion(runtime.matches) ?? undefined;
        }
        return { ...state, champion };
      }

      const seeded = seedTeamsForPhase(nextIndex, state);
      const runtime = buildPhaseRuntime(nextPhase, seeded);
      return {
        ...state,
        currentPhaseIndex: nextIndex,
        phaseRuntimes: [...phaseRuntimes, runtime],
      };
    }

    default:
      return state;
  }
};

export { computeNextStep, createInitialState, wizardReducer };
