'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { api } from '@/trpc/react';

/**
 * The door of /live keeps an eye on the tournament: the page is rendered
 * on the server, so when the organiser gives the start (or creates,
 * deletes or moves a tournament) the door asks for a fresh render instead
 * of waiting for someone to reload.
 */
const LiveDoorWatch = ({
  initial,
}: {
  /** What the server saw when it rendered: id and stage, or nothing. */
  initial: { id: string; stage: string } | null;
}) => {
  const router = useRouter();
  const current = api.live.current.useQuery(undefined, {
    refetchInterval: 4000,
    refetchOnWindowFocus: true,
  });
  const seen = current.data
    ? `${current.data.id}:${current.data.stage}`
    : current.isSuccess
      ? 'none'
      : null;
  const known = initial ? `${initial.id}:${initial.stage}` : 'none';
  useEffect(() => {
    if (seen !== null && seen !== known) router.refresh();
  }, [seen, known, router]);
  return null;
};

export { LiveDoorWatch };
