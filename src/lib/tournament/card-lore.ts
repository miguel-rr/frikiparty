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

const PORTRAITS_BY_RACE: Record<Race, string[]> = {
  archer: [
    '/design/portraits/marksman.webp',
    '/design/portraits/longbowman.webp',
  ],
  dwarf: ['/design/portraits/dwarf.webp', '/design/portraits/runemaster.webp'],
  elf: ['/design/portraits/elf.webp', '/design/portraits/elf-lord.webp'],
  ent: ['/design/portraits/wose.webp'],
  hobbit: ['/design/portraits/thief.webp'],
  king: ['/design/portraits/king.webp', '/design/portraits/marshal.webp'],
  ranger: ['/design/portraits/huntsman.webp'],
  rohirrim: ['/design/portraits/rider.webp'],
  warrior: ['/design/portraits/guard.webp'],
  wizard: [
    '/design/portraits/wizard.webp',
    '/design/portraits/mage-white.webp',
  ],
};

const FALLBACK_PORTRAIT = '/design/portraits/huntsman.webp';

/** Fixed portraits for the faces everyone knows; the rest hash into their race pool. */
const PLAYER_PORTRAITS: Record<string, string> = {
  Cañete: '/design/portraits/dwarf.webp',
  Cordente: '/design/portraits/thief.webp',
  Pingus: '/design/portraits/huntsman.webp',
  Richar: '/design/portraits/king.webp',
  White: '/design/portraits/wizard.webp',
  Yura: '/design/portraits/elf.webp',
};

type Lore = Partial<Pick<CardSpec, 'attack' | 'health'>> &
  Pick<CardSpec, 'ability' | 'text'>;

/** Never rotates: these lines ARE the player. */
const PINNED_LORE: Record<string, Lore> = {
  Cordente: {
    attack: 5,
    health: 5,
    ability: 'Sigilo',
    text: 'Nadie le vio venir en el torneo individual; el anillo ya estaba en su bolsillo.',
  },
  Pingus: {
    attack: 3,
    health: 9,
    ability: 'Último aliento',
    text: 'Propone otra partida a las tres de la mañana.',
  },
  Richar: {
    attack: 9,
    health: 9,
    ability: 'Grito de batalla',
    text: 'Añade un anillo a tu mano.',
  },
  Valanton: {
    ability: 'Corazón de la Comarca',
    text: 'Hasta el jugador más pequeño puede cambiar el curso de una final.',
  },
  White: {
    attack: 7,
    health: 7,
    ability: 'Grito de batalla',
    text: 'Un mago nunca llega tarde a una final.',
  },
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
];

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

const portraitFor = (name: string, race: Race) => {
  const fixed = PLAYER_PORTRAITS[name];
  if (fixed) {
    return fixed;
  }
  const pool = PORTRAITS_BY_RACE[race];
  return pool[hashName(name) % pool.length] ?? FALLBACK_PORTRAIT;
};

/**
 * Deterministic card for one player: fixed portrait/stats/rarity, pinned
 * lore if they have it, race-generic text otherwise (no randomness).
 * Rarity counts both ring kinds; the card shows them separately.
 */
const cardSpecFor = (
  name: string,
  rings: number,
  individualRings = 0,
): CardSpec => {
  const race = raceForPlayer(name);
  const pinned = PINNED_LORE[name];
  const hash = hashName(name);
  return {
    name,
    rings,
    individualRings,
    attack: pinned?.attack ?? 3 + (hash % 7),
    health: pinned?.health ?? 3 + (Math.floor(hash / 7) % 7),
    rarity: rarityFor(rings + individualRings),
    ability: pinned?.ability,
    text: pinned?.text ?? GENERIC_TEXT[race],
    portrait: portraitFor(name, race),
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
 * Deals cards for a group of players: pinned players keep their lines,
 * everyone else draws ability+text from a freshly shuffled deck, without
 * repeats within the group. Different on every render — call it once per
 * page section so a page never repeats a pair.
 */
const dealCardSpecs = (
  players: { name: string; rings: number; individualRings?: number }[],
): CardSpec[] => {
  const deck = shuffled(LORE_DECK);
  return players.map((player) => {
    const base = cardSpecFor(player.name, player.rings, player.individualRings);
    if (PINNED_LORE[player.name]) {
      return base;
    }
    const pair = deck.pop();
    return pair ? { ...base, ability: pair.ability, text: pair.text } : base;
  });
};

export { cardSpecFor, dealCardSpecs };
