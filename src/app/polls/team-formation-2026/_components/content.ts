/**
 * The copy of the 2026 team-formation proposal: the polls page and the
 * three full-proposal pages read from here.
 */

const PAGE = 'team-formation-2026';
const PAGE_PATH = `/polls/${PAGE}`;

const DEPARTMENT =
  'Departamento de Sistemas de Conformación de Equipos y Competición';

const OPENING = {
  tag: 'Frikiparty 2026 · Propuesta oficial',
  titleTop: 'Que cada capitán',
  titleGold: 'compre su destino',
  paragraphs: [
    'Armonds y Palons, presidente y secretario del Departamento de Sistemas de Conformación de Equipos y Competición, se enorgullecen en presentar ante el Concilio la propuesta para la formación de equipos de la Frikiparty 2026.',
    'Durante años, los bombos nos dieron equipos. También nos dieron discusiones que todavía colean. Hemos escuchado las quejas, hemos repasado cada edición y hemos llegado a una conclusión: el problema no son los jugadores, es el sistema.',
    'Por eso proponemos cambiar su corazón. Este año, cada capitán construirá su equipo jugador a jugador, con su criterio y con su dinero. Una subasta.',
    'Lo que sigue es corto. Léelo entero y vota. La votación es orientativa, no vinculante: queremos saber qué piensa el grupo antes de decidir.',
  ],
  given: 'Dado en el Concilio, a 11 de noviembre de 2026',
  signatures: [
    { name: 'Armonds', role: 'Presidente' },
    { name: 'Palons', role: 'Secretario' },
  ],
} as const;

const AUCTION = {
  title: 'El centro: la subasta',
  paragraphs: [
    'Cada capitán empieza con 100 monedas y construye su equipo pujando por los jugadores, uno a uno.',
    'Las tres propuestas acaban en esta subasta. Lo que cambia entre ellas es el paso previo: qué ranking usamos, si hay bombos y quién es capitán. Para eso traemos tres opciones.',
  ],
  summaries: [
    {
      annex: 'annex-bidding',
      title: 'Cómo se puja',
      text: 'En sobre cerrado: cada capitán escribe en secreto lo máximo que pagaría. Gana la puja más alta y paga la segunda más una moneda. Al cerrar el lote se ven todos los sobres.',
    },
    {
      annex: 'annex-nomination',
      title: 'Orden de subasta',
      text: 'Lo deciden los capitanes. Por turnos, cada uno elige qué jugador sale a subasta y se ve obligado a pujar por él al menos 1 moneda: si no puja nadie más, se lo lleva. El orden de turnos se sortea en cada ronda.',
    },
  ],
} as const;

type Advantage = {
  /** The problem, over the left column. */
  problem: string;
  title: string;
  before: string;
  after: string;
};

const ADVANTAGES: Advantage[] = [
  {
    problem: 'El bombo lo decidían los anillos',
    title: 'Cada jugador vale lo que los capitanes creen que vale',
    before:
      'Los bombos se decidían por anillos o votaciones cutres, no por el nivel real. Jugadores de los mejores de la mesa acababan en el bombo 4 por no tener anillos de equipo, y quien los sacaba se llevaba un regalo.',
    after:
      'Nadie cae en ningún bombo por accidente. Si un jugador es muy bueno, costará caro.',
  },
  {
    problem: 'Esperar a que te elijan',
    title: 'El equipo juega desde el primer minuto',
    before:
      'Cada jugador esperaba a que lo eligieran y miraba el draft desde fuera.',
    after:
      'En cuanto un jugador es subastado, pasa a ser del equipo y ayuda a su capitán con la estrategia el resto de la subasta. Las pujas se deciden en equipo.',
  },
  {
    problem: 'Medio equipo, a suerte',
    title: 'Decide el equipo, no la suerte',
    before:
      'El sorteo y el orden del draft decidían medio equipo, y las quejas llegaban después.',
    after:
      'El capitán, y con él cada jugador que ya ha fichado, decide en quién gastar y en quién no. Si el equipo no os gusta, no hay sorteo al que echarle la culpa.',
  },
  {
    problem: 'Equipos con varias estrellas',
    title: 'Imposible juntar a todos los buenos',
    before:
      'Con suerte en el sorteo y en los bombos, un equipo podía reunir a varios de los mejores.',
    after:
      'Los buenos cuestan caro y el dinero no da para todo. Quien se pasa pujando por uno lo nota en el resto del equipo: el presupuesto obliga a repartir el talento.',
  },
];

type ProposalKey = 'free' | 'intermediate' | 'strict';

type AnnexId =
  | 'annex-bidding'
  | 'annex-nomination'
  | 'annex-money'
  | 'annex-ties'
  | 'annex-pots'
  | 'annex-ringless'
  | 'annex-volunteers';

type Annex = {
  id: AnnexId;
  title: string;
  scope: ProposalKey | null;
  text: string;
};

const ANNEXES: Annex[] = [
  {
    id: 'annex-bidding',
    title: 'Cómo se puja',
    scope: null,
    text: 'Sale un jugador y cada capitán que todavía puede llevárselo escribe su puja en secreto. Hay un tiempo por lote. El capitán que lo ha nominado está obligado a pujar al menos 1; los demás pueden pasar. Gana la puja más alta y paga la segunda más una moneda, nunca más de lo que escribió: así conviene escribir lo que de verdad vale para ti, porque pujar de más no te hace pagar más. Si solo puja quien nominó, se lo lleva por 1. Si las pujas más altas empatan (por ejemplo, todos escriben 1), gana quien tiene más dinero y paga lo que escribió; si también en eso empatan, sorteo. Al cerrar el lote se ven todas las pujas.',
  },
  {
    id: 'annex-nomination',
    title: 'Orden de subasta',
    scope: null,
    text: 'No hay orden de salida fijo: los jugadores salen a subasta cuando un capitán los nomina. Los capitanes nominan por turnos, y en cada ronda completa (cinco jugadores subastados, uno por capitán) el orden de nominación se vuelve a sortear. En su turno, el capitán elige a quién se subasta y abre con al menos 1, así que ningún lote se queda sin dueño. Quien ya tiene el equipo completo pasa turno.',
  },
  {
    id: 'annex-money',
    title: 'Dinero y reserva',
    scope: null,
    text: 'Cada capitán empieza con 100 monedas. Nadie puede pujar tanto que se quede sin una moneda por cada plaza que le falte por llenar, para que ningún equipo se quede cojo.',
  },
  {
    id: 'annex-ties',
    title: 'Empates en el ranking',
    scope: null,
    text: 'El ranking histórico ordena por anillos de equipo. Con los mismos anillos desempatan los anillos individuales. Si siguen empatados, se sortea entre ellos.',
  },
  {
    id: 'annex-volunteers',
    title: 'Si hay pocos o muchos voluntarios',
    scope: 'free',
    text: 'Si se ofrecen más de cinco, son capitanes los cinco mejor situados en el ranking histórico. Si se ofrecen menos, se completa con los mejor situados de los que no se ofrecieron. Las respuestas no se ven hasta que se cierra la votación de capitanes.',
  },
  {
    id: 'annex-ringless',
    title: 'El bombo sin anillo',
    scope: 'intermediate',
    text: 'Son los cinco jugadores sin anillo de equipo: Guille, Armonds, Ita, Perico y el Jugador Misterioso. Se subastan aparte, uno por equipo, para que el campeón de este año tenga al menos un nuevo portador. Si alguno de ellos es de los mejores, quien lo quiera tendrá que pagarlo.',
  },
  {
    id: 'annex-pots',
    title: 'Subasta por bombos',
    scope: 'strict',
    text: 'Cada bombo se subasta por separado, del 2 al 4. Un capitán que ya tiene jugador de ese bombo no puja más en él. El último jugador de cada bombo va al único capitán que queda, por el mínimo.',
  },
];

type Question = { question: string; answer: string };

type Step = {
  title: string;
  paragraphs: string[];
  list?: string[];
  /** A boxed subsection inside the step, for the parts worth a closer look. */
  aside?: { title: string; paragraphs: string[] };
  /** Extra questions under the step. */
  questions?: Question[];
};

const TIES_QUESTION: Question = {
  question: '¿Y si dos jugadores empatan en el ranking?',
  answer:
    'Desempatan los anillos individuales y, si siguen igual, se sortea entre ellos.',
};

/** Shared by every proposal: same ranking, same money, same auction. */
const RANKING_STEP: Step = {
  title: 'El ranking',
  paragraphs: [
    'Se usa el ranking histórico de la Frikiparty, que ordena a los jugadores por anillos de equipo ganados.',
  ],
  questions: [TIES_QUESTION],
};

const MONEY_STEP: Step = {
  title: 'El dinero',
  paragraphs: [
    'Cada capitán empieza con 100 monedas. Es todo su presupuesto para completar el equipo: no hay más dinero ni se recarga por el camino.',
    'La única condición es la reserva: nadie puede pujar tanto que se quede sin una moneda por cada plaza que le falte por llenar. Así ningún equipo se queda cojo.',
  ],
  questions: [
    {
      question: '¿Cuánto vale un jugador?',
      answer:
        'Lo que los capitanes estén dispuestos a pagar por él. No hay precios fijos ni de salida, más allá del mínimo de 1.',
    },
    {
      question: '¿Para qué sirve lo que me sobre?',
      answer: 'Para nada. Al terminar no vale nada, así que conviene gastarlo.',
    },
  ],
};

const AUCTION_PARAGRAPHS = [
  'Los jugadores no salen en un orden fijo: los saca un capitán. Los capitanes nominan por turnos y, en cada ronda de cinco jugadores, el orden se sortea de nuevo. En su turno, el capitán elige a quién se subasta y está obligado a pujar al menos 1, así que ningún jugador se queda sin equipo.',
  'Cada jugador tiene un tiempo de puja. Mientras corre, cada capitán que todavía puede llevárselo escribe su puja en secreto. Al cerrar, se ven todas las pujas y gana la más alta.',
];

const SECOND_PRICE: Step['aside'] = {
  title: 'Quien gana paga la segunda puja más una moneda',
  paragraphs: [
    'Quien gana no paga lo que escribió, sino la segunda puja más alta más una moneda, y nunca más de lo que escribió. Si escribes 30 por un jugador y la siguiente puja más alta es 18, te lo llevas por 19.',
    'Por qué así: si cada uno pagara lo que escribe, todos intentaríamos adivinar cuánto van a pujar los demás para poner solo un poco más. Ganaría quien mejor adivina, no quien más valora al jugador, y quien se pasa pagaría de más.',
    'Con la segunda puja más una moneda ese juego desaparece. Pujar alto no te hace pagar más: solo te asegura ganar si nadie lo valora tanto como tú. Pujar bajo solo te hace perder jugadores que sí querías. Lo mejor que puedes hacer es escribir exactamente lo que ese jugador vale para ti.',
    'El resultado es el mismo que en una subasta a viva voz, donde las pujas suben hasta que solo queda uno y el ganador acaba pagando poco más de lo que estaba dispuesto a pagar el segundo. Pero sin pasarnos la tarde pujando de una en una.',
  ],
};

const AUCTION_QUESTIONS: Question[] = [
  {
    question: '¿Y si nadie más puja?',
    answer: 'Se lo lleva quien lo nominó, por 1.',
  },
  {
    question: '¿Y si empatan las pujas más altas?',
    answer:
      'Gana quien tiene más dinero y paga lo que escribió. Si también empatan en eso, se sortea.',
  },
  {
    question: '¿Y si ya tengo el equipo completo?',
    answer: 'Pasas tu turno de nominar y no pujas más.',
  },
];

const auctionStep = (
  title: string,
  intro: string[],
  questions: Question[] = [],
): Step => ({
  title,
  paragraphs: [...intro, ...AUCTION_PARAGRAPHS],
  aside: SECOND_PRICE,
  questions: [...questions, ...AUCTION_QUESTIONS],
});

type Proposal = {
  key: ProposalKey;
  name: string;
  motto: string;
  recommended: boolean;
  /** Card steps; their annexes become the card's footnotes. */
  summary: { title: string; text: string; annexes?: AnnexId[] }[];
  lead: string;
  steps: Step[];
  good: string;
  caveatLabel: string;
  caveat: string;
};

const POTS = [
  'Bombo 1: Richard, Juanillo, White, Arri, Cañete.',
  'Bombo 2: Arsuaga, Cordente, Porneich, Ambeloki, Yura.',
  'Bombo 3: Pingus, Palons, Vinzont, Valantón, Roberto.',
  'Bombo 4: Guille, Armonds, Ita, Perico, Jugador Misterioso.',
];

/** In the order they are shown: the one we back first. */
const PROPOSALS: Proposal[] = [
  {
    key: 'free',
    name: 'Libre',
    motto: 'Capitán quien quiera serlo. Sin bombos.',
    recommended: true,
    summary: [
      {
        title: 'Ranking',
        text: 'El histórico, solo para ordenar a los voluntarios.',
        annexes: ['annex-ties'],
      },
      {
        title: 'Capitanes',
        text: 'Votación ciega en la web: cada confirmado dice sí o no a ser capitán sin saber qué han dicho los demás. Son capitanes los cinco voluntarios mejor situados en el ranking.',
        annexes: ['annex-volunteers'],
      },
      {
        title: 'Subasta',
        text: 'Los quince jugadores restantes, todos en la misma subasta, sin bombos.',
      },
    ],
    lead: 'Capitán quien quiera serlo, y todo lo demás, en la subasta.',
    steps: [
      {
        title: 'La votación de capitanes',
        paragraphs: [
          'Antes del torneo se abre en la web una votación con hora límite. Cada jugador confirmado responde a una sola pregunta: ¿quieres ser capitán?',
          'Hasta la hora límite puedes cambiar tu respuesta las veces que quieras. Nadie ve las respuestas de los demás hasta el cierre, así que cada uno decide sin saber qué han dicho los otros.',
        ],
        questions: [
          { question: '¿Y si no respondo?', answer: 'Cuenta como un no.' },
        ],
      },
      {
        title: 'Los capitanes',
        paragraphs: [
          'Al cerrar la votación, son capitanes los cinco voluntarios mejor situados en el ranking histórico de anillos de equipo. El ranking solo sirve para eso: ordenar a los voluntarios.',
          'Quien no se ofrece, o se ofrece y no entra entre los cinco, va a la subasta como un jugador más.',
        ],
        questions: [
          {
            question: '¿Y si se ofrecen más de cinco?',
            answer:
              'Son capitanes los cinco mejor situados en el ranking. El resto va a la subasta como uno más.',
          },
          {
            question: '¿Y si se ofrecen menos de cinco?',
            answer:
              'Se completa con los mejor situados de quienes no se ofrecieron.',
          },
          {
            question: 'Estoy arriba en el ranking y no quiero ser capitán.',
            answer:
              'No te ofreces y vas a la subasta. Solo te tocaría si faltan voluntarios.',
          },
          TIES_QUESTION,
        ],
      },
      MONEY_STEP,
      auctionStep('La subasta', [
        'Los quince jugadores restantes salen todos en la misma subasta, sin bombos. Cada equipo se lleva tres.',
      ]),
      {
        title: 'Los equipos',
        paragraphs: [
          'Al terminar, cada equipo tiene un capitán y tres jugadores que él mismo compró.',
        ],
      },
    ],
    good: 'los capitanes, salvo que falten voluntarios, son quienes quieren serlo; nadie cae en un bombo que no le corresponde y cada jugador cuesta lo que vale.',
    caveatLabel: 'Lo que hay que aceptar',
    caveat:
      'no hay un nuevo portador garantizado; si lo queréis, se puede añadir el bombo sin anillo de la Intermedia.',
  },
  {
    key: 'intermediate',
    name: 'Intermedia',
    motto: 'Un nuevo portador garantizado y el resto, libre.',
    recommended: false,
    summary: [
      { title: 'Ranking', text: 'El histórico.', annexes: ['annex-ties'] },
      { title: 'Capitanes', text: 'Los cinco del bombo 1.' },
      {
        title: 'Subasta',
        text: 'Una subasta para los cinco sin anillo, para garantizar un nuevo portador. Después, los diez restantes juntos, sin bombos.',
        annexes: ['annex-ringless'],
      },
    ],
    lead: 'Un nuevo portador garantizado y, para todo lo demás, mercado libre.',
    steps: [
      RANKING_STEP,
      {
        title: 'Los capitanes',
        paragraphs: [
          'Los cinco del bombo 1: Richard, Juanillo, White, Arri y Cañete. Son capitanes por estar arriba en el ranking.',
        ],
      },
      MONEY_STEP,
      auctionStep(
        'La subasta',
        [
          'Hay dos subastas seguidas. Primero, los cinco jugadores sin anillo de equipo (Guille, Armonds, Ita, Perico y el Jugador Misterioso), uno para cada equipo.',
          'Después, los diez jugadores restantes salen juntos, sin bombos. Cada equipo se lleva dos.',
        ],
        [
          {
            question: '¿Por qué una subasta aparte para los sin anillo?',
            answer:
              'Para que el campeón de este año tenga al menos un nuevo portador. Si alguno de ellos es de los mejores, quien lo quiera tendrá que pagarlo.',
          },
          {
            question: '¿Puedo llevarme dos sin anillo?',
            answer:
              'No en esa subasta: quien ya tiene uno no puja más en ella, y el último va al único capitán que queda, por 1.',
          },
        ],
      ),
      {
        title: 'Los equipos',
        paragraphs: [
          'Al terminar, cada equipo tiene su capitán, un jugador sin anillo y dos del mercado libre.',
        ],
      },
    ],
    good: 'el campeón de 2026 tendrá al menos un nuevo portador, y la mayor parte del equipo se elige libremente.',
    caveatLabel: 'Lo que no arregla',
    caveat: 'los capitanes siguen siendo los del bombo 1, quieran o no.',
  },
  {
    key: 'strict',
    name: 'Estricta',
    motto: 'Los bombos de siempre, pero subastados.',
    recommended: false,
    summary: [
      {
        title: 'Ranking',
        text: 'El histórico, con los bombos que ya publicó Armonds.',
        annexes: ['annex-ties'],
      },
      { title: 'Capitanes', text: 'Los cinco del bombo 1.' },
      {
        title: 'Subasta',
        text: 'Una subasta por bombo, del 2 al 4. Cada equipo se lleva un jugador de cada bombo.',
        annexes: ['annex-pots'],
      },
    ],
    lead: 'Lo que ya conocemos, con una sola diferencia: en vez de un draft, una subasta por bombo.',
    steps: [
      RANKING_STEP,
      {
        title: 'Los bombos',
        paragraphs: ['Son los que publicó Armonds:'],
        list: POTS,
      },
      {
        title: 'Los capitanes',
        paragraphs: ['Los cinco del bombo 1.'],
      },
      MONEY_STEP,
      auctionStep(
        'La subasta',
        [
          'Se subasta el bombo 2, luego el 3 y luego el 4. En cada bombo, cada capitán se lleva exactamente un jugador.',
        ],
        [
          {
            question: '¿Puedo llevarme dos del mismo bombo?',
            answer:
              'No: quien ya tiene jugador de ese bombo no puja más en él. El último de cada bombo va al único capitán que queda, por 1.',
          },
        ],
      ),
      {
        title: 'Los equipos',
        paragraphs: [
          'Al terminar, cada equipo tiene un capitán del bombo 1 y un jugador de cada uno de los bombos 2, 3 y 4.',
        ],
      },
    ],
    good: 'es el cambio más pequeño y garantiza equipos equilibrados por bombo.',
    caveatLabel: 'Lo que no arregla',
    caveat:
      'el bombo en el que cae cada uno sigue dependiendo de los anillos, no del nivel.',
  },
];

const WHY_FREE = {
  tag: 'La que defendemos',
  title: 'Por qué defendemos la libre',
  lead: 'La subasta funciona mejor cuando nada llega decidido de antemano: ni quién es capitán ni en qué bombo cae cada uno.',
  reasons: [
    'Sin bombos, nadie cae donde no le toca: un buen jugador sin anillos ya no es un regalo en el bombo 4.',
    'Estar arriba en el ranking no te condena a ser capitán: si crees que te perjudica, no te ofreces y pasas a la subasta como uno más.',
    'Capitán, en principio, solo quien quiera serlo. Solo si se ofrecen menos de cinco se completa con los mejor situados del ranking.',
    'Cada jugador cuesta lo que el grupo cree que vale, no lo que dice una etiqueta.',
    'La votación es ciega: nadie espera a ver qué hacen los demás para decidir.',
  ],
} as const;

const WHY_CAPTAIN = {
  tag: 'Para los indecisos',
  title: '¿Por qué querrías ser capitán?',
  lead: 'Si sale la libre, los capitanes saldrán de quienes se ofrezcan. Estas son las razones para dar el paso.',
  reasons: [
    {
      title: 'Tu equipo es tu obra',
      text: 'Nadie te lo reparte: lo montas tú, jugador a jugador.',
    },
    {
      title: 'Juegas con quien quieres',
      text: 'Si alguien te encaja, puja por él. Si no, deja que se lo lleve otro.',
    },
    {
      title: 'El anillo sabe mejor',
      text: 'Ganar con un equipo que has construido tú no se olvida.',
    },
    {
      title: 'Si eres de los buenos, es tu sitio',
      text: 'Ser capitán es la única forma de no acabar siendo el fichaje caro de otro.',
    },
  ],
} as const;

const POLLS_INTRO = {
  title: 'Ahora te toca a ti',
  lead: 'Dos preguntas. Votan los confirmados para la Frikiparty 2026. El voto es anónimo y puedes cambiarlo hasta el cierre. Los resultados se abren cuando haya votado la mitad más uno, y solo para quien ya ha votado. La votación no es vinculante: es orientativa, para saber qué piensa el grupo.',
} as const;

const annexById = (id: AnnexId) => ANNEXES.find((annex) => annex.id === id);

const proposalByKey = (key: string) =>
  PROPOSALS.find((proposal) => proposal.key === key);

export {
  ADVANTAGES,
  ANNEXES,
  type Annex,
  type AnnexId,
  AUCTION,
  annexById,
  DEPARTMENT,
  OPENING,
  PAGE,
  PAGE_PATH,
  POLLS_INTRO,
  PROPOSALS,
  type Proposal,
  type ProposalKey,
  proposalByKey,
  WHY_CAPTAIN,
  WHY_FREE,
};
