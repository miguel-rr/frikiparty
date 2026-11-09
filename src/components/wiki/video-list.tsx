import { panel, tag } from '@/components/theme/primitives';
import { YouTubeEmbed } from '@/components/wiki/youtube-embed';
import type { GuideVideo } from '@/lib/wiki/guides/types';

const LANGUAGE_LABELS: Record<GuideVideo['language'], string> = {
  es: 'Castellano',
  en: 'Inglés',
};

const youtubeUrl = (v: GuideVideo) =>
  v.playlist
    ? `https://www.youtube.com/playlist?list=${v.youtubeId}`
    : `https://www.youtube.com/watch?v=${v.youtubeId}`;

/** Spanish videos first; otherwise the hand-picked order stays. */
const inSpanishFirst = (videos: GuideVideo[]) => [
  ...videos.filter((v) => v.language === 'es'),
  ...videos.filter((v) => v.language !== 'es'),
];

/**
 * Videos as cards: the player, the title and channel, language and game
 * version, and a warning when the video predates the version we play.
 */
const VideoList = ({
  videos,
  currentVersion,
}: {
  videos: GuideVideo[];
  /** The version the site plays, e.g. "10.0"; older videos get a warning. */
  currentVersion: string;
}) => (
  <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {inSpanishFirst(videos).map((v) => {
      const outdated =
        v.version !== null && !currentVersion.startsWith(v.version);
      return (
        <li className={`${panel} flex flex-col gap-3 p-3`} key={v.youtubeId}>
          <YouTubeEmbed
            playlist={v.playlist}
            title={v.title}
            youtubeId={v.youtubeId}
          />
          <div className="flex flex-wrap gap-1.5">
            <span className={tag}>{LANGUAGE_LABELS[v.language]}</span>
            <span className={tag}>
              {v.version ? `Versión ${v.version}` : 'Versión sin indicar'}
            </span>
          </div>
          <a
            className="font-bold text-(--parchment) text-sm leading-snug hover:text-(--gold-hi)"
            href={youtubeUrl(v)}
            rel="noreferrer"
            target="_blank"
          >
            {v.title}
          </a>
          <span className="font-mono text-(--faded) text-2xs uppercase tracking-2xl">
            {v.channel}
          </span>
          <p className="text-(--parchment)/85 text-sm">{v.why}</p>
          {outdated ? (
            <p className="text-(--ember) text-xs">
              Es de la {v.version}: la forma de jugar se parece, pero los
              números han cambiado.
            </p>
          ) : null}
        </li>
      );
    })}
  </ul>
);

export { VideoList };
