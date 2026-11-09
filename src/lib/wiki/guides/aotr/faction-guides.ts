import type { FactionId } from '@/lib/tournament/factions';
import type { FactionGuide } from '@/lib/wiki/guides/types';

/**
 * "Cómo jugarla" for the eleven core factions of Age of the Ring 10.0.
 * Buildings, units, heroes and powers are named as the 10.0 game files
 * name them (scripts/wiki-data/aotr-10/*.json). The plans are ours, drawn
 * from those files and from how each faction played in 9.x: a first draft
 * to be checked in real matches.
 */
const AOTR_FACTION_GUIDES: Record<FactionId, FactionGuide> = {
  gondor: {
    version: '10.0.0',
    difficulty: 'easy',
    style:
      'Un poco de todo y muy defensiva: aguanta, mejora sus tropas y gana la partida larga.',
    opening: [
      'Graneros separados con los dos constructores, y un tercer constructor desde la Fortaleza.',
      'Barracones: Lanceros de Linhir para frenar caballería y Hombres del Clan Lamedon para el cuerpo a cuerpo.',
      'Campo de Tiro con Arqueros del Valle Raíz Negra detrás de la infantería.',
      'Herrería y subir los Barracones a nivel 2 para pasar a los Soldados y Lanceros de Minas Tirith.',
    ],
    keyUnits: [
      'Soldados y Lanceros de Minas Tirith: la línea de batalla a partir del nivel 2.',
      'Arqueros de Minas Tirith y, con Faramir, los Montaraces de Ithilien.',
      'Caballeros de Minas Tirith para rematar arqueros y perseguir.',
      'Trabuco para tirar murallas desde lejos.',
    ],
    heroes: [
      'Beregond o Forlong pronto. Forlong además desbloquea a los Hacheros de Lossarnach.',
      'Faramir a media partida: héroe a distancia y llave de los Montaraces.',
      'Gandalf cuando la economía ya está montada: cambia cualquier combate.',
    ],
    powers: [
      'Nivel 1: Curadores Expertos, que cura y repone bajas, o Cuerno del Capitán.',
      'Nivel 3: El Juramento de Eorl trae a los Rohirrim, el refuerzo más fácil de usar.',
      'Final: El Retorno del Rey.',
    ],
    howToWin: [
      'Mezclar picas, espadas y arcos en cada ejército: Gondor no tiene puntos débiles si va equilibrado.',
      'Mejorar armas y armaduras pronto: las tropas de Minas Tirith mejoradas aguantan a casi todo.',
      'Defender bien la base para que el rival se desgaste atacándola.',
    ],
    howToLose: [
      'Quedarse con las tropas de los feudos, que son frágiles, contra facciones que presionan pronto.',
      'Encerrarse tanto en la base que el rival se queda con todo el mapa.',
    ],
    against: [
      'Presiona pronto, antes de que tenga Minas Tirith mejorado.',
      'Ataca sus graneros y no le dejes hacer partida larga.',
    ],
  },
  rohan: {
    version: '10.0.0',
    difficulty: 'medium',
    style:
      'Caballería: golpear donde el rival no está, cargar y salir antes de quedarse atrapado.',
    opening: [
      'Granjas separadas: además de dinero, reclutan Campesinos y Guardias Lanceros.',
      'Establos pronto: los Jinetes de la Marca acosan constructores, edificios de economía y arqueros.',
      'Campo de Tiro con Guardias Arqueros para defender.',
      'Subir los Establos a nivel 2 cuanto antes: ahí está el ejército de verdad.',
    ],
    keyUnits: [
      'Guerreros Rohirrim y Arqueros Rohirrim, la base del ejército.',
      'Jinetes del Río Nevado y, a nivel 3, la Guardia Real Montada.',
      'Guardias Lanceros y Guardia Real de Edoras para sujetar la línea.',
      'Ariete y Onagro del Taller para el asedio.',
    ],
    heroes: [
      'Éowyn o Elfhelm al principio, para ir con la caballería.',
      'Erkenbrand, que desbloquea a los Guerreros del Folde Oeste.',
      'Théoden y Éomer cuando ya hay ejército: potencian las cargas.',
    ],
    powers: [
      'Nivel 1: Leva da tropas gratis al principio.',
      'Nivel 3: Cosecha Abundante si vas a partida larga, o el Jabalí de Everholt.',
      'Final: La Última Marcha.',
    ],
    howToWin: [
      'Cargar contra arqueros y espadas, nunca de frente contra picas.',
      'Expandirse rápido: su economía y sus Granjas premian coger mapa.',
      'Usar la movilidad para ayudar a los aliados en un 4 contra 4.',
    ],
    howToLose: [
      'Dejar la caballería enganchada en el cuerpo a cuerpo.',
      'Atacar bases con murallas: su asedio es modesto.',
    ],
    against: [
      'Picas, picas y más picas, y no dejes los arqueros sin protección.',
      'Muros y torres frenan mucho a Rohan.',
    ],
  },
  rivendell: {
    version: '10.0.0',
    difficulty: 'hard',
    style:
      'Pocas tropas muy buenas y héroes de los más fuertes: calidad por encima de cantidad.',
    opening: [
      'Huertos de Rivendel separados y un tercer constructor.',
      'Campamento de las Tierras de Bree: Fronteros, Arqueros Tuk y Guardias del Pueblo de Bree, baratos para aguantar el principio.',
      'Asamblea Dúnedain para los Montaraces del Norte.',
      'Forja de Rivendel y Dormitorio de Rivendel en cuanto haya dinero para la tropa élfica.',
    ],
    keyUnits: [
      'Montaraces del Norte: arqueros muy buenos y asequibles.',
      'Macari (espadas) y Ehtyari (picas), la infantería élfica.',
      'Quingar a nivel 2 y Roquentari, la caballería élfica, a nivel 3.',
      'Jinetes Dúnedain como caballería intermedia.',
    ],
    heroes: [
      'Arwen o Elladan y Elrohir pronto: baratos para lo que hacen.',
      'Aragorn a media partida.',
      'Glorfindel y el Señor Elrond al final: deciden partidas, pero son carísimos.',
    ],
    powers: [
      'Nivel 2: Los Hijos de Elrond.',
      'Nivel 3: Bendición de Ulmo o Salón del Fuego.',
      'Final: Ira de los Bruinen.',
    ],
    howToWin: [
      'Cuidar cada batallón: retirarlo a curar antes de perderlo.',
      'Mejorar en la Forja: su tropa mejorada es de las mejores del juego.',
      'Aguantar el principio con tropa barata y llegar a la élite.',
    ],
    howToLose: [
      'Cambiar batallones caros por orcos baratos.',
      'Gastarse todo en un héroe enorme demasiado pronto.',
    ],
    against: [
      'Presiónala pronto, con mucha tropa barata, antes de que tenga élite.',
      'Cada batallón que le matas le duele el doble que a ti.',
    ],
  },
  lothlorien: {
    version: '10.0.0',
    difficulty: 'medium',
    style:
      'Los mejores arqueros: desgastar al rival desde lejos y no dejar que te alcance.',
    opening: [
      'Árboles Mallorn y alguna Pradera Verde separados para la economía.',
      'Guarnición Galadhrim: Tawar-na-Pengryn (arcos) protegidos por Tawar-na-Eithyr (picas).',
      'Subir la Guarnición a nivel 2 para Gwahaedhrim y Tawar-na-Thirrad, y a nivel 3 para los Edrain-na-Maethyr.',
      'Depósito del Bosque Dorado para las mejoras.',
    ],
    keyUnits: [
      'Tawar-na-Pengryn y, después, Edrain-na-Maethyr: los arcos que ganan partidas.',
      'Gwahaedhrim, picas para proteger a los arqueros de la caballería.',
      'Naith-na-Lethril (de la Pradera Verde) y Amroth-na-Erphin como caballería.',
    ],
    heroes: [
      'Haldir o Idrial para potenciar a los arqueros.',
      'Bárbol como tanque y para tirar edificios.',
      'Galadriel o Celeborn al final.',
    ],
    powers: [
      'Nivel 3: Águilas de las Montañas, el músculo que le falta a su infantería.',
      'Nivel 4: Niebla de Lothlórien, o Derribando sus Muros para asediar con ents.',
    ],
    howToWin: [
      'Arqueros siempre detrás de una línea de picas.',
      'Pelear donde el rival tenga que acercarse andando bajo las flechas.',
      'Retroceder disparando cuando el rival carga, y no aceptar el cuerpo a cuerpo.',
    ],
    howToLose: [
      'Dejar que la caballería enemiga llegue a los arqueros.',
      'Ir a por bases con murallas sin ents ni águilas.',
    ],
    against: [
      'Caballería rápida directa a sus arqueros, rodeando la línea.',
      'Tropas con escudo o mucha armadura aguantan mejor sus flechas.',
    ],
  },
  woodland: {
    version: '10.0.0',
    difficulty: 'medium',
    style:
      'Elfos rápidos y certeros con los beórnidas de músculo: moverse mucho y golpear con precisión.',
    opening: [
      'Santuarios de Caza separados: dan dinero y reclutan Feredir, arqueros baratísimos.',
      'Claro Silvano: Taurdrim (arcos) y Sigilmaethyr (espadas).',
      'Viñedo del Bosque para más economía.',
      'Subir el Claro Silvano a nivel 2 para las picas (Thelamaethyr) y la caballería Gwairochyn.',
    ],
    keyUnits: [
      'Taurdrim y Feredir, los arcos de toda la partida.',
      'Thelamaethyr y Tamastirnyr, las picas.',
      'Megilherdir y Theladagnyr, la élite de los Barracones Reales.',
      'Bersérkers Beórnidas (Refugio Beórnida nivel 3) para asediar y romper líneas.',
    ],
    heroes: [
      'Tauriel o Galion pronto.',
      'Legolas a media partida.',
      'Thranduil o Grimbeorn al final. Radagast, como apoyo.',
    ],
    powers: [
      'Nivel 1: Centinelas Ocultos o Cuerno de la Puerta.',
      'Nivel 3: Granizo de Flechas.',
      'Final: Gran Caza de Oromë.',
    ],
    howToWin: [
      'Aprovechar la velocidad para elegir dónde se pelea.',
      'Usar el Refugio Beórnida: sus tropas son lo más duro de la facción.',
    ],
    howToLose: [
      'Plantarse en un choque frontal largo con elfos frágiles.',
      'Olvidarse del asedio: sin beórnidas le cuesta tirar bases.',
    ],
    against: [
      'Bloquea con infantería pesada y no persigas a sus elfos rápidos.',
      'Ve a por sus Santuarios de Caza: son su dinero y sus arqueros baratos.',
    ],
  },
  erebor: {
    version: '10.0.0',
    difficulty: 'easy',
    style:
      'Enanos durísimos y hombres del Lago: avanzar despacio y no dejar que nadie te mueva.',
    opening: [
      'Minas Enanas separadas y un tercer constructor.',
      'Salón de los Guerreros de Erebor: Âzagh-baruk (espadas), Sigin-udrîg (picas) y Rakhâs-abzâg (arcos).',
      'Asamblea de Erebor para los hombres del Lago y los bárdidos, que dan número y arqueros.',
      'Subir el Salón y la Asamblea de nivel para la élite enana.',
    ],
    keyUnits: [
      'Sigin-udrîg: picas enanas, un muro contra la caballería.',
      'Baruk-sharâhul y Azaghâr-sharâhul, la élite de nivel 3.',
      'Arqueros Bárdidos y de la Ciudad del Lago para la distancia.',
    ],
    heroes: [
      'Tiene dos tandas: la de El Hobbit (Thorin y su compañía, Bardo) y la de El Señor de los Anillos (Dáin, Gimli, Brand). Elige una idea y céntrate en ella.',
      'Kili, Fili o Balin, y Hadhod o Glóin, son baratos y útiles al principio.',
      'Thorin Escudo de Roble o el Rey Dáin al final.',
    ],
    powers: [
      'Nivel 1: Habilidad Enana o Cuerno de Erebor.',
      'Nivel 4: Tesoro de Thrór (más dinero) o Despertar a Durin el Inmortal.',
    ],
    howToWin: [
      'Bloques de picas y espadas avanzando juntos con arqueros detrás.',
      'Ir a la partida larga: Erebor aguanta y mejora muy bien.',
    ],
    howToLose: [
      'Perseguir: los enanos son lentos y no alcanzan a nadie.',
      'Dejarse rodear por caballería en campo abierto.',
    ],
    against: [
      'No le aceptes el choque frontal: muévete y ataca donde no está.',
      'Atácale la economía con caballería: llega tarde a defenderla.',
    ],
  },
  mordor: {
    version: '10.0.0',
    difficulty: 'easy',
    style: 'Marea de orcos baratos, trolls para romper y héroes que dan miedo.',
    opening: [
      'Granjas de Esclavos separadas y un tercer constructor.',
      'Fortín Orco: Guerreros Orcos (solo 80) para cubrir el mapa, y Arqueros y Piqueros Orcos.',
      'Serrería y más economía.',
      'Subir el Fortín a nivel 2 para los Merodeadores Uruk Negros, y Jaula de Trolls.',
    ],
    keyUnits: [
      'Guerreros Orcos en masa: baratos para morir mientras otros pegan.',
      'Troll de las Montañas y, después, Olog-hai para romper líneas y asediar.',
      'Guarnición del Este: Khân-pâlainax (picas) y Khân-kâtaphranax (caballería) como tropa de calidad.',
      'Catapulta y Ariete para las murallas.',
    ],
    heroes: [
      'Gothmog o un Nazgûl pronto.',
      'La Boca de Sauron a media partida.',
      'El Rey Brujo de Angmar al final.',
    ],
    powers: [
      'Nivel 1: Cuerno Orco.',
      'Nivel 2: Llamad a la Horda.',
      'Nivel 3: Oscuridad o ¡Espectros Alados!',
    ],
    howToWin: [
      'Presión constante: cada minuto que el rival no puede desarrollarse es tuyo.',
      'Mezclar masa de orcos con trolls detrás.',
      'Reponer sin parar: los orcos se pierden y se reclutan.',
    ],
    howToLose: [
      'Frenarse y dejar al rival llegar a su tropa de élite.',
      'Mandar trolls solos contra picas y arqueros.',
    ],
    against: [
      'Arqueros y tropas de área contra la masa de orcos.',
      'Picas y héroes para cazar trolls.',
    ],
  },
  isengard: {
    version: '10.0.0',
    difficulty: 'medium',
    style:
      'La mejor infantería de la Sombra y el asedio más peligroso: empujar y tirar la base.',
    opening: [
      'Hornos y Serrerías separados.',
      'Estancia del Clan: Salvajes de Dunland y Lanceros Salvajes, baratos para el principio.',
      'Foso de Uruk y subirlo a nivel 2 cuanto antes: ahí están los Uruk-hai de verdad.',
      'Arsenal para las mejoras.',
    ],
    keyUnits: [
      'Guerreros y Piqueros Uruk-hai: la columna del ejército.',
      'Ballesteros Uruk-hai detrás.',
      'Jinetes de Huargos para acosar y perseguir.',
      'Ariete, Balista y Mina Explosiva para las murallas.',
    ],
    heroes: [
      'Uglúk o Sharku pronto.',
      'Lurtz a media partida.',
      'Saruman al final.',
    ],
    powers: [
      'Nivel 3: Constrúyeme un Ejército.',
      'Final: Ira de Caradhras o Tormenta Cruel.',
    ],
    howToWin: [
      'Uruk-hai mejorados y bien mezclados: casi nadie les gana a igualdad de dinero.',
      'Llevar siempre asedio: Isengard tira bases antes que nadie.',
    ],
    howToLose: [
      'Quedarse con la tropa dunlendina barata y no subir el Foso de Uruk.',
      'Perder Uruk-hai caros por no retirarlos a tiempo.',
    ],
    against: [
      'Arqueros en cantidad y no aceptar el cuerpo a cuerpo a igualdad.',
      'Caza su asedio antes de que llegue a tus murallas.',
    ],
  },
  mistyMountains: {
    version: '10.0.0',
    difficulty: 'medium',
    style:
      'Spam de orcos baratos y bestias de todo tipo: no dejar respirar al rival.',
    opening: [
      'Túneles Orcos y Serrería separados: los túneles son economía y además red de transporte.',
      'Cueva Trasgo de Moria: Orcos-chillones de Moria (solo 100) y Orcos-arqueros.',
      'Montículo del Lobo: la Jauría de Huargos acosa la economía rival.',
      'Pabellón Orco de la Montaña para orcos más duros y Guarida de Trolls.',
    ],
    keyUnits: [
      'Orcos-chillones de Moria en masa.',
      'Degolladores y Brutos de la Montaña para la línea.',
      'Troll de las Cavernas y, después, Troll de Piedra de Gundabad.',
      'Draco de Fuego contra hordas.',
    ],
    heroes: [
      'Golfimbul o Mûzgash pronto.',
      'El Gran Trasgo a media partida.',
      'Bolg del Norte al final.',
    ],
    powers: [
      'Nivel 1: Murciélagos de las Cavernas.',
      'Nivel 3: Convoca al Vigilante.',
      'Final: Daño de Durin.',
    ],
    howToWin: [
      'Superar en número al rival en todas partes.',
      'Usar los túneles para aparecer donde no te esperan.',
      'Acosar la economía rival desde el principio.',
    ],
    howToLose: [
      'Dejar que el rival llegue a la partida larga con tropa de élite.',
      'Mandar orcos básicos contra caballería pesada.',
    ],
    against: [
      'Caballería y ataques de área contra la masa.',
      'Destruye sus Túneles Orcos: le quitas dinero y movilidad.',
    ],
  },
  dolGuldur: {
    version: '10.0.0',
    difficulty: 'hard',
    style:
      'Debilitar con maldiciones y miedo, y rematar con lo que queda: pide mucho manejo.',
    opening: [
      'Molinos Esclavos separados. Sus constructores (Sombra Atada) son baratos.',
      'Prisión de Guldur: Gentuza Rota (100) como carne de cañón, y Carceleros y Cazadores Orcos.',
      'Guarida de Arañas: la Prole Arácnida es rápida para acosar.',
      'Fuente de Corrupción para más economía y unidades raras.',
    ],
    keyUnits: [
      'Carceleros (picas) y Cazadores Orcos (arcos) como base.',
      'Prole Arácnida para acosar y perseguir.',
      'Orcos Devastadores y Guardias de la Tumba para la línea.',
      'Castellano Acorazado y Ent-mujer Corrompida como piezas pesadas.',
    ],
    heroes: [
      'Thráin el Roto, muy barato, al principio.',
      'Krimpûl o la Reina Saenathra a media partida.',
      'Khamûl y el Nigromante al final.',
    ],
    powers: [
      'Nivel 1: Escalofrío de la Tumba.',
      'Nivel 3: Oscuridad o Marchitar.',
      'Final: Perdición del Bosque Verde.',
    ],
    howToWin: [
      'Debilitar al rival con habilidades y poderes justo antes del choque.',
      'Acosar con arañas mientras la masa aguanta.',
    ],
    howToLose: [
      'Jugar como Mordor: sus tropas no ganan solas en un choque frontal.',
      'No usar las habilidades, que son la mitad de la facción.',
    ],
    against: [
      'Héroes que limpien maldiciones, o simplemente velocidad: no le dejes preparar el choque.',
      'Ataques directos y rápidos antes de que despliegue sus piezas raras.',
    ],
  },
  haradwaith: {
    version: '10.0.0',
    difficulty: 'hard',
    style:
      'Economía de caravanas, mucha variedad de tropas y mûmakil que arrollan.',
    opening: [
      'Bazares: dan economía y reclutan las Caravanas Comerciales, que son dinero móvil y hay que proteger.',
      'Puesto Avanzado de Harondor: Caudillos de Harondor, baratos, para el principio.',
      'Asamblea Mahûd: Guerreros Mahûd y Cazadores de Cabezas Mahûd.',
      'Ciudadela Umbarian para los Corsarios de Umbar y los Númenóreanos Negros.',
    ],
    keyUnits: [
      'Mûmak (Asamblea Mahûd nivel 2): arrolla formaciones.',
      'Mûmak de Asedio a nivel 3 para tirar murallas.',
      'Guerreros Númenóreanos Negros y su Vanguardia como élite.',
      'Lanceros y Arqueros de Harondor para sujetar la línea.',
    ],
    heroes: [
      'Berúthiel o Syâr-Rhul pronto.',
      'Sûladan o Câssimir a media partida.',
      'El Rey Dorado al final.',
    ],
    powers: [
      'Nivel 1: Cuerno del Señor de la Serpiente.',
      'Nivel 3: Sol Implacable.',
      'Final: Arenas Ardientes.',
    ],
    howToWin: [
      'Mûmakil protegidos por tropa contra las picas y los arqueros enemigos.',
      'Proteger las caravanas y crecer en economía.',
    ],
    howToLose: [
      'Perder las caravanas a manos de la caballería rival.',
      'Mandar mûmakil solos contra picas y arqueros en masa.',
    ],
    against: [
      'Caballería contra sus caravanas desde el principio.',
      'Picas y arqueros en masa contra los mûmakil.',
    ],
  },
};

export { AOTR_FACTION_GUIDES };
