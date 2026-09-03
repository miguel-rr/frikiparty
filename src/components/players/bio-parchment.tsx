import { Almendra_Display, IM_Fell_English } from 'next/font/google';

/**
 * The player chronicle as an ancient sheet of parchment: silhouette carved
 * by an SVG displacement filter (broad undulation + fine deckle, alpha
 * hardened so the edge cuts sharp), scorched rim, two-scale vellum
 * mottling, old creases and a garnet wax seal stamped with the Ring. The
 * ink (IM Fell, rubricated versals) sits on an unfiltered layer above so
 * the text stays razor sharp.
 */

const imFell = IM_Fell_English({ subsets: ['latin'], weight: '400' });
const almendraDisplay = Almendra_Display({ subsets: ['latin'], weight: '400' });

const NOISE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='p'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' seed='11'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23p)' opacity='0.55'/%3E%3C/svg%3E\")";

const MOTTLE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='420' height='420'%3E%3Cfilter id='m'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.012' numOctaves='4' seed='19'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='420' height='420' filter='url(%23m)' opacity='0.75'/%3E%3C/svg%3E\")";

/** Splits a stored single-block bio into readable paragraphs. */
const bioParagraphs = (text: string): string[] => {
  if (text.includes('\n')) {
    return text.split(/\n+/).filter((part) => part.trim().length > 0);
  }
  const sentences = text.split(/(?<=[.!?…])\s+(?=[¡¿"«A-ZÀ-Ý])/);
  const paragraphCount = sentences.length >= 6 ? 3 : 2;
  const size = Math.ceil(sentences.length / paragraphCount);
  const paragraphs: string[] = [];
  for (let i = 0; i < sentences.length; i += size) {
    paragraphs.push(sentences.slice(i, i + size).join(' '));
  }
  return paragraphs;
};

const ParchmentFilters = () => (
  <svg aria-hidden="true" className="absolute size-0" focusable="false">
    <filter id="dsn-bio-edge">
      <feTurbulence
        baseFrequency="0.009 0.014"
        numOctaves="3"
        result="big"
        seed="7"
        type="fractalNoise"
      />
      <feDisplacementMap in="SourceGraphic" in2="big" result="d1" scale="34" />
      <feTurbulence
        baseFrequency="0.13 0.16"
        numOctaves="2"
        result="small"
        seed="4"
        type="fractalNoise"
      />
      <feDisplacementMap in="d1" in2="small" result="d2" scale="7" />
      <feComponentTransfer in="d2">
        <feFuncA intercept="-4" slope="14" type="linear" />
      </feComponentTransfer>
    </filter>
    <filter id="dsn-bio-wax">
      <feTurbulence
        baseFrequency="0.16"
        numOctaves="2"
        result="w"
        seed="12"
        type="fractalNoise"
      />
      <feDisplacementMap in="SourceGraphic" in2="w" result="wd" scale="5" />
      <feComponentTransfer in="wd">
        <feFuncA intercept="-2" slope="8" type="linear" />
      </feComponentTransfer>
    </filter>
  </svg>
);

/** Molten sealing wax, garnet, stamped with the Ring. */
const WaxSeal = () => (
  <div
    className="absolute right-8 -bottom-3 -rotate-7 sm:right-14"
    style={{
      filter:
        'url(#dsn-bio-wax) drop-shadow(0 7px 9px rgba(0,0,0,0.5)) drop-shadow(0 2px 3px rgba(0,0,0,0.45))',
    }}
  >
    <span
      aria-hidden="true"
      className="absolute top-9 -left-5 size-4"
      style={{
        borderRadius: '55% 45% 48% 52% / 50% 55% 45% 50%',
        backgroundImage:
          'radial-gradient(circle at 34% 28%, #a63a41 0%, #6f1520 55%, #45080f 100%)',
      }}
    />
    <div
      className="relative size-25"
      style={{
        borderRadius: '46% 54% 57% 43% / 53% 45% 55% 47%',
        backgroundImage:
          'radial-gradient(24% 18% at 30% 22%, rgba(255,196,186,0.6) 0%, transparent 70%), radial-gradient(80% 80% at 42% 36%, #97202c 0%, #74131f 48%, #4c0a13 82%, #35060c 100%)',
        boxShadow:
          'inset 0 2px 3px rgba(255,150,140,0.3), inset 0 -4px 7px rgba(24,2,5,0.7)',
      }}
    >
      <div
        className="absolute inset-3.25 rounded-full"
        style={{
          backgroundImage:
            'radial-gradient(75% 75% at 46% 40%, #7d1622 0%, #641020 55%, #4a0a14 100%)',
          boxShadow:
            'inset 0 3px 5px rgba(20,1,4,0.75), inset 0 -1.5px 2px rgba(230,120,110,0.3), 0 1px 1px rgba(235,140,130,0.25)',
        }}
      >
        <svg
          aria-hidden="true"
          className="absolute inset-0 size-full"
          fill="none"
          role="presentation"
          viewBox="0 0 74 74"
        >
          <circle cx="37" cy="36.2" r="17" stroke="#2e040a" strokeWidth="5" />
          <circle
            cx="37"
            cy="38"
            r="17"
            stroke="#c25a54"
            strokeOpacity="0.55"
            strokeWidth="5"
          />
          <circle cx="37" cy="37" r="17" stroke="#58101c" strokeWidth="4" />
          <circle
            cx="37"
            cy="36.4"
            r="24.5"
            stroke="#2e040a"
            strokeOpacity="0.8"
            strokeWidth="1.5"
          />
          <circle
            cx="37"
            cy="37.6"
            r="24.5"
            stroke="#c25a54"
            strokeOpacity="0.4"
            strokeWidth="1.5"
          />
        </svg>
      </div>
    </div>
  </div>
);

const BioParchment = ({ text }: { text: string }) => (
  <div className="w-full max-w-2xl">
    <ParchmentFilters />
    <div className="relative px-4 py-5">
      {/* The sheet: every visual layer rides the displacement filter */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          filter:
            'url(#dsn-bio-edge) drop-shadow(0 16px 26px rgba(0,0,0,0.55)) drop-shadow(0 3px 6px rgba(0,0,0,0.4))',
        }}
      >
        <div
          className="absolute inset-5"
          style={{
            clipPath:
              'polygon(1.2% 2%, 12% 0.4%, 30% 1.6%, 52% 0.2%, 71% 1.8%, 88% 0.6%, 99% 2.4%, 99.6% 18%, 98.6% 37%, 99.8% 55%, 98.9% 74%, 99.5% 90%, 98% 99%, 80% 98.2%, 60% 99.6%, 38% 98.4%, 18% 99.7%, 2.2% 98.3%, 0.4% 82%, 1.5% 63%, 0.2% 44%, 1.3% 24%)',
            backgroundImage:
              'radial-gradient(120% 95% at 48% 4%, #f2e7cb 0%, #e9dab2 42%, #dcc795 78%, #c8ad7a 100%)',
          }}
        >
          <span
            className="absolute inset-0 opacity-30 mix-blend-multiply"
            style={{ backgroundImage: MOTTLE, backgroundSize: '420px 420px' }}
          />
          <span
            className="absolute inset-0 opacity-35 mix-blend-multiply"
            style={{ backgroundImage: NOISE }}
          />
          <span
            className="absolute inset-0"
            style={{
              backgroundImage:
                'radial-gradient(34% 26% at 14% 86%, rgba(124,92,44,0.2) 0%, transparent 68%), radial-gradient(26% 20% at 88% 10%, rgba(124,92,44,0.16) 0%, transparent 70%), radial-gradient(18% 13% at 76% 78%, rgba(96,66,28,0.14) 0%, transparent 70%), radial-gradient(12% 9% at 30% 12%, rgba(96,66,28,0.1) 0%, transparent 70%)',
            }}
          />
          <span className="absolute inset-x-0 top-[38%] h-px bg-[#7a5a2b] opacity-25" />
          <span className="absolute inset-x-0 top-[calc(38%+1px)] h-px bg-[#fff3d8] opacity-40" />
          <span className="absolute inset-y-0 left-[62%] w-px bg-[#7a5a2b] opacity-15" />
          <span className="absolute inset-0 shadow-[inset_0_0_10px_3px_rgba(52,28,6,0.55)]" />
          <span className="absolute inset-0 shadow-[inset_0_0_34px_14px_rgba(96,60,22,0.4)]" />
          <span
            className="absolute inset-0"
            style={{
              backgroundImage:
                'radial-gradient(9% 7% at 0% 3%, rgba(30,16,4,0.8) 0%, rgba(66,38,12,0.5) 55%, transparent 78%), radial-gradient(11% 6% at 101% 94%, rgba(30,16,4,0.75) 0%, rgba(66,38,12,0.45) 55%, transparent 78%), radial-gradient(5% 9% at 100% 34%, rgba(40,22,6,0.6) 0%, transparent 75%), radial-gradient(7% 5% at 42% 100%, rgba(40,22,6,0.55) 0%, transparent 75%)',
            }}
          />
        </div>
      </div>
      {/* The ink, unfiltered and sharp */}
      <div className="relative flex flex-col gap-4 px-7 py-9 pb-16 sm:px-11 sm:py-10 sm:pb-16">
        {bioParagraphs(text).map((paragraph, index) => (
          <p
            className={`${imFell.className} hyphens-auto text-[#2b2113] text-base leading-relaxed sm:text-justify`}
            key={paragraph.slice(0, 16)}
          >
            {index === 0 ? (
              <span
                className={`${almendraDisplay.className} -mr-2 inline-block align-baseline text-[#8f2f1f] text-[4rem] leading-[0.72] [text-shadow:0_0_1px_rgba(143,47,31,0.55)]`}
              >
                {paragraph.charAt(0)}
              </span>
            ) : (
              <span className="-mr-[0.04rem] text-[#8f2f1f] text-[1.35em] leading-none [text-shadow:0_0_1px_rgba(143,47,31,0.45)]">
                {paragraph.charAt(0)}
              </span>
            )}
            {paragraph.slice(1)}
          </p>
        ))}
      </div>
      <WaxSeal />
    </div>
  </div>
);

export { BioParchment, WaxSeal };
