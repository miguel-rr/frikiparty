import { generatePots } from '@/lib/tournament/pots';

/**
 * Pots as "groups with a quota": a group is a set of players and a rule
 * for how many of them each team takes. A classic pot is a group each
 * team takes exactly one from; a free market is a group teams take from
 * until they're full. Every layout below is a list of such groups.
 */

/**
 * - `ranking`: contiguous chunks of the ranking (the classic pots).
 * - `criterion_ranking`: a pot made by a rule (e.g. no team ring), the
 *   captains' pot and the rest of the ranking in chunks.
 * - `criterion_market`: the rule's pot, the captains' pot and everyone
 *   else in one free market.
 * - `market`: the captains' pot and a free market, no other pots.
 */
type PotLayout =
  | 'ranking'
  | 'criterion_ranking'
  | 'criterion_market'
  | 'market';

/** Who goes into the rule's pot. */
type PotCriterion = 'no_team_ring' | 'no_ring';

/**
 * More players meet the rule than there are teams:
 * - `best_out` / `worst_out`: the best / worst ranked of them leave the
 *   pot and join the rest;
 * - `draw_out`: a draw decides who leaves;
 * - `double`: they all stay and some teams take two.
 */
type CriterionSurplus = 'best_out' | 'worst_out' | 'draw_out' | 'double';

/**
 * Fewer players meet the rule than there are teams:
 * - `fill_worst`: the lowest ranked of the rest complete the pot;
 * - `leave_short`: the pot stays short and some teams take none.
 */
type CriterionShortage = 'fill_worst' | 'leave_short';

type GroupKind = 'ranking' | 'captains' | 'criterion' | 'market';

/**
 * How many of a group each team takes: exactly one, one at most (a short
 * pot), one or two (a pot with surplus kept), or as many as it needs.
 */
type GroupQuota = 'one' | 'at_most_one' | 'one_or_two' | 'fill';

type PotGroup = { kind: GroupKind; quota: GroupQuota };

type RingCount = { rings: number; individualRings: number };

type PotLayoutOptions = {
  layout: PotLayout;
  criterion: PotCriterion;
  surplus: CriterionSurplus;
  shortage: CriterionShortage;
};

type BuildPotGroupsInput = PotLayoutOptions & {
  /** Final ranking, best first. */
  order: string[];
  teamCount: number;
  teamSize: number;
  rings: Record<string, RingCount>;
  random?: () => number;
};

type BuiltPotGroups = {
  pots: string[][];
  groups: PotGroup[];
  /** Which pot holds the captains; null keeps the configured one. */
  captainPotIndex: number | null;
  /** Players who met the rule but left its pot (surplus). */
  movedOut: string[];
  /** Players added to the rule's pot without meeting it (shortage). */
  filledIn: string[];
  /** Whether chance decided who left. */
  drawn: boolean;
};

const meetsCriterion = (
  criterion: PotCriterion,
  count: RingCount | undefined,
) =>
  criterion === 'no_team_ring'
    ? (count?.rings ?? 0) === 0
    : (count?.rings ?? 0) === 0 && (count?.individualRings ?? 0) === 0;

const shuffleWith = <T>(items: T[], random: () => number): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
  }
  return copy;
};

/** Picks `count` items at random, keeping their original order. */
const pickRandom = <T>(items: T[], count: number, random: () => number) => {
  const chosen = new Set(
    shuffleWith(
      items.map((_, index) => index),
      random,
    ).slice(0, count),
  );
  return items.filter((_, index) => chosen.has(index));
};

const chunk = (ids: string[], size: number) => {
  const chunks: string[][] = [];
  for (let start = 0; start < ids.length; start += size) {
    chunks.push(ids.slice(start, start + size));
  }
  return chunks;
};

const rankingGroup = (pot: string[], teamCount: number): PotGroup => ({
  kind: 'ranking',
  quota: pot.length >= teamCount ? 'one' : 'at_most_one',
});

/** The rule's pot after the surplus or shortage option is applied. */
const criterionPot = (input: BuildPotGroupsInput) => {
  const { order, teamCount, criterion, surplus, shortage } = input;
  const random = input.random ?? Math.random;
  const meeting = order.filter((id) =>
    meetsCriterion(criterion, input.rings[id]),
  );
  if (meeting.length > teamCount) {
    if (surplus === 'double') {
      // Two each at most: anyone beyond that still has to leave.
      const extra = Math.max(0, meeting.length - 2 * teamCount);
      return {
        pot: meeting.slice(extra),
        movedOut: meeting.slice(0, extra),
        filledIn: [],
        drawn: false,
        quota: 'one_or_two' as const,
      };
    }
    const leaving = meeting.length - teamCount;
    const movedOut =
      surplus === 'best_out'
        ? meeting.slice(0, leaving)
        : surplus === 'worst_out'
          ? meeting.slice(-leaving)
          : pickRandom(meeting, leaving, random);
    const out = new Set(movedOut);
    return {
      pot: meeting.filter((id) => !out.has(id)),
      movedOut,
      filledIn: [],
      drawn: surplus === 'draw_out',
      quota: 'one' as const,
    };
  }
  if (meeting.length < teamCount && shortage === 'fill_worst') {
    const inPot = new Set(meeting);
    const filledIn = order
      .filter((id) => !inPot.has(id))
      .slice(-(teamCount - meeting.length));
    const members = new Set([...meeting, ...filledIn]);
    return {
      pot: order.filter((id) => members.has(id)),
      movedOut: [],
      filledIn,
      drawn: false,
      quota: 'one' as const,
    };
  }
  return {
    pot: meeting,
    movedOut: [],
    filledIn: [],
    drawn: false,
    quota:
      meeting.length >= teamCount ? ('one' as const) : ('at_most_one' as const),
  };
};

/**
 * Deals a final ranking into groups for the chosen layout. Outside the
 * classic layout the captains are the best ranked players who aren't in
 * the rule's pot, and their pot comes first.
 */
const buildPotGroups = (input: BuildPotGroupsInput): BuiltPotGroups => {
  const { order, teamCount, teamSize, layout } = input;
  if (layout === 'ranking') {
    const { pots } = generatePots(order, teamSize);
    return {
      pots,
      groups: pots.map((pot) => rankingGroup(pot, teamCount)),
      captainPotIndex: null,
      movedOut: [],
      filledIn: [],
      drawn: false,
    };
  }
  const withRule = layout !== 'market';
  const rule = withRule
    ? criterionPot(input)
    : {
        pot: [],
        movedOut: [],
        filledIn: [],
        drawn: false,
        quota: 'one' as const,
      };
  const ruled = new Set(rule.pot);
  const rest = order.filter((id) => !ruled.has(id));
  const captains = rest.slice(0, teamCount);
  const remaining = rest.slice(teamCount);
  const pots: string[][] = [captains];
  const groups: PotGroup[] = [{ kind: 'captains', quota: 'one' }];
  if (layout === 'criterion_ranking') {
    for (const pot of chunk(remaining, teamCount)) {
      pots.push(pot);
      groups.push(rankingGroup(pot, teamCount));
    }
  }
  if (withRule && rule.pot.length > 0) {
    pots.push(rule.pot);
    groups.push({ kind: 'criterion', quota: rule.quota });
  }
  if (layout !== 'criterion_ranking' && remaining.length > 0) {
    pots.push(remaining);
    groups.push({ kind: 'market', quota: 'fill' });
  }
  return {
    pots,
    groups,
    captainPotIndex: 0,
    movedOut: rule.movedOut,
    filledIn: rule.filledIn,
    drawn: rule.drawn,
  };
};

/** Groups as stored; pots dealt before groups existed are all classic. */
const groupsFor = (pots: string[][], groups: PotGroup[] | undefined) =>
  pots.map(
    (_, index): PotGroup =>
      groups?.[index] ?? { kind: 'ranking', quota: 'one' },
  );

/**
 * Quotas after the pots were moved by hand: a pot follows its size (one
 * each, one at most, or one or two), the market and the captains stay.
 */
const requota = (
  pots: string[][],
  groups: PotGroup[] | undefined,
  teamCount: number,
): PotGroup[] =>
  groupsFor(pots, groups).map((group, index) => {
    if (group.kind === 'market' || group.kind === 'captains') return group;
    const size = pots[index]?.length ?? 0;
    return {
      ...group,
      quota:
        size > teamCount
          ? 'one_or_two'
          : size === teamCount
            ? 'one'
            : 'at_most_one',
    };
  });

/**
 * Whether a layout needs a formation that understands quotas (free draft
 * or general auction): anything beyond "one per pot".
 */
const needsQuotaFormation = (groups: PotGroup[]) =>
  groups.some(
    (group) => group.quota === 'fill' || group.quota === 'one_or_two',
  );

/**
 * Random formation over groups: every team takes its quota of each group
 * at random, and whatever is flexible (short pots, a second player from a
 * pot with surplus, the market) goes to the teams with the most free
 * seats, so team sizes stay as even as possible.
 */
const dealRandomByGroups = (input: {
  pots: string[][];
  groups: PotGroup[];
  captainPotIndex: number;
  teamKeys: string[];
  teamSize: number;
  random?: () => number;
}): Record<string, string[]> => {
  const random = input.random ?? Math.random;
  const rosters: Record<string, string[]> = Object.fromEntries(
    input.teamKeys.map((key) => [key, [] as string[]]),
  );
  // The captain fills one seat.
  const freeSeats = (key: string) =>
    input.teamSize - 1 - (rosters[key]?.length ?? 0);
  const shuffled = <T>(items: T[]) => shuffleWith(items, random);
  /** The team with the most free seats among those allowed, at random on ties. */
  const roomiest = (allowed: string[]) => {
    const most = Math.max(...allowed.map(freeSeats));
    const best = allowed.filter((key) => freeSeats(key) === most);
    return best[Math.floor(random() * best.length)] ?? allowed[0];
  };
  const flexible: { playerId: string; avoid?: Set<string> }[] = [];
  input.pots.forEach((pot, index) => {
    if (index === input.captainPotIndex) return;
    const group = input.groups[index] ?? { kind: 'ranking', quota: 'one' };
    const players = shuffled(pot);
    if (group.quota === 'one' || group.quota === 'one_or_two') {
      const teams = shuffled(input.teamKeys);
      const firsts = players.slice(0, teams.length);
      firsts.forEach((playerId, i) => {
        const key = teams[i];
        if (key) rosters[key]?.push(playerId);
      });
      // A second player of this pot goes to a team without one: never a third.
      const taken = new Set<string>();
      for (const playerId of players.slice(teams.length)) {
        flexible.push({ playerId, avoid: taken });
      }
      return;
    }
    if (group.quota === 'at_most_one') {
      const used = new Set<string>();
      for (const playerId of players) {
        const allowed = input.teamKeys.filter((key) => !used.has(key));
        const key = roomiest(allowed.length > 0 ? allowed : input.teamKeys);
        if (!key) continue;
        used.add(key);
        rosters[key]?.push(playerId);
      }
      return;
    }
    for (const playerId of players) flexible.push({ playerId });
  });
  for (const { playerId, avoid } of flexible) {
    const allowed = avoid
      ? input.teamKeys.filter((key) => !avoid.has(key))
      : input.teamKeys;
    const key = roomiest(allowed.length > 0 ? allowed : input.teamKeys);
    if (!key) continue;
    avoid?.add(key);
    rosters[key]?.push(playerId);
  }
  return rosters;
};

export {
  type BuiltPotGroups,
  buildPotGroups,
  type CriterionShortage,
  type CriterionSurplus,
  dealRandomByGroups,
  type GroupKind,
  type GroupQuota,
  groupsFor,
  meetsCriterion,
  needsQuotaFormation,
  type PotCriterion,
  type PotGroup,
  type PotLayout,
  type PotLayoutOptions,
  type RingCount,
  requota,
};
