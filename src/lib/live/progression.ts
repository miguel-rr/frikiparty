import { groupStandings } from '@/lib/live/standings';
import type { SwissTeam } from '@/lib/tournament/phase-engine';
import type { LiveMatch, LivePhase } from '@/server/live/phases';
import type { LiveState } from '@/server/live/state';

/**
 * How a tournament moves from one phase to the next (plan §6.4–§6.6),
 * computed from the live snapshot so the client can preview exactly what
 * the server will do: which phase is being played, whether it is finished,
 * who qualifies and in what seed order.
 */

/**
 * A match still to be decided. A bracket match whose sides are not yet
 * known counts too: someone will reach it.
 */
const isPending = (m: LiveMatch) => !m.byeTeamId && m.status !== 'completed';

/** Group standings per group, with the organiser's resolutions applied. */
const standingsOf = (state: LiveState, phase: LivePhase) =>
  phase.groups.map((group) => ({
    group,
    rows: groupStandings({
      teamIds: group.teamIds,
      teams: state.teams,
      participants: state.participants,
      ranking: state.ranking ?? [],
      matches: phase.matches.filter((m) => m.groupId === group.id),
      chain: phase.group?.tiebreakChain ?? [],
      manual: group.tieResolutions,
    }),
  }));

/** Ties the organiser still has to settle, per group. */
const openTies = (state: LiveState, phase: LivePhase) =>
  standingsOf(state, phase).flatMap(({ group, rows }) => {
    const clusters: string[][] = [];
    for (const row of rows) {
      if (row.tiedWith.length === 0) continue;
      const ids = [row.teamId, ...row.tiedWith].sort();
      if (!clusters.some((c) => c.join() === ids.join())) clusters.push(ids);
    }
    return clusters.map((teamIds) => ({ groupId: group.id, teamIds }));
  });

/** Wins, losses and opponents of every team across a swiss phase. */
const swissRecords = (phase: LivePhase): SwissTeam[] => {
  const byId = new Map<string, SwissTeam>();
  const get = (id: string) => {
    const existing = byId.get(id);
    if (existing) return existing;
    const fresh = { id, wins: 0, losses: 0, opponents: [] as string[] };
    byId.set(id, fresh);
    return fresh;
  };
  for (const m of phase.matches) {
    if (m.byeTeamId) {
      get(m.byeTeamId);
      continue;
    }
    if (!m.teamAId || !m.teamBId) continue;
    const a = get(m.teamAId);
    const b = get(m.teamBId);
    a.opponents.push(b.id);
    b.opponents.push(a.id);
    if (!m.winnerTeamId) continue;
    if (m.winnerTeamId === a.id) {
      a.wins += 1;
      b.losses += 1;
    } else {
      b.wins += 1;
      a.losses += 1;
    }
  }
  return [...byId.values()];
};

/**
 * Whether a phase has nothing left to play: every match decided, and in
 * groups every tie settled; in swiss, one team left standing.
 */
const phaseIsComplete = (state: LiveState, phase: LivePhase): boolean => {
  if (phase.matches.length === 0) return false;
  if (phase.matches.some(isPending)) return false;
  if (phase.type === 'group') return openTies(state, phase).length === 0;
  if (phase.type === 'swiss' && phase.swiss) {
    const alive = swissRecords(phase).filter(
      (t) => t.losses < (phase.swiss?.eliminationLosses ?? 1),
    );
    return alive.length <= 1;
  }
  return true;
};

/**
 * The seed order for the phase after a group phase: firsts of every group,
 * then seconds… down to the qualifiers per group. Null while a tie is open.
 */
const qualifiersSeeding = (
  state: LiveState,
  phase: LivePhase,
): string[] | null => {
  if (phase.type !== 'group' || !phase.group) return null;
  if (openTies(state, phase).length > 0) return null;
  const perGroup = standingsOf(state, phase).map(({ rows }) =>
    rows.slice(0, phase.group?.qualifiersPerGroup ?? rows.length),
  );
  const out: string[] = [];
  const depth = Math.max(0, ...perGroup.map((rows) => rows.length));
  for (let position = 0; position < depth; position += 1) {
    for (const rows of perGroup) {
      const row = rows[position];
      if (row) out.push(row.teamId);
    }
  }
  return out;
};

/** The phase being played: the first with matches still to decide, else the last one with matches. */
const activePhase = (state: LiveState) =>
  state.phases.find(
    (p) => p.matches.length > 0 && !phaseIsComplete(state, p),
  ) ??
  [...state.phases].reverse().find((p) => p.matches.length > 0) ??
  null;

/** The phase after the active one that still has no matches, if any. */
const nextPhase = (state: LiveState) => {
  const active = activePhase(state);
  if (!active) return null;
  return state.phases.find((p) => p.order > active.order) ?? null;
};

/** The champion once the last phase is complete: the final's winner, the last swiss survivor, or the group leader. */
const champion = (state: LiveState): string | null => {
  const last = [...state.phases].reverse().find((p) => p.matches.length > 0);
  if (!last || !phaseIsComplete(state, last)) return null;
  if (last.type === 'bracket') {
    const finalRound = Math.max(...last.matches.map((m) => m.roundIndex ?? 0));
    const final = last.matches.find(
      (m) => m.roundIndex === finalRound && !m.isThirdPlace,
    );
    return final?.winnerTeamId ?? null;
  }
  if (last.type === 'swiss') {
    const alive = swissRecords(last).filter(
      (t) => t.losses < (last.swiss?.eliminationLosses ?? 1),
    );
    return alive[0]?.id ?? null;
  }
  return qualifiersSeeding(state, last)?.[0] ?? null;
};

type FinalRow = { teamId: string; label: string };

/**
 * The final classification once the tournament is over: the last phase
 * decides the top (final, third-place match or the two semifinalists),
 * the previous group standings order the rest.
 */
const finalStandings = (state: LiveState): FinalRow[] => {
  const played = state.phases.filter((p) => p.matches.length > 0);
  const last = played.at(-1);
  if (!last || !phaseIsComplete(state, last)) return [];
  const rows: FinalRow[] = [];
  const seen = new Set<string>();
  const push = (teamId: string | null | undefined, label: string) => {
    if (!teamId || seen.has(teamId)) return;
    seen.add(teamId);
    rows.push({ teamId, label });
  };
  const loserOf = (m: LiveMatch | undefined) =>
    m?.winnerTeamId
      ? m.winnerTeamId === m.teamAId
        ? m.teamBId
        : m.teamAId
      : null;
  if (last.type === 'bracket') {
    const finalRound = Math.max(...last.matches.map((m) => m.roundIndex ?? 0));
    const final = last.matches.find(
      (m) => m.roundIndex === finalRound && !m.isThirdPlace,
    );
    push(final?.winnerTeamId, 'Campeones');
    push(loserOf(final), 'Subcampeones');
    const third = last.matches.find((m) => m.isThirdPlace);
    if (third?.winnerTeamId) {
      push(third.winnerTeamId, 'Tercer puesto');
      push(loserOf(third), 'Cuarto puesto');
    } else {
      for (const semi of last.matches.filter(
        (m) => m.roundIndex === finalRound - 1 && !m.isThirdPlace,
      ))
        push(loserOf(semi), 'Semifinalistas');
    }
    // Earlier rounds, from the latest round out: losers by round.
    for (let r = finalRound - 2; r >= 0; r -= 1) {
      for (const m of last.matches.filter((x) => x.roundIndex === r))
        push(loserOf(m), r === 0 ? 'Play-in' : `Ronda ${r}`);
    }
  } else if (last.type === 'swiss') {
    const records = [...swissRecords(last)].sort(
      (a, b) => b.wins - a.wins || a.losses - b.losses,
    );
    for (const [i, t] of records.entries())
      push(t.id, i === 0 ? 'Campeones' : `${t.wins} victorias`);
  } else {
    const ordered = standingsOf(state, last).flatMap(({ rows: r }) => r);
    for (const [i, row] of ordered.entries())
      push(row.teamId, i === 0 ? 'Campeones' : `${row.position}º del grupo`);
  }
  // Whoever fell in an earlier phase, in that phase's order.
  for (const phase of [...played].reverse().slice(1)) {
    if (phase.type !== 'group') continue;
    for (const { rows: r } of standingsOf(state, phase))
      for (const row of r) push(row.teamId, `${row.position}º del grupo`);
  }
  for (const team of state.teams) push(team.id, 'Participantes');
  return rows;
};

export {
  activePhase,
  champion,
  type FinalRow,
  finalStandings,
  isPending,
  nextPhase,
  openTies,
  phaseIsComplete,
  qualifiersSeeding,
  standingsOf,
  swissRecords,
};
