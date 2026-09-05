import { RACE_EMBLEMS } from '@/components/theme/emblems';
import { FACTIONS, type FactionId } from '@/lib/tournament/factions';

/** A faction's emblem from the presentation catalogue, or a neutral shield. */
const FactionEmblem = ({
  code,
  size = 40,
  className = '',
}: {
  code: string | null;
  size?: number;
  className?: string;
}) => {
  const path =
    code && code in FACTIONS
      ? FACTIONS[code as FactionId].emblem
      : RACE_EMBLEMS.warrior;
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="currentColor"
      height={size}
      viewBox="0 0 512 512"
      width={size}
    >
      <path d={path} />
    </svg>
  );
};

export { FactionEmblem };
