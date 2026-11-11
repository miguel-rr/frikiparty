/**
 * Placeholder copy for the team-formation mockup. The real text comes in
 * the content pass; this is only enough to judge the layouts.
 */

const EDICT = [
  'Armonds y Palons, presidente y secretario del Departamento de Sistemas de Conformación de Equipos y Competición, se enorgullecen en presentar ante el Concilio la propuesta para la formación de equipos de la Frikiparty 2026.',
  'Durante años los bombos nos dieron equipos, y también quejas. Este año proponemos cambiar el corazón del sistema: que cada capitán construya su equipo con su propio criterio y su propio dinero. Una subasta.',
] as const;

type Advantage = { before: string; after: string; title: string; icon: string };

const ADVANTAGES: Advantage[] = [
  {
    icon: '⚖',
    title: 'Cada jugador vale lo que el capitán cree',
    before:
      'Guille, para muchos el mejor, cayó en el bombo 4 por no tener anillos.',
    after:
      'En la subasta nadie cae en ningún sitio: cuesta lo que los capitanes estén dispuestos a pagar.',
  },
  {
    icon: '🗳',
    title: 'Adiós a votar para quedar abajo',
    before:
      'Votación secreta, y aun así hubo quien votó para hundirse en el ranking.',
    after: 'El ranking pesa mucho menos: lo que decide es la puja.',
  },
  {
    icon: '🎯',
    title: 'El capitán elige, no el azar',
    before: 'El orden del draft y la suerte del sorteo decidían medio equipo.',
    after: 'Cada capitán decide en quién gastar y en quién no.',
  },
  {
    icon: '🔥',
    title: 'La mejor noche de la Frikiparty',
    before: 'Un trámite antes de jugar.',
    after:
      'Sobres cerrados, pujas, piques y faroles: el espectáculo empieza antes del primer partido.',
  },
];

type ProposalKey = 'strict' | 'intermediate' | 'free';

type Proposal = {
  key: ProposalKey;
  name: string;
  motto: string;
  steps: { title: string; text: string }[];
  annexes: { id: string; label: string }[];
};

const PROPOSALS: Proposal[] = [
  {
    key: 'strict',
    name: 'Estricta',
    motto: 'Los bombos de siempre, pero subastados.',
    steps: [
      {
        title: 'Ranking',
        text: 'El histórico, con los bombos que publicó Armonds.',
      },
      { title: 'Capitanes', text: 'Los cinco del bombo 1.' },
      {
        title: 'Subasta',
        text: 'Una subasta por bombo: cada equipo acaba con un jugador de cada uno.',
      },
    ],
    annexes: [{ id: 'annex-ties', label: 'Empates' }],
  },
  {
    key: 'intermediate',
    name: 'Intermedia',
    motto: 'Un nuevo portador garantizado, el resto libre.',
    steps: [
      { title: 'Ranking', text: 'El histórico.' },
      { title: 'Capitanes', text: 'Los cinco del bombo 1.' },
      {
        title: 'Subasta',
        text: 'Primero los cinco sin anillo, uno por equipo. Luego los diez restantes, todos en la misma subasta.',
      },
    ],
    annexes: [
      { id: 'annex-ties', label: 'Empates' },
      { id: 'annex-ringless', label: 'Bombo sin anillo' },
    ],
  },
  {
    key: 'free',
    name: 'Libre',
    motto: 'Capitán quien quiera serlo.',
    steps: [
      {
        title: 'Ranking',
        text: 'El histórico, solo para ordenar a los voluntarios.',
      },
      {
        title: 'Capitanes',
        text: 'Votación ciega en la web: sí o no, sin saber qué dicen los demás. Los cinco voluntarios mejor situados.',
      },
      {
        title: 'Subasta',
        text: 'El resto de jugadores, en una subasta libre.',
      },
    ],
    annexes: [
      { id: 'annex-ties', label: 'Empates' },
      { id: 'annex-volunteers', label: 'Pocos o muchos voluntarios' },
    ],
  },
];

const CAPTAIN_REASONS = [
  {
    title: 'Tu equipo, tu obra',
    text: 'Nadie te lo reparte: lo compras jugador a jugador.',
  },
  {
    title: 'Juegas con quien quieres',
    text: 'Si alguien te encaja, puja por él.',
  },
  {
    title: 'El anillo sabe mejor',
    text: 'Ganar con un equipo que has montado tú no se olvida.',
  },
];

const ANNEXES = [
  {
    id: 'annex-auction',
    title: 'Cómo es la subasta',
    scope: null,
    text: 'Sobre cerrado: cada capitán escribe en secreto lo máximo que paga. Gana el más alto y paga la segunda puja más uno. Empate: gana quien tiene más dinero; si también empatan, sorteo.',
  },
  {
    id: 'annex-ties',
    title: 'Empates en el ranking',
    scope: null,
    text: 'Con los mismos anillos de equipo desempatan los individuales; si siguen igual, sorteo entre los empatados.',
  },
  {
    id: 'annex-ringless',
    title: 'Bombo sin anillo',
    scope: 'intermediate' as ProposalKey,
    text: 'Los cinco jugadores sin anillo de equipo se subastan primero, uno por equipo, para que este año haya al menos un nuevo portador.',
  },
  {
    id: 'annex-volunteers',
    title: 'Pocos o muchos voluntarios',
    scope: 'free' as ProposalKey,
    text: 'Si se ofrecen más de cinco, son capitanes los cinco mejor situados en el ranking. Si se ofrecen menos, se completa con los mejor situados que no se ofrecieron.',
  },
];

export {
  ADVANTAGES,
  ANNEXES,
  CAPTAIN_REASONS,
  EDICT,
  PROPOSALS,
  type Proposal,
  type ProposalKey,
};
