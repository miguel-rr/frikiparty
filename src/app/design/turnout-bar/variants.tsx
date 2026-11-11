type Turnout = { votes: number; eligible: number; quorum: number };

const missing = ({ votes, quorum }: Turnout) => Math.max(0, quorum - votes);

const statusText = (turnout: Turnout) =>
  missing(turnout) === 0
    ? 'Resultados abiertos'
    : `Faltan ${missing(turnout)} para ver resultados`;

/** A · One seat per confirmed player; the quorum seat is marked. */
const SeatsBar = ({ turnout }: { turnout: Turnout }) => {
  const reached = missing(turnout) === 0;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1">
        {Array.from({ length: turnout.eligible }, (_, index) => {
          const filled = index < turnout.votes;
          const isQuorum = index === turnout.quorum - 1;
          return (
            <span
              className={`relative h-3 flex-1 rounded-[3px] ${
                filled
                  ? reached
                    ? 'bg-(--gold-hi)'
                    : 'bg-(--gold)'
                  : 'bg-(--night-2) shadow-[inset_0_0_0_1px_var(--hair)]'
              } ${isQuorum ? 'outline-(--parchment) outline-2 outline-offset-2' : ''}`}
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed seats
              key={index}
            />
          );
        })}
      </div>
      <div className="flex justify-between gap-3 font-mono text-(--faded) text-2xs uppercase tracking-xl">
        <span>
          <strong className="text-(--parchment)">{turnout.votes}</strong> de{' '}
          {turnout.eligible} han votado
        </span>
        <span className={reached ? 'text-(--gold-hi)' : ''}>
          {statusText(turnout)}
        </span>
      </div>
    </div>
  );
};

/** B · Big count on the left, slim bar with a labelled quorum flag. */
const CountBar = ({ turnout }: { turnout: Turnout }) => {
  const reached = missing(turnout) === 0;
  const at = (turnout.quorum / turnout.eligible) * 100;
  return (
    <div className="flex items-center gap-4">
      <div className="flex flex-none items-baseline gap-1">
        <span className="d-display font-black text-(--parchment) text-3xl">
          {turnout.votes}
        </span>
        <span className="font-mono text-(--faded) text-sm">
          /{turnout.eligible}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 pt-4">
        <div className="relative h-1.5 rounded-full bg-(--night-2)">
          <div
            className={`h-full rounded-full ${reached ? 'bg-(--gold-hi)' : 'bg-(--gold)'}`}
            style={{ width: `${(turnout.votes / turnout.eligible) * 100}%` }}
          />
          <span
            className="absolute -top-5 -translate-x-1/2 font-mono text-(--parchment) text-2xs"
            style={{ left: `${at}%` }}
          >
            ◆ {turnout.quorum}
          </span>
          <span
            aria-hidden
            className="absolute -top-1 h-3.5 w-px -translate-x-1/2 bg-(--parchment)"
            style={{ left: `${at}%` }}
          />
        </div>
        <span
          className={`font-mono text-2xs uppercase tracking-xl ${reached ? 'text-(--gold-hi)' : 'text-(--faded)'}`}
        >
          {statusText(turnout)}
        </span>
      </div>
    </div>
  );
};

/** C · Two zones: before the quorum (locked) and after it (results). */
const ZonesBar = ({ turnout }: { turnout: Turnout }) => {
  const reached = missing(turnout) === 0;
  const at = (turnout.quorum / turnout.eligible) * 100;
  const fill = (turnout.votes / turnout.eligible) * 100;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative flex h-5 overflow-hidden rounded-md border border-(--hair-gold)">
        <div className="h-full bg-(--night-2)" style={{ width: `${at}%` }} />
        <div className="h-full flex-1 bg-(--gold)/10" />
        <div
          className={`absolute inset-y-0 left-0 ${reached ? 'bg-linear-to-r from-(--gold) to-(--gold-hi)' : 'bg-(--gold)/70'}`}
          style={{ width: `${fill}%` }}
        />
        <span
          aria-hidden
          className="absolute inset-y-0 w-0.5 bg-(--parchment)"
          style={{ left: `${at}%` }}
        />
      </div>
      <div className="relative flex font-mono text-2xs uppercase tracking-xl">
        <span className="text-(--faded)" style={{ width: `${at}%` }}>
          🔒 {turnout.votes} de {turnout.eligible}
        </span>
        <span className={reached ? 'text-(--gold-hi)' : 'text-(--faded)'}>
          {reached
            ? 'Resultados abiertos'
            : `Resultados · faltan ${missing(turnout)}`}
        </span>
      </div>
    </div>
  );
};

const VARIANTS = { seats: SeatsBar, count: CountBar, zones: ZonesBar } as const;

const SAMPLES: Turnout[] = [
  { votes: 0, eligible: 20, quorum: 11 },
  { votes: 7, eligible: 20, quorum: 11 },
  { votes: 11, eligible: 20, quorum: 11 },
  { votes: 17, eligible: 20, quorum: 11 },
];

const VariantRow = ({ variant }: { variant: keyof typeof VARIANTS }) => {
  const Bar = VARIANTS[variant];
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {SAMPLES.map((turnout) => (
        <div
          className="d-scape rounded-xl border border-(--hair-gold) p-5"
          key={turnout.votes}
        >
          <Bar turnout={turnout} />
        </div>
      ))}
    </div>
  );
};

export { VariantRow };
