import { TRPCError } from '@trpc/server';
import { notFound } from 'next/navigation';

import { PlayerProfile } from '@/app/players/[slug]/_components/player-profile';
import { api } from '@/trpc/server';

type PlayerPageProps = {
  params: Promise<{ slug: string }>;
};

const PlayerPage = async ({ params }: PlayerPageProps) => {
  const { slug } = await params;

  const player = await api.player.bySlug({ slug }).catch((error) => {
    if (error instanceof TRPCError && error.code === 'NOT_FOUND') {
      notFound();
    }
    throw error;
  });

  return (
    <main className="mx-auto flex max-w-[720px] flex-col gap-8 px-4 py-8 sm:px-8">
      <PlayerProfile {...player} />
    </main>
  );
};

export default PlayerPage;
