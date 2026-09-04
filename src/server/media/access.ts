import { getPlayerForUser } from '@/server/api/routers/player';
import type { TRPCContext } from '@/server/api/trpc';

type SessionUser = { id: string; role: string };

type ArchiveAccess = {
  /** May see galleries and open /archive/<id>, and upload. */
  allowed: boolean;
  isAdmin: boolean;
  /** May edit and remove any file, not just their own: admins and editors. */
  canModerate: boolean;
  /** The player this account has claimed, to preselect in the upload form. */
  playerId: string | null;
};

/**
 * One rule for the whole archive, reading and writing alike: admins and
 * editors always; anyone else only once their account has claimed a
 * player (see player.linkByCode). Anonymous visitors never.
 */
const resolveArchiveAccess = async (
  db: TRPCContext['db'],
  user: SessionUser | null | undefined,
): Promise<ArchiveAccess> => {
  if (!user) {
    return {
      allowed: false,
      isAdmin: false,
      canModerate: false,
      playerId: null,
    };
  }
  const isAdmin = user.role === 'admin';
  const canModerate = isAdmin || user.role === 'editor';
  const linked = await getPlayerForUser(db, user.id);
  return {
    allowed: canModerate || linked !== null,
    isAdmin,
    canModerate,
    playerId: linked?.id ?? null,
  };
};

export { type ArchiveAccess, resolveArchiveAccess };
