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
    text: 'Son los cinco jugadores sin anillo de equipo: Guille, Armonds, Ita, Perico y el Jugador Misterioso. Se subastan primero, uno por equipo, para que el campeón de este año tenga al menos un nuevo portador. Si alguno de ellos es de los mejores, quien lo quiera tendrá que pagarlo.',
  },
  {
    id: 'annex-pots',
    title: 'Subasta por bombos',
    scope: 'strict',
    text: 'Cada bombo se subasta por separado, del 2 al 4. Un capitán que ya tiene jugador de ese bombo no puja más en él. El último jugador de cada bombo va al único capitán que queda, por el mínimo.',
  },
];

type Step = {
  title: string;
  text: string;
  list?: string[];
  annexes?: AnnexId[];
};

type Proposal = {
  key: ProposalKey;
  name: string;
  motto: string;
  recommended: boolean;
  summary: { title: string; text: string }[];
  annexes: AnnexId[];
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
      },
      {
        title: 'Capitanes',
        text: 'Votación ciega en la web: cada confirmado dice sí o no a ser capitán sin saber qué han dicho los demás. Son capitanes los cinco voluntarios mejor situados en el ranking.',
      },
      {
        title: 'Subasta',
        text: 'Los quince jugadores restantes, todos en la misma subasta, sin bombos.',
      },
    ],
    annexes: ['annex-ties', 'annex-volunteers'],
    lead: 'Capitán quien quiera serlo, y todo lo demás, en la subasta.',
    steps: [
      {
        title: 'La votación de capitanes',
        text: 'Se abre en la web antes del torneo. Cada confirmado responde sí o no a ser capitán. Nadie ve las respuestas de los demás hasta el cierre.',
      },
      {
        title: 'Los capitanes',
        text: 'Son capitanes los cinco voluntarios mejor situados en el ranking histórico.',
        annexes: ['annex-ties', 'annex-volunteers'],
      },
      {
        title: 'El dinero',
        text: 'Cada capitán empieza con 100 monedas.',
        annexes: ['annex-money'],
      },
      {
        title: 'La subasta',
        text: 'Los quince jugadores restantes salen todos en la misma subasta, sin bombos. Cada equipo se lleva tres.',
        annexes: ['annex-bidding', 'annex-nomination'],
      },
      {
        title: 'Los equipos',
        text: 'Al terminar, cada equipo tiene un capitán que eligió serlo y tres jugadores que él mismo compró.',
      },
    ],
    good: 'nadie es capitán a la fuerza, nadie cae en un bombo que no le corresponde y cada jugador cuesta lo que vale.',
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
      { title: 'Ranking', text: 'El histórico.' },
      { title: 'Capitanes', text: 'Los cinco del bombo 1.' },
      {
        title: 'Subasta',
        text: 'Primero los cinco sin anillo de equipo, uno para cada equipo, para garantizar un nuevo portador. Después, los diez restantes juntos, sin bombos.',
      },
    ],
    annexes: ['annex-ties', 'annex-ringless'],
    lead: 'Un nuevo portador garantizado y, para todo lo demás, mercado libre.',
    steps: [
      {
        title: 'El ranking',
        text: 'Se usa el ranking histórico de anillos de equipo.',
        annexes: ['annex-ties'],
      },
      {
        title: 'Los capitanes',
        text: 'Los cinco del bombo 1: Richard, Juanillo, White, Arri y Cañete. Cada uno empieza con 100 monedas.',
        annexes: ['annex-money'],
      },
      {
        title: 'Primera subasta: los sin anillo',
        text: 'Se subastan Guille, Armonds, Ita, Perico y el Jugador Misterioso, uno para cada equipo.',
        annexes: ['annex-ringless', 'annex-bidding'],
      },
      {
        title: 'Segunda subasta: el resto',
        text: 'Los diez jugadores restantes salen juntos, sin bombos. Cada equipo se lleva dos.',
        annexes: ['annex-nomination'],
      },
      {
        title: 'Los equipos',
        text: 'Al terminar, cada equipo tiene su capitán, un jugador sin anillo y dos del mercado libre.',
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
      },
      { title: 'Capitanes', text: 'Los cinco del bombo 1.' },
      {
        title: 'Subasta',
        text: 'Una subasta por bombo, del 2 al 4. Cada equipo se lleva un jugador de cada bombo.',
      },
    ],
    annexes: ['annex-ties', 'annex-pots'],
    lead: 'Lo que ya conocemos, con una sola diferencia: en vez de un draft, una subasta por bombo.',
    steps: [
      {
        title: 'El ranking',
        text: 'Se usa el ranking histórico de anillos de equipo.',
        annexes: ['annex-ties'],
      },
      { title: 'Los bombos', text: 'Son los que publicó Armonds:', list: POTS },
      {
        title: 'Los capitanes',
        text: 'Los cinco del bombo 1. Cada uno empieza con 100 monedas.',
        annexes: ['annex-money'],
      },
      {
        title: 'La subasta',
        text: 'Se subasta el bombo 2, luego el 3 y luego el 4. En cada bombo, cada capitán se lleva exactamente un jugador.',
        annexes: ['annex-pots', 'annex-bidding', 'annex-nomination'],
      },
      {
        title: 'Los equipos',
        text: 'Al terminar, cada equipo tiene un capitán del bombo 1 y un jugador de cada uno de los bombos 2, 3 y 4.',
      },
    ],
    good: 'es el cambio más pequeño y garantiza equipos equilibrados por bombo.',
    caveatLabel: 'Lo que no arregla',
    caveat:
      'el bombo en el que cae cada uno sigue dependiendo de los anillos, no del nivel.',
  },
];

const WHY_FREE = {
  tag: 'Por qué la libre',
  title: '¿Por qué querrías ser capitán?',
  lead: 'En el departamento defendemos la propuesta libre. La subasta brilla más cuando nadie llega con el papel asignado: capitán es quien quiere serlo.',
  captain: [
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
  everyone: [
    'Nadie es capitán a la fuerza: quien no quiere esa responsabilidad, no la tiene.',
    'Sin bombos, nadie cae donde no le toca: un buen jugador sin anillos ya no es un regalo en el bombo 4.',
    'La votación es ciega: nadie espera a ver qué hacen los demás para decidir.',
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
  WHY_FREE,
};
