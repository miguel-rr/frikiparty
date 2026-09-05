'use client';

import { useSessionUser } from '@/components/layout/auth-slot';
import { CommentThread } from '@/components/social/comment-thread';
import { panel } from '@/components/theme/primitives';

/**
 * The tournament wall: the edition's comment thread, open to anyone whose
 * account has claimed a player (the archive rule). Anonymous visitors see
 * the door, not the conversation.
 */
const CouncilWall = ({ editionId }: { editionId: string }) => {
  const { user } = useSessionUser();
  return (
    <section className={`${panel} flex flex-col gap-3 p-5 sm:p-7`}>
      <h3 className="d-display font-bold text-(--parchment) text-xl uppercase">
        El tablón
      </h3>
      {user ? (
        <CommentThread target={{ editionId }} />
      ) : (
        <p className="text-(--faded) text-sm">
          El tablón es para los del Concilio: entra con tu cuenta para leerlo y
          escribir en él.
        </p>
      )}
    </section>
  );
};

export { CouncilWall };
