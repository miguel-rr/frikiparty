import type { FormationConfig } from '@/lib/tournament/formation-config';
import { groupsFor, type PotGroup } from '@/lib/tournament/pot-groups';

const QUOTA_TEXT: Record<PotGroup['quota'], string> = {
  one: 'uno por equipo',
  at_most_one: 'uno como mucho',
  one_or_two: 'uno o dos por equipo',
  fill: 'hasta completar',
};

const CRITERION_TEXT: Record<FormationConfig['potCriterion'], string> = {
  no_team_ring: 'Sin anillo de equipo',
  no_ring: 'Sin ningún anillo',
};

/**
 * What each pot is called on screen: captains, numbered ranking pots, the
 * rule's pot by its rule, the market. Pots dealt before groups existed
 * keep their plain numbers.
 */
const potLabels = (
  pots: string[][],
  groups: PotGroup[] | undefined,
  criterion: FormationConfig['potCriterion'],
  captainPotIndex: number,
) => {
  const resolved = groupsFor(pots, groups);
  // Classic pots keep their numbers; the captains' pot is just marked.
  if (!resolved.some((group) => group.kind === 'captains')) {
    return resolved.map((group, index) => ({
      title: `Bombo ${index + 1}`,
      detail:
        index === captainPotIndex
          ? 'capitanes'
          : groups
            ? QUOTA_TEXT[group.quota]
            : '',
    }));
  }
  // Otherwise the captains are pot 1 and the ranking pots follow.
  let number = 1;
  return resolved.map((group) => {
    if (group.kind === 'captains') {
      return { title: 'Capitanes', detail: QUOTA_TEXT.one };
    }
    if (group.kind === 'market') {
      return { title: 'Mercado libre', detail: QUOTA_TEXT.fill };
    }
    if (group.kind === 'criterion') {
      return {
        title: CRITERION_TEXT[criterion],
        detail: QUOTA_TEXT[group.quota],
      };
    }
    number += 1;
    return { title: `Bombo ${number}`, detail: QUOTA_TEXT[group.quota] };
  });
};

export { CRITERION_TEXT, potLabels, QUOTA_TEXT };
