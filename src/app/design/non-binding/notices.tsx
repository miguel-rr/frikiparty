const HEADLINE = 'No vinculante';
const BODY =
  'Estas votaciones no deciden nada por sí solas. Son orientativas: sirven para saber qué piensa el grupo antes de cerrar el formato.';

/** A · A rubber stamp next to the text. */
const StampNotice = () => (
  <div className="mx-auto flex max-w-2xl flex-col items-center gap-5 sm:flex-row sm:gap-8">
    <div className="flex-none -rotate-6 rounded-md border-(--ember) border-4 border-double px-5 py-3 text-center text-(--ember)">
      <div className="d-display font-black text-3xl uppercase leading-none tracking-wide">
        {HEADLINE}
      </div>
      <div className="mt-1 font-mono text-2xs uppercase tracking-2xl">
        Votación orientativa
      </div>
    </div>
    <p className="text-center text-(--parchment) text-lg sm:text-left">
      {BODY}
    </p>
  </div>
);

/** B · A wide band with the warning as its title. */
const BandNotice = () => (
  <div className="mx-auto flex max-w-3xl flex-col gap-2 rounded-xl border border-(--ember)/60 border-l-8 bg-(--ember)/10 px-6 py-5">
    <span className="font-mono text-(--ember) text-2xs uppercase tracking-2xl">
      Antes de votar
    </span>
    <span className="d-display font-black text-(--parchment) text-3xl uppercase">
      Votación orientativa, {HEADLINE.toLowerCase()}
    </span>
    <p className="text-(--parchment)">{BODY}</p>
  </div>
);

/** C · A parchment note, the only light block on the page. */
const ParchmentNotice = () => (
  <div className="mx-auto flex max-w-2xl flex-col gap-2 rounded-lg bg-(--parchment) px-6 py-5 text-(--night) shadow-[0_12px_30px_#00000080]">
    <span className="font-mono text-2xs uppercase tracking-2xl opacity-70">
      Nota del departamento
    </span>
    <span className="d-display font-black text-3xl uppercase">{HEADLINE}</span>
    <p>{BODY}</p>
  </div>
);

export { BandNotice, ParchmentNotice, StampNotice };
