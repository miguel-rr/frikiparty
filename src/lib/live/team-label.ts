type TeamLike = {
  name: string | null;
  members: { name: string; isCaptain: boolean; seat?: number | null }[];
};

/**
 * How a team is called: its chosen name if the captain gave one, else
 * "Equipo de <captain>". The players stay the point (core-logic): the
 * roster string lists them, captain first.
 */
const teamLabel = (team: TeamLike | undefined | null) => {
  if (!team) return 'Por decidir';
  if (team.name) return team.name;
  const captain = team.members.find((m) => m.isCaptain);
  return captain ? `Equipo de ${captain.name}` : 'Equipo';
};

const teamRoster = (team: TeamLike | undefined | null) =>
  team
    ? [...team.members]
        .sort(
          (a, b) =>
            Number(b.isCaptain) - Number(a.isCaptain) ||
            (a.seat ?? 99) - (b.seat ?? 99),
        )
        .map((m) => m.name)
        .join(' · ')
    : '';

export { teamLabel, teamRoster };
