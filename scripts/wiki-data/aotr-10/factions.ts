import { FACTIONS, type FactionId } from '@/lib/tournament/factions';

/**
 * Faction pages for Age of the Ring 10.0.0: who replaces whom, and the
 * prose (ours, in Spanish). The numbers live next to this file, one JSON
 * sheet per faction, extracted from the game (see scripts/seed-wiki-10.ts).
 */

type FactionText = {
  summary: string;
  overview: string;
  strengths: string[];
  weaknesses: string[];
  ringHero?: string;
};

type FactionMeta = FactionText & {
  name: string;
  kind: 'core' | 'alternate';
  /** Core faction this one replaces on its map (alternates only). */
  transforms: FactionId | null;
  sortOrder: number;
  changes: string;
};

const VERSION_10 = {
  version: '10.0.0',
  releaseOrder: 4,
  releasedAt: null,
  changelogUrl:
    'https://www.moddb.com/mods/the-horse-lords-a-total-modification-for-bfme',
  notes: `La versión de la edición 2026: El Retorno del Rey. Es la primera versión cuyas fichas sacamos directamente de los archivos del juego (INI y lotr.str), así que costes, vida, daño, cadencia, alcance, velocidad y tamaño de batallón son los del juego.

Trae las once facciones principales y dieciséis alternativas, cada una ligada a su mapa: en ese mapa se juegan eligiendo la facción principal a la que sustituyen.`,
};

const CORE_CHANGES = `Primera ficha de la facción con los datos sacados directamente de la 10.0: unidades, héroes, estructuras, mejoras y libro de poderes tal y como están en el juego, con daño, cadencia, alcance y velocidad.

Todavía no tenemos el detalle de qué cambió respecto a la 9.3; lo añadiremos cuando lo comparemos con las notas del parche.`;

const ALT_CHANGES = `Primera ficha de esta facción alternativa en la wiki, con los datos sacados directamente de la 10.0. Se juega en su mapa propio eligiendo la facción principal a la que sustituye.`;

const core = (
  code: FactionId,
  sortOrder: number,
  text: FactionText,
): FactionMeta => ({
  name: FACTIONS[code].name,
  kind: 'core',
  transforms: null,
  sortOrder,
  changes: CORE_CHANGES,
  ...text,
});

const alternate = (
  name: string,
  transforms: FactionId,
  sortOrder: number,
  text: FactionText,
): FactionMeta => ({
  name,
  kind: 'alternate',
  transforms,
  sortOrder,
  changes: ALT_CHANGES,
  ...text,
});

const FACTIONS_10: Record<string, FactionMeta> = {
  // ------------------------------------------------------------------ core
  gondor: core('gondor', 0, {
    summary: 'La facción versátil: no destaca en nada y sirve para todo.',
    overview: `Gondor es el reino de los númenóreanos en el exilio y la primera línea contra Mordor. Empieza con las tropas de los feudos (Lamedon, Linhir, Lossarnach, Raíz Negra, Colinas Verdes), baratas y frágiles, y pasa a las de Minas Tirith cuando sube de nivel los edificios; los Montaraces de Ithilien, los Caballeros y los Guardias de la Fuente rematan el ejército.

Su gran baza es la defensa: Cantero, murallas, torres y la Fortaleza mejorada hacen de una base de Gondor un asedio muy caro. Los héroes cubren todos los papeles, de Pippin a Gandalf, y el libro de poderes trae a Dol Amroth, a los Rohirrim y, en el último nivel, al Rey Elessar.`,
    strengths: [
      'Versátil: buenas espadas, picas, arcos y caballería',
      'La facción más defensiva del juego',
      'Héroes para cualquier plan',
    ],
    weaknesses: [
      'No es la mejor en nada concreto',
      'Las tropas de los feudos son frágiles frente a facciones agresivas',
    ],
    ringHero: 'Frodo',
  }),
  rohan: core('rohan', 1, {
    summary: 'La caballería: cargas que barren la infantería enemiga.',
    overview: `Rohan es el pueblo de los Señores de los Caballos y vive de sus jinetes: Jinetes de la Marca, Guerreros y Arqueros Rohirrim, Jinetes del Río Nevado y la Guardia Real Montada. A pie tiene Campesinos, Guardias y la Guardia Real de Edoras para sostener la línea, y Guerreros Helmingas como tropa de élite.

Su economía premia expandirse pronto y su libro de poderes la ayuda a llegar con el ejército entero: Cosecha Abundante, el Jabalí de Everholt o La Última Marcha. Los héroes, de Merry y Éowyn a Théoden, están pensados para acompañar las cargas.`,
    strengths: [
      'La mejor caballería del juego',
      'Movilidad para elegir dónde se lucha',
      'Héroes montados que potencian las cargas',
    ],
    weaknesses: [
      'Las picas y los muros de lanzas castigan mucho a su caballería',
      'Infantería y asedio modestos',
    ],
    ringHero: 'Frodo',
  }),
  rivendell: core('rivendell', 2, {
    summary: 'Los Altos Elfos y los Dúnedain: tropa cara, muy buena y escasa.',
    overview: `Rivendel reúne a los Altos Elfos de Elrond con los Dúnedain del Norte y la gente de Bree y la Comarca. Las tropas baratas (Fronteros, Arqueros Tuk, Guardias de Bree) aguantan el principio; después llegan los Montaraces del Norte, los Jinetes Dúnedain y los elfos de élite: Macari, Ehtyari, Quingar, Roquentari y los Laurëthelyn.

Es una facción de calidad sobre cantidad: cada batallón cuesta mucho y vale mucho. Sus héroes (Arwen, Glorfindel, los hijos de Elrond, Aragorn) son de los más fuertes del juego, y el libro de poderes la ayuda con Bendición de Ulmo, el Salón del Fuego o la Ira de los Bruinen.`,
    strengths: [
      'Tropa de élite de las mejores del juego',
      'Héroes muy poderosos',
      'Arqueros y caballería excelentes a nivel alto',
    ],
    weaknesses: [
      'Pocas unidades y caras: perder un batallón duele',
      'Lenta para arrancar frente a facciones de spam',
    ],
    ringHero: 'Frodo',
  }),
  lothlorien: core('lothlorien', 3, {
    summary: 'Los mejores arqueros: castigar a distancia y no dejarse atrapar.',
    overview: `Lothlórien es el reino de Galadriel y Celeborn, y su ejército gira alrededor del arco: Tawar-na-Pengryn al principio y los Edrain-na-Maethyr después hacen más daño a distancia que nadie. Delante pone a los Tawarwaith, los Gwahaedhrim y los Tawar-na-Thirrad, y como caballería a los Naith-na-Lethril y los Amroth-na-Erphin.

Juega a desgastar al rival desde lejos y elegir el combate. Sus héroes (Haldir, Idrial, Galadriel) apoyan a los arqueros, y Bárbol y Águilas de las Montañas le dan el músculo que su infantería no tiene. En el último nivel, Derribando sus Muros pone a los ents a asediar.`,
    strengths: [
      'Los mejores arqueros del juego',
      'Muy buena para desgastar antes de combatir',
      'Héroes de apoyo con mucho impacto',
    ],
    weaknesses: [
      'La caballería enemiga que llega a sus arqueros hace estragos',
      'Infantería ligera y frágil',
    ],
    ringHero: 'Frodo',
  }),
  woodland: core('woodland', 4, {
    summary: 'Elfos silvanos, beórnidas y el Bosque Negro: rápidos y certeros.',
    overview: `El Reino del Bosque es el de Thranduil en el Bosque Negro, acompañado de los beórnidas y los hombres del bosque. Sus elfos baratos (Feredir, Taurdrim, Sigilmaethyr, Thelamaethyr) son ágiles y precisos; los de élite (Megilherdir, Theladagnyr, Cúmaethyr, Tamastirnyr) y la caballería Gwairochyn y Faenrochyn completan un ejército muy móvil.

Los Bersérkers Beórnidas y su Ariete le dan pegada y asedio, y Radagast y los druidas le aportan apoyo. Entre los héroes destacan Legolas, Tauriel y Thranduil, y el libro de poderes le da la Gran Caza de Oromë y Granizo de Flechas.`,
    strengths: [
      'Unidades rápidas y certeras',
      'Mezcla de elfos, beórnidas y druidas para cualquier situación',
      'Muy buenos arqueros baratos',
    ],
    weaknesses: [
      'Tropas frágiles en el cuerpo a cuerpo largo',
      'Necesita manejo fino para no perder unidades caras',
    ],
    ringHero: 'Bilbo',
  }),
  erebor: core('erebor', 5, {
    summary:
      'Enanos y hombres del Lago: duros, lentos y muy difíciles de mover.',
    overview: `Erebor reúne a los enanos de la Montaña Solitaria con los hombres de la Ciudad del Lago y del Valle. Sus enanos (Âzagh-baruk, Sigin-udrîg, Rakhâs-abzâg, los Khagal-zirak y los sharâhul de élite) aguantan como nadie, y los hombres del Lago y bárdidos dan número y arqueros.

Tiene la lista de héroes más larga del juego, con dos épocas: la de El Hobbit (Thorin y su compañía, Bardo) y la de El Señor de los Anillos (Dáin, Gimli, Brand). Su libro de poderes premia la partida larga con el Tesoro de Thrór y, al final, Despertar a Durin el Inmortal.`,
    strengths: [
      'Infantería durísima',
      'Muchos héroes para elegir estrategia',
      'Muy fuerte en partidas largas',
    ],
    weaknesses: [
      'Lenta: le cuesta reaccionar y perseguir',
      'Sin caballería propia de verdad',
    ],
    ringHero: 'Bilbo',
  }),
  mordor: core('mordor', 6, {
    summary: 'La marea de la Sombra: orcos sin fin, trolls y los Nazgûl.',
    overview: `Mordor es el ejército de Sauron: Guerreros, Piqueros y Arqueros Orcos baratísimos para ocupar el mapa, Merodeadores Uruk Negros y la Legión de Morgul para pegar, y los hombres de Khand y del Este (los khân) como tropa de calidad. Los trolls (de las Montañas, con Tambor, Olog-hai) rompen líneas, y Catapultas y Grond se encargan de las murallas.

Sus héroes son de los más temidos: Gothmog, la Boca de Sauron, el Rey Brujo y los Nazgûl. El libro de poderes trae Oscuridad, los Espectros Alados y, en el último nivel, el Ojo de Sauron o los Fuegos de Orodruin.`,
    strengths: [
      'Número: orcos baratos que se reponen sin parar',
      'Trolls y monstruos para romper cualquier línea',
      'Héroes que aterrorizan',
    ],
    weaknesses: [
      'Las tropas básicas caen enseguida',
      'Depende de mantener la presión: si se frena, pierde ventaja',
    ],
    ringHero: 'Sauron',
  }),
  isengard: core('isengard', 7, {
    summary: 'Uruk-hai y dunlendinos: la mejor infantería de la Sombra.',
    overview: `Isengard es el ejército de Saruman: los Uruk-hai (Guerreros, Piqueros, Ballesteros, Portadores de Escudo, Bersérkers) son infantería de élite a precio de tropa normal, y los Salvajes y los Dunlendinos dan número y variedad. Los Jinetes de Huargos y los Jinetes Dunnish ponen la movilidad.

Su asedio es temible: Arietes, Balistas, Zapadores y Minas Explosivas tiran murallas muy pronto. Sus héroes (Uglúk, Lurtz, Sharku, Gríma, Saruman) empujan a los Uruk, y el libro de poderes trae Constrúyeme un Ejército y la Ira de Caradhras.`,
    strengths: [
      'Infantería Uruk-hai muy fuerte',
      'El asedio más peligroso del juego',
      'Dos ejércitos en uno: Uruk-hai y dunlendinos',
    ],
    weaknesses: [
      'Unidades caras para ser de la Sombra',
      'Caballería limitada a huargos y dunlendinos',
    ],
  }),
  mistyMountains: core('mistyMountains', 8, {
    summary: 'La marea: orcos baratos por todas partes y bestias para rematar.',
    overview: `Las Montañas Nubladas son orcos y bestias. Empieza con los orcos de Moria, baratísimos, o con los de las montañas, más caros y duros, y se apoya en una colección de criaturas: huargos para acosar, trolls para asediar y romper líneas, murciélagos para atacar desde el aire y dragones para quemar hordas.

La red de túneles le da movilidad y control del mapa. Casi siempre supera en número al rival; la clave es usar esa masa para no dejarle desarrollarse. En el último nivel puede despertar al Vigilante, al Daño de Durin o la Cólera del Dragón de Fuego.`,
    strengths: [
      'Spam de unidades como ninguna otra facción',
      'Movilidad por la red de túneles',
      'Bestias de todo tipo: trolls, murciélagos, dragones',
    ],
    weaknesses: [
      'La partida larga se complica si el rival aguanta',
      'Las tropas básicas son muy débiles, sobre todo frente a caballería',
    ],
    ringHero: 'Smaug',
  }),
  dolGuldur: core('dolGuldur', 9, {
    summary: 'El Nigromante: debilitar al rival y rematarlo con lo que cae.',
    overview: `Dol Guldur es la fortaleza del Nigromante en el Bosque Negro. Su ejército mezcla orcos carceleros y cazadores, arañas (Prole Arácnida, Hermanas de Saenathra) y criaturas retorcidas como las Ent-mujeres Corrompidas y el Castellano Acorazado, con la Gentuza Rota como carne de cañón.

Juega a debilitar: maldiciones, venenos y miedo que dejan al rival sin fuerza antes del choque. Sus héroes (Thráin el Roto, Krimpûl, la Reina Saenathra, Khamûl) y su libro de poderes (Oscuridad, Marchitar, Perdición del Bosque Verde) giran alrededor de esa idea.`,
    strengths: [
      'Debilitamientos que deciden combates',
      'Arañas rápidas para acosar',
      'Unidades raras que el rival no espera',
    ],
    weaknesses: [
      'Pide mucho manejo para sacarle partido',
      'Las tropas por sí solas no son de las más fuertes',
    ],
  }),
  haradwaith: core('haradwaith', 10, {
    summary: 'El Sur: caravanas, mûmakil y los Númenóreanos Negros.',
    overview: `Haradwaith reúne a los pueblos del sur al servicio de Sauron: los hombres de Harondor, los Mahûd del lejano Harad, los Corsarios de Umbar y los Númenóreanos Negros. Su economía se mueve con caravanas comerciales que hay que proteger, y su ejército va de los Caudillos baratos a los Guardias de la Serpiente.

Los mûmakil son su sello: bestias enormes que arrollan ejércitos y, en su versión de asedio, tiran murallas. Sus héroes (Berúthiel, Sûladan, Câssimir, el Rey Dorado) y su libro de poderes (Sol Implacable, Arenas Ardientes) completan una facción muy distinta a las demás.`,
    strengths: [
      'Mûmakil que arrollan cualquier línea',
      'Mucha variedad de tropas',
      'Economía móvil con caravanas',
    ],
    weaknesses: [
      'Las caravanas son un objetivo fácil para el acoso',
      'Los arqueros y picas en masa castigan a los mûmakil',
    ],
    ringHero: 'Zigûr',
  }),

  // ------------------------------------------------------------ alternates
  angmar: alternate('Angmar', 'dolGuldur', 100, {
    summary: 'El reino del Rey Brujo: frío, maldiciones y Carn Dûm.',
    overview: `Angmar es el reino del norte del Rey Brujo, que en la 10.0 sustituye a Dol Guldur en su mapa. Su ejército mezcla la Escoria y los orcos de Angmar con los juramentados y brujos de Carn Dûm, los Váldgoil del norte, lobos blancos, trolls de las nieves y los muertos de los túmulos.

Sus héroes (Naglûr, Carghûl, Nauroth, Úlf, Akhôrahil y el propio Rey Brujo) y su libro de poderes (Invierno Blanco, Tormenta del Norte, el Mamut Corrompido) juegan a congelar y debilitar al rival.`,
    strengths: [
      'Mucha variedad: orcos, hombres, bestias y no-muertos',
      'Debilitamientos y control del campo',
      'Trolls de las nieves para el asedio',
    ],
    weaknesses: ['Necesita combinar bien sus piezas', 'Muchas unidades caras'],
  }),
  arnor: alternate('Arthedain', 'gondor', 101, {
    summary: 'Los últimos reyes del Norte: pocos, caros y de gran calidad.',
    overview: `Arthedain es el último de los reinos de Arnor, que en la 10.0 sustituye a Gondor en su mapa. Su ejército es corto y de élite: Capitanes de Annúminas, Arqueros de Cardolan, Caballeros de Arthedain y la Guardia Real de Fornost Erain, más trabucos para el asedio.

La Embajada le permite llamar a aliados temporales (los Hombres de la Tribu Gwathló, los Lossoth o los Caballeros Noldor de Rivendel), y sus héroes (Malbeth el Vidente, Aranarth, Arvedui y Elrond) sostienen al ejército.`,
    strengths: [
      'Tropa de mucha calidad',
      'Aliados temporales desde la Embajada',
      'Buena caballería pesada',
    ],
    weaknesses: ['Muy pocas unidades distintas', 'Cada pérdida cuesta mucho'],
    ringHero: 'Señor Elrond',
  }),
  battleOfFiveArmies: alternate(
    'La Batalla de los Cinco Ejércitos',
    'erebor',
    102,
    {
      summary: 'Enanos, hombres del Lago y elfos del Bosque Negro, juntos.',
      overview: `La Batalla de los Cinco Ejércitos sustituye a Erebor en su mapa y junta a los tres pueblos libres que lucharon al pie de la Montaña Solitaria: los enanos de Thorin y Dáin, los hombres de la Ciudad del Lago y de Bardo, y los elfos de Thranduil.

Sus tropas mezclan los hombres del Lago y bárdidos con la élite silvana (Megilherdir, Theladagnyr, Cúmaethyr, Tamastirnyr), y tiene una lista enorme de héroes de El Hobbit, con Gandalf el Gris. El libro de poderes trae a las Águilas y a Beorn.`,
      strengths: [
        'Tres ejércitos distintos en uno',
        'Muchísimos héroes de El Hobbit',
        'Élite élfica muy fuerte',
      ],
      weaknesses: [
        'Mezcla difícil de manejar bien',
        'Las tropas de los hombres del Lago son frágiles',
      ],
    },
  ),
  dolAmroth: alternate('Dol Amroth', 'lothlorien', 103, {
    summary: 'Los caballeros del Cisne: la caballería pesada de Gondor.',
    overview: `Dol Amroth es el principado de Imrahil en la costa de Belfalas, que en la 10.0 sustituye a Lothlórien en su mapa. Su ejército va de la Milicia y los Guardias de Amroth a los Hombres de Armas, los Marinos de Belfalas y los Campeones de Tirith Aear.

Su fuerza está en la caballería: Escuderos, el Capitán del Cisne Negro y los Caballeros Cisne. Los héroes son la familia del príncipe (Lothíriel, Amrothos, Erchirion, Elphir, Imrahil) con Faramir y Boromir, y el libro de poderes cierra con El Retorno del Rey.`,
    strengths: [
      'Caballería pesada muy fuerte',
      'Infantería sólida y bien equipada',
      'Héroes que se apoyan entre sí',
    ],
    weaknesses: [
      'Las picas castigan mucho su plan principal',
      'Unidades caras',
    ],
    ringHero: 'Frodo',
  }),
  dorwinion: alternate('Dorwinion', 'woodland', 104, {
    summary: 'Los hombres del vino y sus aliados: legiones, beórnidas y magos.',
    overview: `Dorwinion sustituye al Reino del Bosque en su mapa y reúne a los hombres de las orillas del mar de Rhûn con sus aliados: los beórnidas, los Éotheod, los elfos Kinn-lai y los magos azules, Morinehtar y Rómestámo.

Sus Legionarios, Guardias y Auxiliares forman un ejército ordenado, los Équites Heroicos y los Guardianes de Hársald son su élite, y los Bersérkers Beórnidas ponen la pegada. El libro de poderes trae El Rey Bajo la Montaña y la Astucia de Haimenar.`,
    strengths: [
      'Ejército ordenado con todas las piezas',
      'Magos y druidas de apoyo',
      'Beórnidas para romper líneas',
    ],
    weaknesses: [
      'Pocas unidades realmente baratas',
      'Requiere combinar bien tropas muy distintas',
    ],
    ringHero: 'Frodo',
  }),
  dunharrow: alternate('El Sagrario', 'rohan', 105, {
    summary:
      'El Ejército de los Muertos: pocos, inmortales a ratos y aterradores.',
    overview: `El Sagrario sustituye a Rohan en su mapa y pone en el campo a los Perjuros, los Hombres de la Montaña que rompieron su juramento a Isildur. Su ejército es muy corto: Guerreros, Lanceros y Arqueros Perjuros, el Heraldo y el Sabio que los convoca.

Lo compensa con fantasmas resistentes al miedo y al arrollamiento que se curan fuera de combate, y con héroes como el Rey de los Muertos, el Vidente Espectral, el Campeón Traidor y la Bruja de Hueso. El libro de poderes trae La Hueste Gris y los Muertos Errantes.`,
    strengths: [
      'Tropas fantasmales muy resistentes',
      'Miedo y control del campo',
      'Héroes muy temibles',
    ],
    weaknesses: [
      'Apenas tiene variedad de unidades',
      'Todo es caro: pocas tropas en el campo',
    ],
    ringHero: 'Sombra de Isildur',
  }),
  durinsFolk: alternate('El Pueblo de Durin', 'erebor', 106, {
    summary: 'Todos los enanos: Erebor, las Colinas de Hierro y Ered Luin.',
    overview: `El Pueblo de Durin sustituye a Erebor en su mapa y reúne a los enanos de todos los reinos: Erebor, las Colinas de Hierro y las Montañas Azules, sin los hombres del Lago (salvo los bárdidos).

Su ejército es de enanos de principio a fin, desde los Uthâk y los Âzagh-baruk hasta los sharâhul de élite y los Ukhrub-sharâhul montados, con los Cazadores de Trolls de Ered Luin. Comparte con Erebor la lista de héroes de las dos épocas y el libro de poderes que acaba en Durin el Inmortal.`,
    strengths: [
      'La infantería más dura del juego',
      'Muchos héroes enanos',
      'Muy fuerte en partidas largas',
    ],
    weaknesses: ['Lenta', 'Poca movilidad para perseguir o acosar'],
    ringHero: 'Bilbo',
  }),
  greyCompany: alternate('La Compañía Gris', 'gondor', 107, {
    summary: 'Aragorn y los Dúnedain al rescate de Gondor.',
    overview: `La Compañía Gris sustituye a Gondor en su mapa: es el Gondor de los feudos del sur reforzado con los Dúnedain del Norte que bajaron con Aragorn por los Senderos de los Muertos, más Dol Amroth.

Tiene las tropas de los feudos, los Montaraces del Norte, los Hombres de Armas y los Caballeros Cisne, y una lista de héroes enorme: Aragorn, Halbarad, los hijos de Elrond, Legolas, Gimli e incluso el Rey de los Muertos. El libro de poderes trae el Montículo de Dwimorberg y la Ira de los Bruinen.`,
    strengths: [
      'Muchísimos héroes fuertes',
      'Mezcla de feudos baratos y élite',
      'Buena caballería con los Caballeros Cisne',
    ],
    weaknesses: [
      'Depende mucho de los héroes',
      'Sin las tropas de Minas Tirith',
    ],
    ringHero: 'Frodo',
  }),
  ithilien: alternate('Ithilien', 'gondor', 108, {
    summary: 'Los montaraces de Faramir: emboscadas, arcos y movilidad.',
    overview: `Ithilien sustituye a Gondor en su mapa y es el ejército de los Montaraces de Faramir: Pioneros, Escaramuzadores, Centinelas, Montaraces y Jinetes de Ithilien, con arietes y trabucos propios.

Es una facción ligera y rápida que construye sobre cimientos y vive de la emboscada y el arco. Sus héroes son los capitanes de Faramir (Damrod, Mablung, Anborn, Madril, Beregond) y el propio Faramir.`,
    strengths: [
      'Muy buenos arqueros',
      'Movilidad y emboscadas',
      'Unidades baratas',
    ],
    weaknesses: [
      'Tropas ligeras que sufren en el choque frontal',
      'Pocas unidades distintas',
    ],
    ringHero: 'Frodo',
  }),
  hostOfTheWest: alternate('Hueste del Oeste', 'rivendell', 109, {
    summary: 'La Última Alianza: elfos y hombres contra Sauron.',
    overview: `La Hueste del Oeste sustituye a Rivendel en su mapa y recrea la Última Alianza de Elfos y Hombres de la Segunda Edad: los Dúnedain de Elendil y sus hijos, los Noldor de Gil-galad y Elrond, y los aliados enanos y silvanos.

Mezcla las tropas de Rivendel (Macari, Ehtyari, Quingar, Roquentari, Laurëthelyn) con los Bârim an-Nimruzîrim y los Artaheruvi-i-Élentara. Sus héroes son los grandes de esa guerra: Elendil, Isildur, Anárion, Gil-galad, Elrond, Durin, Amdír y Oropher.`,
    strengths: [
      'Élite muy fuerte de elfos y hombres',
      'Héroes legendarios',
      'Libro de poderes poderoso (Poder de los Eldar, Poder del Oeste)',
    ],
    weaknesses: ['Todo es muy caro', 'Lenta para empezar'],
  }),
  morgul: alternate('Morgul', 'mordor', 110, {
    summary: 'Minas Morgul: el ejército del Rey Brujo y sus hechiceros.',
    overview: `Morgul sustituye a Mordor en su mapa y es el ejército de Minas Morgul: Espadas, Piqueros, Arqueros y Portadores de Escudo de Morgul, Jinetes de Huargos, hechiceros y las Sombras de Ithil, con trolls segadores, catapultas y Grond.

Sus héroes son los capitanes del Rey Brujo (Gorbag, Murgash, Guritz, Gothmog, los Nazgûl, Bûrghâsh el Conflagrante) y el propio Rey Brujo. El libro de poderes comparte con Mordor el Ojo de Sauron y suma La Ciudad Muerta.`,
    strengths: [
      'Infantería orca mejor que la de Mordor',
      'Héroes y hechiceros temibles',
      'Asedio con catapultas y Grond',
    ],
    weaknesses: ['Menos número que Mordor', 'Poca caballería'],
    ringHero: 'Sauron',
  }),
  rhun: alternate('Rhûn', 'mordor', 111, {
    summary: 'Los orientales y Khand: disciplina, carros y dracos de guerra.',
    overview: `Rhûn sustituye a Mordor en su mapa y es el ejército de los Orientales y los Variags de Khand: infantería disciplinada (los khân), arqueros, perros de guerra, jinetes variag y catafractos.

Su asedio y sus monstruos son su sello: los Gâsh-gôrtân, los Khârtan-gâsh y el Draco de Guerra de Rhûn. Sus héroes (Bélohk, Razári, Khren-ták, Khamûl y Vâh-rús) y el libro de poderes (Cabalgata de la Serpiente Negra, Vuelo del Dragón Dorado) completan la facción.`,
    strengths: [
      'Infantería disciplinada y resistente',
      'Dracos de guerra',
      'Caballería pesada',
    ],
    weaknesses: ['Sin el número de Mordor', 'Unidades caras'],
    ringHero: 'Sauron',
  }),
  ruffians: alternate('Los Rufianes de Sharkey', 'isengard', 112, {
    summary: 'La Comarca ocupada: rufianes, medio orcos y el Jefe.',
    overview: `Los Rufianes de Sharkey sustituyen a Isengard en su mapa y recrean el saqueo de la Comarca: la Leva Forzosa, los Cazadores y Guardianes de la Puerta rufianes, los Baluartes Medio Orcos, los Sabuesos de Sharkey y los Batidores.

Es una facción de robo y acoso: muchas de sus unidades y héroes roban recursos al golpear. Sus héroes son Ted Arenas, Gusano, Bill Helechal y Sharkey, y el libro de poderes trae los Lobos de Isengard, ¡Haced Restallar el Látigo! y la Voz del Forjador de Anillos.`,
    strengths: [
      'Robo de recursos con cada golpe',
      'Acoso rápido con sabuesos y batidores',
      'Debilitamientos de Sharkey sobre el rival',
    ],
    weaknesses: ['Muy pocas unidades distintas', 'Tropa básica débil'],
  }),
  shadowAndFlame: alternate('Sombra y Llama', 'mistyMountains', 113, {
    summary: 'Moria y el Balrog: orcos, trolls y el Daño de Durin.',
    overview: `Sombra y Llama sustituye a las Montañas Nubladas en su mapa y es el ejército de Moria: orcos de Moria (chillones, arqueros, lanceros), Merodeadores Uruk Negros, Saqueadores Hobotrasgos y trolls de todo tipo, de la Manada al Destructor y la Troll-catapulta.

Su héroe estrella es el Daño de Durin, el Balrog, junto a Mûzgash, Urshak y Lug el Mutilado. El libro de poderes trae el Dragón de las cavernas, el Vigilante y el Colapso del Túnel.`,
    strengths: [
      'Número de orcos y pegada de trolls',
      'El Balrog como héroe',
      'Túneles para moverse',
    ],
    weaknesses: [
      'Pocas unidades a distancia buenas',
      'Las tropas básicas son muy frágiles',
    ],
  }),
  shire: alternate('La Comarca', 'rivendell', 114, {
    summary: 'Los hobbits defienden su tierra: baratos, valientes y numerosos.',
    overview: `La Comarca sustituye a Rivendel en su mapa y pone a los hobbits a defender su tierra: Fronteros, Arqueros Tuk, Bravos de los Gamos, Cornetas, Sabuesos de Marjala y el Lanzador de Fuegos Artificiales.

Sus héroes son los hobbits de la Compañía (Frodo, Sam, Merry, Pippin) con Hamfast, el Granjero Maggot y Gordo Bolger. El libro de poderes trae Valentía Mediana y el Cuerno de Llamada de Los Gamos.`,
    strengths: [
      'Unidades muy baratas',
      'Muchos héroes hobbits',
      'Buenos arqueros',
    ],
    weaknesses: [
      'Tropas frágiles',
      'Le cuesta enfrentarse a monstruos y élite',
    ],
    ringHero: 'Bilbo',
  }),
  whiteHand: alternate('La Mano Blanca', 'isengard', 115, {
    summary: 'Isengard en guerra total: Uruk-hai, huargos y orcos de Saruman.',
    overview: `La Mano Blanca sustituye a Isengard en su mapa y amplía su ejército: además de los Uruk-hai y los dunlendinos tiene huargos (Jaurías, Jinetes y Arqueros Jinetes), orcos, Hacheros Uruk-hai y el Troll de Asedio de Isengard.

Sus héroes suman a Grishnákh y a Móg a los de Isengard, y el libro de poderes cambia Alimentar los Fuegos por Rapto de Sangre.`,
    strengths: [
      'El ejército más completo de Isengard',
      'Infantería Uruk-hai muy fuerte',
      'Asedio temible',
    ],
    weaknesses: [
      'Tantas opciones que cuesta elegir',
      'Unidades caras para ser de la Sombra',
    ],
  }),
};

export type { FactionMeta };
export { FACTIONS_10, VERSION_10 };
