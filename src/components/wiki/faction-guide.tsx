import Link from 'next/link';

import { linkGold, panel, tag } from '@/components/theme/primitives';
import { heading, subheading } from '@/components/wiki/army-views';
import { VideoList } from '@/components/wiki/video-list';
import { DIFFICULTY_LABELS } from '@/lib/wiki/guides';
import type {
  FactionGuide as Guide,
  GuideVideo,
} from '@/lib/wiki/guides/types';

const Card = ({ title, items }: { title: string; items: string[] }) => (
  <div className={`${panel} flex flex-col gap-2 p-4`}>
    <span className={subheading}>{title}</span>
    <ul className="flex list-disc flex-col gap-1.5 pl-5 text-(--parchment)/90 text-sm">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  </div>
);

/**
 * "Cómo jugarla": the faction's plan for someone who barely plays, plus
 * its videos. Sits on the faction page between the summary and the heroes.
 */
const FactionGuide = ({
  guide,
  videos,
  slug,
  currentVersion,
}: {
  guide: Guide | null;
  videos: GuideVideo[];
  slug: string;
  currentVersion: string;
}) => {
  if (!guide && videos.length === 0) return null;
  return (
    <div className="flex flex-col gap-4">
      <h3 className={heading} id="guide">
        Cómo jugarla
      </h3>
      {guide ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className={tag}>{DIFFICULTY_LABELS[guide.difficulty]}</span>
            <span className={tag}>Escrita para la {guide.version}</span>
          </div>
          <p className="d-display text-(--gold-hi) text-lg">{guide.style}</p>
          <div className={`${panel} flex flex-col gap-3 p-4`}>
            <span className={subheading}>Los primeros minutos</span>
            <ol className="flex flex-col gap-2">
              {guide.opening.map((step, i) => (
                <li className="flex gap-3 text-sm" key={step}>
                  <span className="d-display flex size-6 shrink-0 items-center justify-center rounded-full border border-(--hair-gold) font-bold text-(--gold) text-xs">
                    {i + 1}
                  </span>
                  <span className="pt-0.5 text-(--parchment)/90">{step}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card items={guide.keyUnits} title="Unidades clave" />
            <Card items={guide.heroes} title="Héroes" />
            <Card items={guide.powers} title="Poderes recomendados" />
            <Card items={guide.howToWin} title="Cómo se gana" />
            <Card items={guide.howToLose} title="Qué te hace perder" />
            <Card items={guide.against} title="Si te toca contra ella" />
          </div>
          <p className="text-(--faded) text-xs">
            Borrador sacado de los datos de la {guide.version} y de cómo se
            jugaba en la 9.x, pendiente de probar en partida. Lo básico, en{' '}
            <Link className={linkGold} href={`/games/${slug}/guide`}>
              Empieza aquí
            </Link>
            .
          </p>
        </>
      ) : null}
      {videos.length > 0 ? (
        <>
          <span className={subheading}>Vídeos</span>
          <VideoList currentVersion={currentVersion} videos={videos} />
        </>
      ) : null}
    </div>
  );
};

export { FactionGuide };
