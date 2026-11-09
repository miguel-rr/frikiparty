'use client';

import type { ComponentProps } from 'react';

import { GameFiles } from '@/components/games/game-files';
import { authClient } from '@/server/better-auth/client';
import { api } from '@/trpc/react';

type MemberGameFilesProps = Omit<
  ComponentProps<typeof GameFiles>,
  'files' | 'viewerId' | 'canModerate'
> & {
  /** Version page: list that version's files (plus the generic ones). */
  listVersionId?: string;
};

/**
 * The members-only files, fetched from the browser so the game and
 * version pages stay statically built. Anonymous visitors and accounts
 * without archive access see nothing (the query fails quietly).
 */
const MemberGameFiles = ({ listVersionId, ...props }: MemberGameFilesProps) => {
  const { data: session } = authClient.useSession();
  const list = api.gameFiles.list.useQuery(
    { gameId: props.gameId, gameVersionId: listVersionId },
    { enabled: Boolean(session?.user), retry: false },
  );
  if (!session?.user || !list.data) return null;
  return (
    <GameFiles
      {...props}
      canModerate={list.data.canModerate}
      files={list.data.files}
      viewerId={list.data.viewerId}
    />
  );
};

export { MemberGameFiles };
