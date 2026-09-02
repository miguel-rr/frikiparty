import { type Race, raceForPlayer } from '@/components/theme/emblems';
import type { CardSpec } from '@/components/tournament/hearth-card';

/**
 * Card lore. Three layers:
 *
 * - Portrait and stats are FIXED per player (curated or name-hash), so a
 *   player always looks the same; one day each user will pick their own.
 * - A few emblematic players have PINNED ability+text that never rotates.
 * - Everyone else draws from LORE_DECK: ~60 ability+flavour pairs built
 *   from Age of the Ring spellbook powers (nine factions' books) and
 *   frikiparty lore, shuffled on every render and dealt without repeats.
 *
 * Real ring counts always come from the caller — lore never invents
 * trophies.
 */

/** Every available portrait, keyed by file basename, with a Spanish label for pickers. */
const PORTRAIT_LABELS: Record<string, string> = {
  dwarf: 'Enano',
  'elf-lord': 'Señor élfico',
  elf: 'Elfo',
  guard: 'Guardia real',
  huntsman: 'Montaraz',
  king: 'Rey',
  longbowman: 'Arquero',
  'mage-white': 'Mago blanco',
  marksman: 'Tirador élfico',
  marshal: 'Mariscal',
  rider: 'Jinete',
  runemaster: 'Maestro rúnico',
  thief: 'Hobbit',
  wizard: 'Mago',
  wose: 'Ente',
};

const portraitPath = (key: string) => `/design/portraits/${key}.webp`;

const PORTRAITS_BY_RACE: Record<Race, string[]> = {
  archer: ['marksman', 'longbowman'],
  dwarf: ['dwarf', 'runemaster'],
  elf: ['elf', 'elf-lord'],
  ent: ['wose'],
  hobbit: ['thief'],
  king: ['king', 'marshal'],
  ranger: ['huntsman'],
  rohirrim: ['rider'],
  warrior: ['guard'],
  wizard: ['wizard', 'mage-white'],
};

const FALLBACK_PORTRAIT_KEY = 'huntsman';

/** Curated defaults for the faces everyone knows; a DB choice overrides, the rest hash into their race pool. */
const PLAYER_PORTRAITS: Record<string, string> = {
  Cañete: 'dwarf',
  Cordente: 'thief',
  Pingus: 'huntsman',
  Richar: 'king',
  White: 'wizard',
  Yura: 'elf',
};

/** Curated card stats for emblematic players; abilities live in the DB. */
const PINNED_STATS: Record<string, Pick<CardSpec, 'attack' | 'health'>> = {
  Richar: { attack: 9, health: 9 },
};

type LorePair = { ability: string; text: string };

/**
 * The deck. Abilities are AotR spellbook powers (Gondor, Mordor, Rohan,
 * Erebor, Rivendel, Isengard, Lothlórien, Montañas Nubladas, Dol Guldur)
 * or card-game keywords; texts mix game flavour with frikiparty lore.
 */
const LORE_DECK: LorePair[] = [
  // Gondor
  {
    ability: 'Cuerno del Capitán',
    text: 'Toca a rebato y toda la mesa juega un punto por encima.',
  },
  {
    ability: 'Manos de Curandero',
    text: 'Repone la moral del equipo tras una pantalla perdida.',
  },
  {
    ability: 'Jardín de Ithilien',
    text: 'Monta la emboscada donde nadie la espera. Y no falla.',
  },
  {
    ability: 'Ingeniería Númenóreana',
    text: 'Su macro es un trebuchet: tarda en montarse, imposible de parar.',
  },
  {
    ability: 'Vientos del Oeste',
    text: 'Disipa la mala racha y acelera a todo el equipo.',
  },
  {
    ability: 'Los Mensajeros de Manwë',
    text: 'Cuando todo está perdido, llegan las Águilas. Suele traerlas.',
  },
  {
    ability: 'El Retorno del Rey',
    text: 'Desaparece unas ediciones y vuelve a reclamar lo suyo.',
  },
  {
    ability: 'Tierras Protegidas',
    text: 'Con su torre en tu flanco, nadie entra en la base.',
  },
  {
    ability: 'Lealtad Jurada',
    text: 'Recluta aliados a mitad de precio. Nadie sabe cómo.',
  },
  // Mordor
  {
    ability: 'Ojo de Sauron',
    text: 'Ve todos los movimientos del rival. Todos.',
  },
  {
    ability: 'Oscuridad',
    text: 'Cuando entra en partida, se apagan las almenaras del rival.',
  },
  { ability: 'Grietas del Destino', text: 'Donde pisa, el mapa se agrieta.' },
  {
    ability: 'Llamad a la Horda',
    text: 'Cada edición trae más gente a la mesa.',
  },
  {
    ability: '¡Espectros Alados!',
    text: 'Cuando chilla, hasta los veteranos sueltan el ratón.',
  },
  {
    ability: 'Fuegos del Orodruin',
    text: 'Su ofensiva final arrasa la partida y la sobremesa.',
  },
  {
    ability: 'Terror de Cirith Ungol',
    text: 'Guarda algo en la torre: nadie pasa sin pagarlo.',
  },
  {
    ability: 'Esclavos de Nurn',
    text: 'Su economía no descansa. Sus rivales tampoco.',
  },
  // Rohan
  {
    ability: 'Draft',
    text: 'Convierte aldeanos en lanceros y novatos en finalistas.',
  },
  {
    ability: 'Explorador Solitario',
    text: 'Siempre hay un jinete suyo vigilando tu base.',
  },
  {
    ability: 'Reunid a los Rohirrim',
    text: 'Un cuerno y aparecen todos: la partida de las doce se juega.',
  },
  {
    ability: 'El Juramento de Eorl',
    text: 'Cuando un aliado pide ayuda, acude con todo el ejército.',
  },
  { ability: 'Cosecha Abundante', text: 'Saca recursos hasta del peor mapa.' },
  {
    ability: 'Antes del Alba',
    text: 'Ataca antes de que el rival haya tomado el café.',
  },
  {
    ability: 'La Última Marcha',
    text: 'Tarda en arrancar. Después no hay quien lo pare.',
  },
  {
    ability: 'Cuervo de la Tormenta',
    text: 'Siempre llega con malas noticias… para el rival.',
  },
  {
    ability: 'El Jabalí de Everholt',
    text: 'Embiste una vez por partida. Con una basta.',
  },
  // Erebor
  {
    ability: 'Día de Durin',
    text: 'Espera a la última luz del año para enseñar sus mejores cartas.',
  },
  {
    ability: 'Socavar',
    text: 'Mina la partida desde abajo; cuando lo notas, el suelo ya cede.',
  },
  {
    ability: 'Puertas de Erebor',
    text: 'Aguanta el asedio toda la fase de grupos y abre las puertas en la final.',
  },
  {
    ability: '¡Sacad las cabras!',
    text: 'Su apertura no está en ningún manual. Por eso funciona.',
  },
  {
    ability: 'Cuervos de Erebor',
    text: 'Se entera de los resultados antes que la organización.',
  },
  {
    ability: 'Armados y Mugrientos',
    text: 'Sin dormir, sin ducha, sin perder.',
  },
  {
    ability: 'Excavación Profunda',
    text: 'Siempre encuentra una veta más de recursos.',
  },
  {
    ability: 'La Horda de Thrór',
    text: 'Cuenta sus anillos cada noche. Dos veces.',
  },
  {
    ability: 'Derrumbe',
    text: 'Cierra el paso y la remontada con el mismo golpe.',
  },
  // Rivendel
  {
    ability: 'Sabiduría de los Eldar',
    text: 'Ha visto caer todas las estrategias. Dos eras de metajuego.',
  },
  {
    ability: 'Muchos Encuentros',
    text: 'Toda gran alianza empieza en su mesa.',
  },
  { ability: 'Los Hijos de Elrond', text: 'En pareja vale por un ejército.' },
  {
    ability: 'La Ira del Bruinen',
    text: 'Cuando pierde la paciencia, se lleva la partida por delante como un río.',
  },
  {
    ability: 'El Peregrino Gris',
    text: 'Aparece sin avisar, suelta un consejo que gana partidas y desaparece.',
  },
  {
    ability: 'Salón del Fuego',
    text: 'Las mejores historias del torneo se cuentan a su lado.',
  },
  {
    ability: '¡Tangado Haid!',
    text: 'Mantiene la línea cuando todo se derrumba.',
  },
  // Isengard
  {
    ability: 'Visión del Palantír',
    text: 'Vio su anillo en la piedra mucho antes de ganarlo. Nadie le creyó.',
  },
  {
    ability: 'Canto de Guerra',
    text: 'Su grito de victoria se oye desde la otra sede.',
  },
  {
    ability: 'Fuegos de la Industria',
    text: 'Producción constante: tropas, partidas y leña para la estufa.',
  },
  { ability: 'Lluvia Helada', text: 'Enfría el mejor momento del rival.' },
  {
    ability: 'Tierra Corrupta',
    text: 'Donde acampa su ejército no vuelve a crecer la hierba.',
  },
  {
    ability: 'Crebain',
    text: 'Sus pájaros ya saben qué vas a hacer este turno.',
  },
  {
    ability: 'Devastación',
    text: 'Tala el bosque y la ventaja del rival con el mismo gesto.',
  },
  // Lothlórien
  {
    ability: 'No Puedes Continuar',
    text: 'Frena en seco al favorito cuando cruza su frontera.',
  },
  {
    ability: '¡Leithio i philinn!',
    text: 'Una orden, cien flechas, ninguna pregunta.',
  },
  {
    ability: 'Nieblas de Lothlórien',
    text: 'Nadie recuerda bien qué pasó en su partida. Solo que perdió.',
  },
  {
    ability: 'El Anillo de Adamant',
    text: 'Protege a su equipo hasta el último asalto.',
  },
  { ability: 'Un Gran Mago', text: 'Aparenta bastante menos de lo que gana.' },
  {
    ability: 'Águilas de las Montañas',
    text: 'Rescata partidas que ya se daban por caídas.',
  },
  // Montañas Nubladas
  {
    ability: 'Ya Vienen',
    text: 'Tambores, tambores en las profundidades. Le toca elegir en el draft.',
  },
  {
    ability: 'Invierno Blanco',
    text: 'Congela el ritmo de la partida hasta que le conviene.',
  },
  { ability: 'El Azote de Durin', text: 'Guarda un balrog para las finales.' },
  {
    ability: 'Carroñero',
    text: 'Convierte cada derrota ajena en recursos propios.',
  },
  { ability: 'El Vigilante del Agua', text: 'No toques su orilla del mapa.' },
  // Dol Guldur
  {
    ability: 'Carnicería',
    text: 'Cuando huele sangre en el bracket, no hay piedad.',
  },
  {
    ability: 'No Sigáis las Luces',
    text: 'Te lleva a su terreno pantanoso y allí te hunde.',
  },
  {
    ability: 'Bosque del Miedo',
    text: 'Jugar su mapa favorito es cruzar el Bosque Negro de noche.',
  },
  {
    ability: 'Histeria Oscura',
    text: 'Contagia el pánico al equipo rival con una sola jugada.',
  },
  { ability: 'El Don del Nigromante', text: 'Resucita partidas muertas.' },
  {
    ability: 'Marchitar',
    text: 'Seca la economía del rival sin que se dé cuenta.',
  },
  // Frikiparty
  {
    ability: 'Provocar',
    text: 'Los rivales deben atacarle. Suelen arrepentirse.',
  },
  {
    ability: 'Emboscada',
    text: 'Cada edición apunta más fino. Cualquier año de estos, diana.',
  },
  {
    ability: 'Acecho',
    text: 'Deja que el rival crea que va ganando. Es parte del plan.',
  },
  { ability: 'Explorador', text: 'Conoce todos los mapas del torneo.' },
  {
    ability: 'Carga',
    text: 'Al alba del tercer día, entra al galope. Da igual el marcador.',
  },
  {
    ability: 'Estandarte',
    text: 'Juega cada partida como si defendiera Minas Tirith.',
  },
  {
    ability: 'Reclutamiento',
    text: 'Tu primera derrota corre por cuenta de la casa.',
  },
  {
    ability: 'Cuerno del Bosque Bajo',
    text: 'Cuando suena su cuerno, hasta los eliminados vuelven a la mesa.',
  },
  {
    ability: 'Danza de Guerra',
    text: 'Cuando el rival consigue localizar sus tropas, la partida ya ha terminado.',
  },
  {
    ability: 'Volea',
    text: 'Marca a su presa al empezar la partida; el resto es papeleo.',
  },
  // Leyendas del concilio (antes fijadas a jugadores concretos)
  {
    ability: 'Sigilo',
    text: 'Nadie le vio venir en el torneo individual; el anillo ya estaba en su bolsillo.',
  },
  {
    ability: 'Último aliento',
    text: 'Propone otra partida a las tres de la mañana.',
  },
  {
    ability: 'Corazón de la Comarca',
    text: 'Hasta el jugador más pequeño puede cambiar el curso de una final.',
  },
  {
    ability: 'Puntual como un mago',
    text: 'Un mago nunca llega tarde a una final.',
  },
];

const LORE_BY_ABILITY = new Map(LORE_DECK.map((pair) => [pair.ability, pair]));

const GENERIC_TEXT: Record<Race, string> = {
  archer: 'Alcance: golpea desde la última fila de la mesa.',
  dwarf: 'Coraza: nunca abandona una partida a medias.',
  elf: 'Elusivo: imposible de leer hasta el último turno.',
  ent: 'Raíces: cuanto más dura la partida, más fuerte se hace.',
  hobbit: 'Sigilo: nadie lo ve venir hasta que es tarde.',
  king: 'Mando: sus compañeros de equipo ganan +1 de moral.',
  ranger: 'Explorador: conoce todos los mapas del torneo.',
  rohirrim: 'Carga: empieza cada partida al galope.',
  warrior: 'Firmeza: no retrocede ni en la peor pantalla.',
  wizard: 'Conjuro: convierte una derrota en experiencia.',
};

const hashName = (name: string) => {
  let hash = 0;
  for (const char of name) {
    hash = (hash * 31 + char.charCodeAt(0)) % 9973;
  }
  return hash;
};

const rarityFor = (totalRings: number): CardSpec['rarity'] => {
  if (totalRings >= 6) {
    return 'legendary';
  }
  if (totalRings >= 4) {
    return 'epic';
  }
  if (totalRings >= 2) {
    return 'rare';
  }
  return 'common';
};

/** Chosen (DB) portrait wins, then the curated map, then the race pool by name hash. */
const portraitFor = (name: string, race: Race, chosen?: string | null) => {
  if (chosen && PORTRAIT_LABELS[chosen]) {
    return portraitPath(chosen);
  }
  const fixed = PLAYER_PORTRAITS[name];
  if (fixed) {
    return portraitPath(fixed);
  }
  const pool = PORTRAITS_BY_RACE[race];
  return portraitPath(
    pool[hashName(name) % pool.length] ?? FALLBACK_PORTRAIT_KEY,
  );
};

/** A player's card inputs: real ring counts plus their stored card choices. */
type CardIdentity = {
  name: string;
  rings: number;
  individualRings?: number;
  /** Portrait key from PORTRAIT_LABELS, or null/undefined for the default. */
  cardPortrait?: string | null;
  /** Ability of a LORE_DECK pair to fix, or null/undefined for a random deal. */
  cardLore?: string | null;
  cardAbility?: string | null;
  cardAbilityText?: string | null;
};

/**
 * Deterministic card for one player: portrait/stats/rarity never change;
 * the lore comes from the pin (Richar), the player's stored choice, or the
 * race-generic fallback. No randomness — use dealCardSpecs for deck deals.
 * Rarity counts both ring kinds; the card shows them separately.
 */
const cardSpecFor = (identity: CardIdentity): CardSpec => {
  const { name, rings, individualRings = 0 } = identity;
  const race = raceForPlayer(name);
  const pinned = PINNED_STATS[name];
  const chosen = identity.cardLore
    ? LORE_BY_ABILITY.get(identity.cardLore)
    : undefined;
  const hash = hashName(name);
  return {
    name,
    rings,
    individualRings,
    attack: pinned?.attack ?? 3 + (hash % 7),
    health: pinned?.health ?? 3 + (Math.floor(hash / 7) % 7),
    rarity: rarityFor(rings + individualRings),
    // A curated personal ability (stored in the DB) beats everything else.
    ability: identity.cardAbility ?? chosen?.ability,
    text: identity.cardAbilityText ?? chosen?.text ?? GENERIC_TEXT[race],
    portrait: portraitFor(name, race, identity.cardPortrait),
  };
};

const shuffled = <T>(items: T[]): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = copy[i] as T;
    copy[i] = copy[j] as T;
    copy[j] = a;
  }
  return copy;
};

/**
 * Deals cards for a group of players: pinned (Richar) and stored choices
 * keep their lines, everyone else draws ability+text from a freshly
 * shuffled deck, without repeats within the group. Different on every
 * render — call it once per page section so a page never repeats a pair.
 */
const dealCardSpecs = (players: CardIdentity[]): CardSpec[] => {
  const fixedAbilities = new Set(
    players
      .map((player) => player.cardLore)
      .filter((ability): ability is string => Boolean(ability)),
  );
  const deck = shuffled(
    LORE_DECK.filter((pair) => !fixedAbilities.has(pair.ability)),
  );
  return players.map((player) => {
    const base = cardSpecFor(player);
    if (player.cardAbility || player.cardLore) {
      return base;
    }
    const pair = deck.pop();
    return pair ? { ...base, ability: pair.ability, text: pair.text } : base;
  });
};

/** Options for the profile pickers, alphabetically by visible label. */
const LORE_OPTIONS = [...LORE_DECK].sort((a, b) =>
  a.ability.localeCompare(b.ability, 'es'),
);

const PORTRAIT_OPTIONS = Object.entries(PORTRAIT_LABELS)
  .map(([key, label]) => ({ key, label }))
  .sort((a, b) => a.label.localeCompare(b.label, 'es'));

export {
  type CardIdentity,
  cardSpecFor,
  dealCardSpecs,
  LORE_OPTIONS,
  PORTRAIT_OPTIONS,
  portraitPath,
};
