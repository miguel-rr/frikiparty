import type { StartGuide } from '@/lib/wiki/guides/types';

/**
 * "Empieza aquí" for Age of the Ring: what someone who plays once a year
 * needs to remember before the first match. Numbers checked against the
 * 10.0 game files (playertemplate.ini, gamedata.ini, farm.ini).
 */
const AOTR_START_GUIDE: StartGuide = {
  version: '10.0.0',
  lead: 'Para quien juega una vez al año y llega sin acordarse de nada. Diez minutos de lectura antes de la primera partida y vas sobrado.',
  sections: [
    {
      id: 'before',
      title: 'Antes de jugar',
      summary: 'Launcher, versión 10.0 y cómo entrar en la partida de la LAN.',
      blocks: [
        {
          kind: 'list',
          items: [
            'Age of the Ring es un mod de La Batalla por la Tierra Media II: El Resurgir del Rey Brujo. Se arranca desde su propio launcher, no desde el juego original.',
            'En la Frikiparty jugamos la 10.0. Comprueba en el launcher que tienes esa versión: con otra no podrás entrar en la partida de los demás.',
            'Las partidas son en red local. Si el juego no ve la partida, revisa que estás en la misma red y que el cortafuegos de Windows no lo bloquea.',
            'Antes de la partida, entra un rato en una escaramuza contra la IA en fácil con la facción que vayas a llevar. Cinco minutos bastan para recordar dónde está cada botón.',
          ],
        },
      ],
    },
    {
      id: 'economy',
      title: 'La economía',
      summary:
        'Edificios de economía separados: el error que más partidas cuesta.',
      blocks: [
        {
          kind: 'text',
          text: 'Empiezas con tu fortaleza y dos constructores. Todo sale de un único recurso, y lo producen los edificios de economía de cada facción: granjas, granjas de esclavos, minas, hornos, serrerías…',
        },
        {
          kind: 'tip',
          title: 'Lo más importante de la partida',
          text: 'Cada edificio de economía reclama el terreno que tiene alrededor y produce según cuánto terreno libre consigue. Si los pegas entre sí o a otros edificios, se quitan terreno y producen menos. Sepáralos, cada uno con su espacio.',
        },
        {
          kind: 'list',
          items: [
            'Los cinco primeros edificios de economía rinden al cien por cien. A partir del sexto, cada uno nuevo produce un poco menos (95 %, 90 %, 85 %… hasta el 66 %). Merece la pena tener más, pero cada vez compensa menos.',
            'Cada edificio de economía suma 50 puntos de mando, la fortaleza 100 y algunas estatuas 10. Sin economía no solo vas sin dinero: tampoco puedes tener un ejército grande.',
            'En el mapa hay parcelas libres para construir fuera de tu base. Cogerlas da dinero y mando, pero hay que defenderlas.',
            'El dinero guardado no sirve de nada. Si tienes más de 1.000 sin gastar, te falta un edificio de reclutamiento o te sobra miedo.',
          ],
        },
      ],
    },
    {
      id: 'army',
      title: 'Ejército y puntos de mando',
      summary: 'Batallones, puntos de mando, niveles de edificio y veteranía.',
      blocks: [
        {
          kind: 'list',
          items: [
            'Las tropas salen en batallones. Cada batallón gasta puntos de mando (aparecen en su ficha). Cuando llegas al tope, no puedes reclutar más hasta que pierdas tropas o construyas más economía.',
            'Los edificios de reclutamiento suben de nivel, sea pagando la mejora o reclutando con ellos. Las mejores tropas piden nivel 2 o 3 del edificio, y algunas también un héroe concreto. En la ficha de cada facción de la wiki verás qué pide cada una.',
            'Las tropas ganan experiencia luchando y suben de rango: un batallón veterano vale mucho más que uno nuevo. Retíralo a curarse antes de perderlo.',
            'Las mejoras de armas y armaduras de la herrería, la armería o el edificio equivalente de tu facción se notan muchísimo en los choques igualados.',
          ],
        },
      ],
    },
    {
      id: 'counters',
      title: 'Quién gana a quién',
      summary: 'Picas, espadas, arcos, caballería: quién gana a quién.',
      blocks: [
        {
          kind: 'text',
          text: 'Es piedra, papel o tijera. Aprenderte esto vale más que cualquier truco:',
        },
        {
          kind: 'table',
          head: ['Tropa', 'Gana a', 'Pierde contra'],
          rows: [
            [
              'Picas',
              'Caballería, sobre todo si carga de frente',
              'Arqueros y espadas',
            ],
            ['Espadas', 'Picas', 'Caballería y arqueros'],
            [
              'Arqueros',
              'Infantería que se acerca despacio',
              'Caballería que les llega',
            ],
            ['Caballería', 'Arqueros y espadas (arrolla al cargar)', 'Picas'],
            ['Asedio', 'Edificios y murallas', 'Cualquier cosa que lo alcance'],
            [
              'Monstruos (trolls, mûmakil…)',
              'Formaciones de infantería',
              'Picas, arqueros en masa y héroes que los cazan',
            ],
          ],
        },
        {
          kind: 'tip',
          title: 'La caballería no se queda pegada',
          text: 'Carga, atraviesa, sal y vuelve a cargar. La caballería parada en un cuerpo a cuerpo pierde su ventaja y muere.',
        },
      ],
    },
    {
      id: 'heroes',
      title: 'Héroes',
      summary: 'Cuándo sacarlos, qué desbloquean y cómo no perderlos.',
      blocks: [
        {
          kind: 'list',
          items: [
            'Los héroes se reclutan en la fortaleza (algunos en otros edificios), suben de nivel luchando y desbloquean habilidades. Úsalas: un héroe que solo pega es medio héroe.',
            'Si muere, se puede revivir en la fortaleza pagando, pero pierdes tiempo y presión. Un héroe barato al principio da mucho juego: explora, caza batallones sueltos y ayuda a ganar los primeros choques.',
            'Algunos héroes desbloquean tropas, como Forlong a los Hacheros de Lossarnach o Erkenbrand a los Guerreros del Folde Oeste. Está indicado en la ficha de cada unidad.',
            'Los héroes caros (Gandalf, el Rey Brujo, Galadriel…) deciden partidas, pero no los compres antes de tener economía y ejército.',
          ],
        },
      ],
    },
    {
      id: 'powers',
      title: 'Poderes',
      summary: 'El libro de poderes: cómo se gana y en qué gastarlo.',
      blocks: [
        {
          kind: 'text',
          text: 'Matando enemigos ganas puntos de poder, que se gastan en el libro de poderes de tu facción: un árbol de cuatro niveles (5, 10, 15 y 25 puntos). Cada poder pide haber cogido el que tiene encima o al lado en el nivel anterior, así que conviene decidir pronto hacia qué poder final vas.',
        },
        {
          kind: 'list',
          items: [
            'Coge pronto un poder de nivel 1. Suelen ser curar, explorar o mejorar a las tropas, y salen baratos.',
            'Los poderes que invocan tropas o héroes (los Rohirrim de Gondor, las Águilas de Lothlórien…) son los que más se notan para un novato.',
            'Los poderes se recargan: úsalos en cada choque grande, no los guardes.',
          ],
        },
      ],
    },
    {
      id: 'first-minutes',
      title: 'Los primeros cinco minutos',
      summary:
        'Una apertura paso a paso que sirve para casi todas las facciones.',
      blocks: [
        {
          kind: 'text',
          text: 'Una apertura que sirve para casi todas las facciones. En la guía de cada una se concreta con sus edificios:',
        },
        {
          kind: 'steps',
          items: [
            'Los dos constructores levantan edificios de economía, separados entre sí y de la fortaleza.',
            'Recluta otro constructor en la fortaleza. Con tres se construye mucho más rápido.',
            'Primer edificio de reclutamiento. Saca uno o dos batallones baratos para defenderte y para coger parcelas del mapa.',
            'Más economía, hasta tener cuatro o cinco edificios repartidos.',
            'Segundo edificio de reclutamiento: arqueros si el primero era de infantería, y al revés.',
            'Un héroe barato que acompañe al primer ejército.',
            'Sube de nivel el edificio de reclutamiento principal y pide la primera mejora de armas o armaduras.',
          ],
        },
      ],
    },
    {
      id: 'team',
      title: 'Jugar en equipo (4 contra 4)',
      summary: 'Cómo ganar un 4 contra 4 sin ir cada uno por su lado.',
      blocks: [
        {
          kind: 'list',
          items: [
            'Hablad antes de empezar: quién presiona pronto, quién hace economía y quién lleva caballería para acudir a donde haga falta.',
            'Si un aliado pide ayuda, ve. Un 4 contra 4 se pierde jugador a jugador.',
            'No ataques solo a la base de alguien que tiene a otro al lado: os juntáis dos y le ganáis a uno.',
            'Avisad de lo que veis: «van cuatro trolls por el centro» vale oro.',
            'Si vas perdiendo, no abandones: tu ejército aún sirve en la base de un aliado.',
          ],
        },
      ],
    },
    {
      id: 'mistakes',
      title: 'Los errores de cada año',
      summary: 'Los errores que se repiten cada año.',
      blocks: [
        {
          kind: 'list',
          items: [
            'Edificios de economía pegados entre sí.',
            'Dinero acumulado sin gastar.',
            'No subir de nivel los edificios: te quedas con tropas básicas toda la partida.',
            'Llevar una sola clase de tropa. Sin picas, la caballería enemiga te arrasa; sin arqueros, no castigas.',
            'Dejar que la caballería se quede enganchada en el cuerpo a cuerpo.',
            'Mandar al héroe solo por delante. Los héroes mueren rápido rodeados.',
            'Olvidarse de los poderes y acabar con 30 puntos sin gastar.',
            'Atacar una base con murallas sin asedio.',
            'No mirar el minimapa y enterarte de que te atacan cuando ya ha caído media base.',
          ],
        },
      ],
    },
    {
      id: 'keys',
      title: 'Controles básicos',
      summary: 'Las teclas imprescindibles y la hoja con todas.',
      blocks: [
        {
          kind: 'list',
          items: [
            'Clic izquierdo selecciona y clic derecho da la orden: mover, atacar o usar.',
            'Ctrl + número guarda lo seleccionado como grupo, y el número lo vuelve a seleccionar. Alt + número además lleva la cámara hasta él.',
            'Q selecciona todo tu ejército, H te lleva a tu base y Espacio, al último aviso: donde te están atacando.',
            'La tecla º, a la izquierda del 1, abre el libro de poderes.',
            'Cada botón muestra su tecla al pasar el ratón: aprenderte las del edificio que más uses ahorra mucho tiempo.',
          ],
        },
        {
          kind: 'link',
          href: '/games/age-of-the-ring/hotkeys',
          label: 'Ver todas las teclas',
          text: 'Todas las teclas rápidas del juego en una sola página, agrupadas y con las imprescindibles marcadas.',
        },
      ],
    },
    {
      id: 'glossary',
      title: 'Glosario',
      summary: 'La jerga que oirás en las partidas.',
      blocks: [
        {
          kind: 'table',
          head: ['Lo oirás como', 'Qué es'],
          rows: [
            ['Eco', 'Los edificios de economía y lo que producen'],
            ['CP', 'Puntos de mando: el tope de ejército'],
            ['Spam', 'Sacar muchísimas tropas baratas'],
            ['Tech', 'Subir edificios de nivel para sacar tropas mejores'],
            ['Rush', 'Atacar muy pronto, antes de que el rival se monte'],
            ['Creeps', 'Criaturas neutrales del mapa que dan experiencia'],
            ['Counter', 'La tropa que gana a otra'],
            ['Micro', 'Manejar a mano tropas y héroes durante el combate'],
            ['Alternativa', 'Facción que sustituye a una principal en su mapa'],
          ],
        },
      ],
    },
  ],
};

export { AOTR_START_GUIDE };
