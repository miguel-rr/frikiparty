/**
 * The URL form of a faction code: lowercase words joined by hyphens
 * (`battleOfFiveArmies` → `battle-of-five-armies`). The code itself stays
 * camelCase because tournaments and draws key on it.
 */
const factionSlug = (code: string) =>
  code
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();

export { factionSlug };
