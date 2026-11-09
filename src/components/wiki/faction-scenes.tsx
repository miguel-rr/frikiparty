import Link from 'next/link';
import type { ReactNode } from 'react';

import { FactionEmblem } from '@/components/wiki/faction-emblem';
import { WikiImage } from '@/components/wiki/wiki-image';
import {
  hasScene,
  mottoOf,
  SCENE_VERSION,
  sceneKey,
} from '@/lib/wiki/faction-scenes';
import { factionSlug } from '@/lib/wiki/faction-slug';
import { publicUrl } from '@/server/storage/r2';

type SceneFaction = {
  id: string;
  name: string;
  code: string | null;
  imageUrl: string | null;
  transformsFactionId: string | null;
};

type Scene = { url: string; borrowed: boolean } | null;

const sceneOf = (
  faction: SceneFaction,
  parent: SceneFaction | undefined,
): Scene => {
  if (hasScene(faction.code))
    return { url: sceneUrl(faction.code), borrowed: false };
  if (parent && hasScene(parent.code))
    return { url: sceneUrl(parent.code), borrowed: true };
  return null;
};

const sceneUrl = (code: string) =>
  `${publicUrl(sceneKey(code))}?v=${SCENE_VERSION}`;

const SceneCard = ({
  href,
  scene,
  small,
  children,
}: {
  href: string | null;
  scene: Scene;
  small: boolean;
  children: ReactNode;
}) => {
  const body = (
    <>
      {scene ? (
        <WikiImage
          alt=""
          className={`absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105 ${scene.borrowed ? 'brightness-75 saturate-[.35]' : ''}`}
          src={scene.url}
        />
      ) : null}
      <span className="absolute inset-0 bg-linear-to-b from-35% from-transparent to-black/85" />
      <span
        className={`absolute flex items-center gap-3 ${small ? 'inset-x-3 bottom-2.5' : 'inset-x-4 bottom-3.5'}`}
      >
        {children}
      </span>
    </>
  );
  const cls = `group relative block overflow-hidden rounded-2xl border bg-(--night-2) shadow-[0_14px_30px_#00000080] transition-colors hover:border-(--gold) ${small ? 'aspect-video border-(--hair)' : 'aspect-[16/10] border-(--hair-gold)'}`;
  return href ? (
    <Link className={cls} href={href}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
};

/**
 * The factions over the game's own loading screens: the core ones large,
 * with their crest and motto, then the alternates, each over the map it
 * belongs to (or, without one, over its core faction's scene, faded).
 */
const FactionScenes = ({
  factions,
  slug,
  version,
}: {
  factions: SceneFaction[];
  slug: string;
  version: string | undefined;
}) => {
  const byId = new Map(factions.map((f) => [f.id, f]));
  const core = factions.filter((f) => !f.transformsFactionId);
  const alternates = factions.filter((f) => f.transformsFactionId);
  const hrefOf = (f: SceneFaction) =>
    version && f.code
      ? `/games/${slug}/${version}/${factionSlug(f.code)}`
      : null;
  return (
    <div className="flex flex-col gap-10">
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {core.map((f) => {
          const motto = mottoOf(f.code);
          return (
            <li key={f.id}>
              <SceneCard
                href={hrefOf(f)}
                scene={sceneOf(f, undefined)}
                small={false}
              >
                {f.imageUrl ? (
                  <WikiImage
                    alt=""
                    className="size-14 shrink-0 object-contain drop-shadow-[0_2px_8px_#000]"
                    src={f.imageUrl}
                  />
                ) : (
                  <FactionEmblem
                    className="shrink-0 text-(--gold)"
                    code={f.code}
                    size={44}
                  />
                )}
                <span className="flex min-w-0 flex-col">
                  <span className="d-display font-bold text-(--parchment) text-xl uppercase [text-shadow:0_2px_10px_#000] group-hover:text-(--gold-hi)">
                    {f.name}
                  </span>
                  {motto ? (
                    <span className="text-(--parchment)/80 text-xs">
                      {motto}
                    </span>
                  ) : null}
                </span>
              </SceneCard>
            </li>
          );
        })}
      </ul>
      {alternates.length > 0 ? (
        <div className="flex flex-col gap-4">
          <h4 className="d-display font-bold text-(--parchment) text-base uppercase">
            Facciones alternativas · ligadas a mapas
          </h4>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {alternates.map((f) => {
              const parent = f.transformsFactionId
                ? byId.get(f.transformsFactionId)
                : undefined;
              return (
                <li key={f.id}>
                  <SceneCard href={hrefOf(f)} scene={sceneOf(f, parent)} small>
                    <span className="flex min-w-0 flex-col">
                      <span className="d-display font-bold text-(--parchment) text-sm uppercase leading-tight [text-shadow:0_2px_8px_#000] group-hover:text-(--gold-hi)">
                        {f.name}
                      </span>
                      {parent ? (
                        <span className="text-(--parchment)/75 text-xs">
                          sobre {parent.name}
                        </span>
                      ) : null}
                    </span>
                  </SceneCard>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
};

export { FactionScenes };
