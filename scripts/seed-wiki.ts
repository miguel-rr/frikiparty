import { and, eq } from 'drizzle-orm';

import { TIER_COST, TIER_POSITIONS } from '@/lib/wiki/labels';
import type { PowerPosition } from '@/lib/wiki/types';
import { db } from '@/server/db';
import {
  faction,
  factionHero,
  factionPower,
  factionRevision,
  factionStructure,
  factionUnit,
  game,
  gameMap,
  gameVersion,
} from '@/server/db/schema';
import { publicUrl } from '@/server/storage/r2';

import { gondor } from './wiki-data/aotr-gondor';
import { misty } from './wiki-data/aotr-misty';
import { CRESTS } from './wiki-data/crests';
import type { FactionData, PowerData, UnitData } from './wiki-data/types';

/**
 * The games wiki, seeded: Age of the Ring's pages, its versions with
 * dates and notes, the alternate factions, the 9.3.0 maps, and full
 * revisions (every unit, hero, structure and power, with numbers and
 * images) for Gondor and Misty Mountains at 9.2.0, plus 9.3.0 revisions
 * that apply what that patch changed. Idempotent: `pnpm run db:seed:wiki`
 * (and `:prod`). Images must be in R2 first: `pnpm run wiki:images`.
 *
 * Facts (names, costs, requirements, what each patch changed) come from
 * the mod's own announcements on ModDB and the community wiki
 * (aotr.fandom.com, CC BY-SA); the prose is ours, in Spanish.
 */

const AOTR_URL =
  'https://www.moddb.com/mods/the-horse-lords-a-total-modification-for-bfme';
const NEWS_92 = `${AOTR_URL}/news/age-of-the-ring-92-released`;
const BALANCE_92 = `${AOTR_URL}/news/balance-changes-in-92`;
const NEWS_93 = `${AOTR_URL}/news/age-of-the-ring-93-released`;

type RevisionText = {
  version: string;
  summary: string;
  overview: string;
  strengths: string[];
  weaknesses: string[];
  changes: string;
  ringHero?: string;
  sourceUrl: string;
};

type Revision = RevisionText & { data: FactionData };

// ------------------------------------------------------------ image keys

/** Where the image pipeline puts each picture (see scripts/sync-wiki-images.ts). */
const imageKey = (
  code: string,
  kind: 'units' | 'heroes' | 'structures' | 'powers',
  slug: string,
  variant: '' | '-portrait' = '',
) => `wiki/aotr/${code}/${kind}/${slug}${variant}.webp`;

const crestKey = (code: string) => `wiki/aotr/${code}/logo.webp`;

// ------------------------------------------------------------- 9.3.0 patch

/** Fire-drakes reworked, Golfimbul remodelled, drakes no longer gated. */
const mistyPatch930 = (data: FactionData): FactionData => ({
  ...data,
  units: data.units.map((unit): UnitData => {
    if (unit.slug === 'fire-wyrm') {
      return {
        ...unit,
        requirements: undefined,
        attackType: 'Cuerpo a cuerpo en área y aliento de fuego',
        description:
          'Rehechos en la 9.3.0 con modelo nuevo: luchan cuerpo a cuerpo y escupen fuego cada 20 s, anulan liderazgos con la Mirada temible y lanzan bolas de fuego a distancia. Ya no necesitan Prole del Norte; siguen limitados a dos (cuatro con la mejora).',
        abilities: [
          {
            name: 'Aliento de fuego',
            level: null,
            hotkey: 'W',
            kind: 'toggle',
            description:
              'Cada 20 s el dragón escupe fuego con sus ataques. Se puede desactivar.',
            stats: { cooldownS: 20 },
          },
          {
            name: 'Mirada temible',
            level: null,
            hotkey: 'R',
            kind: 'active',
            description:
              'Anula el liderazgo de los enemigos cercanos durante 15 s.',
            stats: { durationS: 15 },
          },
          {
            name: 'Chorro de llamas',
            level: 2,
            hotkey: 'T',
            kind: 'active',
            description: 'Una bola de fuego devastadora a larga distancia.',
          },
          ...(unit.abilities ?? []).filter(
            (a) => a.name === 'Recuperación monstruosa',
          ),
        ],
      };
    }
    return unit;
  }),
  structures: data.structures.map((s) =>
    s.slug === 'wyrm-lair'
      ? {
          ...s,
          description:
            'Doma dragones: Dragón de fuego a nivel 1 (desde la 9.3.0 sin necesitar Prole del Norte) y Dragón frío a nivel 2. A nivel 3 cura a los dragones cercanos.',
        }
      : s,
  ),
  heroes: data.heroes.map((h) =>
    h.slug === 'golfimbul'
      ? {
          ...h,
          description: `${h.description} Modelo y retrato nuevos en la 9.3.0.`,
        }
      : h,
  ),
});

// ---------------------------------------------------------------- Gondor

const gondorText: RevisionText = {
  version: '9.2.0',
  summary: 'La facción versátil: no destaca en nada y sirve para todo.',
  overview: `Gondor es el reino del sur de los númenóreanos en el exilio, la primera línea contra Mordor mientras espera a su rey. En Age of the Ring es la facción estándar y versátil: empieza con los feudos (Lamedon, Linhir, Raíz Negra, Pinnath Gelin), pasa a las tropas de Minas Tirith en el nivel 2 y remata con Montaraces de Ithilien, Caballeros y, por el libro de poderes, Dol Amroth.

Sus arqueros y su caballería son buenos sin ser los mejores (Lórien y Rohan los superan). A cambio tiene la mejor defensa del juego: Cantero, Beregond y Guardias de la Fuente hacen de una base de Gondor un asedio muy caro. Los héroes cubren todos los papeles, de Pippin a Gandalf el Blanco, y el nivel 4 trae a Elessar.`,
  strengths: [
    'Versátil: buenas espadas, picas, arcos y caballería',
    'La facción más defensiva del juego',
    'Héroes para cualquier plan, incluido Gandalf el Blanco',
  ],
  weaknesses: [
    'No es la mejor en nada: Lórien la supera a distancia y Rohan a caballo',
    'Los feudos del principio son frágiles frente a facciones agresivas',
  ],
  changes: `Cambios de la 9.2.0 respecto a la 9.1:

Elessar, la invocación de nivel 4, baja la velocidad desmontado de 60 a 55 y su Estel pasa de liderazgo pasivo a habilidad activa con enfriamiento, en la línea de Durin el Inmortal.

Ingeniería númenóreana (invocación de nivel 2) dura menos y es más vulnerable a espadas, a cambio de poder alcanzar objetivos más cercanos al trabuquete.

El liderazgo de Boromir, Capitán de la Torre Blanca, está activo desde el nivel 1.

Además llega Dol Amroth como facción alternativa y, para todas las facciones, los tiempos y costes para subir de nivel las estructuras bajan.`,
  ringHero: 'Frodo',
  sourceUrl: BALANCE_92,
};

const gondor920: Revision = { ...gondorText, data: gondor };

const gondor930: Revision = {
  ...gondorText,
  version: '9.3.0',
  changes: `Cambios de la 9.3.0 respecto a la 9.2.0:

Solo ajustes menores de equilibrio, sin reworks. El detalle exacto está en el changelog del Launcher del mod, no en las notas públicas. Las unidades, héroes, estructuras y poderes son los mismos que en la 9.2.0.

En el juego en general: nuevos mapas (Dunland rehecho a 4 jugadores, Emyn Dawath a 6, Mirror Rushes 1v1) y la IA de escaramuza aprende a contraatacar al spam con unidades antispam.`,
  sourceUrl: NEWS_93,
  data: gondor,
};

// ------------------------------------------------------- Misty Mountains

const mistyText: RevisionText = {
  version: '9.2.0',
  summary: 'La marea: orcos baratos por todas partes y bestias para rematar.',
  overview: `Las Montañas Nubladas son una fuerza primitiva de orcos y bestias. Empieza con los orcos de Moria, baratísimos y rápidos, o con los orcos de las montañas, más caros y más duros, y se apoya en una colección de criaturas: wargos y lobos para acosar, troles para asediar y romper líneas, murciélagos para atacar desde el aire y dragones para quemar hordas.

La red de túneles y la Lealtad salvaje (control de guaridas neutrales) le dan movilidad y control del mapa. Casi siempre supera en número al rival; la clave es usar esa masa para no dejarle desarrollarse.`,
  strengths: [
    'Spam de unidades como ninguna otra facción',
    'Movilidad por la red de túneles',
    'Bestias de todo tipo: troles, murciélagos, dragones',
  ],
  weaknesses: [
    'La partida larga se complica si el rival se desarrolla o aguanta los ataques',
    'Las tropas básicas son muy débiles, sobre todo frente a caballería',
  ],
  changes: `Cambios de la 9.2.0 respecto a la 9.1:

¡Ya vienen! (invocación de nivel 2) pasa de 4 goblins permanentes a 2: era demasiado peligroso para las estructuras de producción enemigas siendo un nivel 2.

El Gusano (nivel 3) ya no pierde el objetivo que se le ordena atacar; a cambio se le baja la resistencia y el daño.

Para todas las facciones bajan los tiempos y costes de subir de nivel las estructuras.`,
  ringHero: 'Smaug',
  sourceUrl: BALANCE_92,
};

const misty920: Revision = { ...mistyText, data: misty };

const misty930: Revision = {
  ...mistyText,
  version: '9.3.0',
  changes: `Cambios de la 9.3.0 respecto a la 9.2.0:

Los dragones de fuego se rehacen por completo: modelo nuevo y habilidades nuevas (Mirada temible y Chorro de llamas). Ahora atacan cuerpo a cuerpo y escupen fuego cada cierto tiempo. La Guarida de wyrms ya no necesita la mejora Prole del Norte para criarlos.

Golfimbul estrena modelo y arte 2D.

Ajustes menores de equilibrio (changelog del Launcher).`,
  sourceUrl: NEWS_93,
  data: mistyPatch930(misty),
};

// ---------------------------------------------------------------- seeding

/** The powers of the tier above that each slot links to, as drawn in the in-game book. */
const LINKS: Record<number, Partial<Record<PowerPosition, PowerPosition[]>>> = {
  2: { LL: ['L'], LR: ['L', 'C'], RL: ['C', 'R'], RR: ['R'] },
  3: { L: ['LL', 'LR'], C: ['LR', 'RL'], R: ['RL', 'RR'] },
  4: { L: ['L', 'C'], R: ['C', 'R'] },
};

const requiresOf = (power: PowerData, all: PowerData[]) =>
  (LINKS[power.tier]?.[power.position] ?? [])
    .map(
      (pos) =>
        all.find((p) => p.tier === power.tier - 1 && p.position === pos)?.name,
    )
    .filter((name): name is string => Boolean(name));

/** Powers sorted as the book reads: tier by tier, left to right. */
const sortPowers = (powers: PowerData[]) =>
  [...powers].sort(
    (a, b) =>
      a.tier - b.tier ||
      (TIER_POSITIONS[a.tier] ?? []).indexOf(a.position) -
        (TIER_POSITIONS[b.tier] ?? []).indexOf(b.position),
  );

const upsertRevision = async (
  rev: Revision,
  factionId: string,
  versionId: string,
) => {
  const { data } = rev;
  const code = data.code;
  const [existing] = await db
    .select({ id: factionRevision.id })
    .from(factionRevision)
    .where(
      and(
        eq(factionRevision.factionId, factionId),
        eq(factionRevision.gameVersionId, versionId),
      ),
    );
  const values = {
    factionId,
    gameVersionId: versionId,
    summary: rev.summary,
    overview: rev.overview,
    strengths: rev.strengths,
    weaknesses: rev.weaknesses,
    changes: rev.changes,
    ringHero: rev.ringHero ?? null,
    sourceUrl: rev.sourceUrl,
    updatedAt: new Date(),
  };
  let id = existing?.id;
  if (id) {
    await db
      .update(factionRevision)
      .set(values)
      .where(eq(factionRevision.id, id));
    for (const table of [
      factionHero,
      factionUnit,
      factionStructure,
      factionPower,
    ]) {
      await db.delete(table).where(eq(table.revisionId, id));
    }
  } else {
    const [row] = await db
      .insert(factionRevision)
      .values(values)
      .returning({ id: factionRevision.id });
    id = row?.id;
  }
  if (!id) throw new Error('No se pudo crear la revisión');
  const rid = id;

  if (data.heroes.length) {
    await db.insert(factionHero).values(
      data.heroes.map((h, i) => ({
        revisionId: rid,
        name: h.name,
        title: h.title ?? null,
        recruitedAt: h.recruitedAt ?? null,
        cost: h.cost ?? null,
        buildTimeSeconds: h.buildTime ?? null,
        health: h.health ?? null,
        armourSet: h.armourSet ?? null,
        attackType: h.attackType ?? null,
        isSummon: h.isSummon ?? false,
        description: h.description,
        abilities: h.abilities,
        stats: h.stats ?? {},
        imageUrl: h.images?.ingame
          ? publicUrl(imageKey(code, 'heroes', h.slug))
          : null,
        portraitUrl: h.images?.portrait
          ? publicUrl(imageKey(code, 'heroes', h.slug, '-portrait'))
          : null,
        sortOrder: i,
      })),
    );
  }
  if (data.units.length) {
    await db.insert(factionUnit).values(
      data.units.map((u, i) => ({
        revisionId: rid,
        name: u.name,
        category: u.category,
        recruitedAt: u.recruitedAt ?? null,
        requirements: u.requirements ?? null,
        cost: u.cost ?? null,
        commandPoints: u.cp ?? null,
        health: u.health ?? null,
        buildTimeSeconds: u.buildTime ?? null,
        armourSet: u.armourSet ?? null,
        attackType: u.attackType ?? null,
        maxCount: u.maxCount ?? null,
        isSummon: u.isSummon ?? false,
        strongAgainst: u.strongAgainst ?? [],
        weakAgainst: u.weakAgainst ?? [],
        description: u.description ?? null,
        abilities: u.abilities ?? [],
        upgrades: u.upgrades ?? [],
        stats: u.stats ?? {},
        imageUrl: u.images?.ingame
          ? publicUrl(imageKey(code, 'units', u.slug))
          : null,
        portraitUrl: u.images?.portrait
          ? publicUrl(imageKey(code, 'units', u.slug, '-portrait'))
          : null,
        sortOrder: i,
      })),
    );
  }
  if (data.structures.length) {
    await db.insert(factionStructure).values(
      data.structures.map((s, i) => ({
        revisionId: rid,
        name: s.name,
        kind: s.kind,
        cost: s.cost ?? null,
        buildTimeSeconds: s.buildTime ?? null,
        health: s.health ?? null,
        healthByLevel: s.healthByLevel ?? [],
        armourSet: s.armourSet ?? null,
        maxCount: s.maxCount ?? null,
        description: s.description ?? null,
        bonus: s.bonus ?? null,
        produces: s.produces ?? [],
        upgrades: s.upgrades ?? [],
        abilities: s.abilities ?? [],
        stats: s.stats ?? {},
        imageUrl: s.images?.ingame
          ? publicUrl(imageKey(code, 'structures', s.slug))
          : null,
        sortOrder: i,
      })),
    );
  }
  if (data.powers.length) {
    const powers = sortPowers(data.powers);
    await db.insert(factionPower).values(
      powers.map((p, i) => ({
        revisionId: rid,
        name: p.name,
        tier: p.tier,
        cost: TIER_COST[p.tier] ?? null,
        position: p.position,
        kind: p.kind ?? null,
        requires: requiresOf(p, powers),
        description: p.description,
        stats: p.stats ?? {},
        imageUrl: publicUrl(imageKey(code, 'powers', p.slug)),
        sortOrder: i,
      })),
    );
  }
  console.log(`Revisión ${code} @ ${rev.version}`);
};

const upsertAlternate = async (
  name: string,
  code: string,
  versionId: string,
  transformsCode: string | null,
) => {
  const [existing] = await db
    .select({ id: faction.id })
    .from(faction)
    .where(eq(faction.code, code));
  const transforms = transformsCode
    ? ((
        await db
          .select({ id: faction.id })
          .from(faction)
          .where(eq(faction.code, transformsCode))
      )[0]?.id ?? null)
    : null;
  if (existing) {
    await db
      .update(faction)
      .set({ name, kind: 'alternate', transformsFactionId: transforms })
      .where(eq(faction.id, existing.id));
    return;
  }
  await db.insert(faction).values({
    name,
    code,
    kind: 'alternate',
    introducedInVersionId: versionId,
    transformsFactionId: transforms,
    sortOrder: 100,
  });
  console.log(`Facción alternativa: ${name}`);
};

const main = async () => {
  const [aotr] = await db
    .select({ id: game.id })
    .from(game)
    .where(eq(game.name, 'Age of the Ring'));
  if (!aotr) throw new Error('Siembra primero el catálogo (db:seed:catalog).');
  await db
    .update(game)
    .set({
      slug: 'age-of-the-ring',
      websiteUrl: AOTR_URL,
      description: `Age of the Ring es el mod de La Batalla por la Tierra Media II: El Resurgir del Rey Brujo con el que jugamos el torneo principal desde hace años. Reescribe el juego entero: once facciones principales fieles a los libros, facciones alternativas ligadas a mapas concretos, un libro de poderes por facción y un equilibrio pensado para el multijugador.

Aquí guardamos cada versión que hemos jugado y cómo eran las facciones en ese momento, para que el histórico de cada jugador con cada facción tenga contexto.`,
    })
    .where(eq(game.id, aotr.id));
  await db
    .update(game)
    .set({ slug: 'battle-for-middle-earth-ii' })
    .where(eq(game.name, 'Battle for Middle-earth II'));

  const versions = await db
    .select()
    .from(gameVersion)
    .where(eq(gameVersion.gameId, aotr.id));
  const v920 = versions.find((v) => v.version === '9.2.0');
  const v930 = versions.find((v) => v.version === '9.3.0');
  if (!v920 || !v930) throw new Error('Faltan las versiones 9.2.0 y 9.3.0.');
  await db
    .update(gameVersion)
    .set({
      releasedAt: '2025-12-02',
      changelogUrl: NEWS_92,
      notes: `La versión de la edición 2025. Trae Dol Amroth como facción alternativa, una IA de escaramuza rehecha (menos rush a granjas, más batalla de unidades), el arreglo definitivo del error de Crea tu héroe y la primera versión del gestor de submods en el Launcher.

En equilibrio: bajan los tiempos y costes de subir de nivel las estructuras en casi todas las facciones; Elessar pierde velocidad y Estel pasa a activa; las invocaciones de nivel 2 que amenazaban bases (Ingeniería númenóreana, ¡Ya vienen!, Malicia retorcida) se recortan; el Gusano deja de perder el objetivo; la Torre de vigilancia sureña genera recursos; Gwanthaur mejora; Dol Guldur recibe mejoras generales y Rohan gana producción sin gastar radio de economía, mejores Jinetes de Snowbourn y un Jabalí de Everholt más decidido.`,
    })
    .where(eq(gameVersion.id, v920.id));
  await db
    .update(gameVersion)
    .set({
      releasedAt: '2026-04-25',
      changelogUrl: NEWS_93,
      notes: `La versión de la edición 2026 y la última de la serie 9.x: la siguiente será la 10.0 con El Retorno del Rey. Trae la Hueste del Oeste como facción alternativa (la Última Alianza), la campaña de El Resurgir del Rey Brujo en modo Guerra del Anillo, un rework extenso de Angmar (tres héroes nuevos: Naglur, Carghul y Akhorahil; habilidades nuevas para el Rey Brujo y Nauroth; unidades y poderes nuevos), los dragones de fuego rehechos, modelos nuevos para los Salvajes de Dunland, Golfimbul y las tropas de Ciudad del Lago, tres mapas (Dunland a 4 jugadores, Emyn Dawath a 6 y Mirror Rushes 1v1) y una IA que responde al spam con unidades antispam.

En equilibrio: ajustes menores en todas las facciones, detallados solo en el changelog del Launcher.`,
    })
    .where(eq(gameVersion.id, v930.id));

  // Alternate factions and their versions.
  await upsertAlternate('Angmar', 'angmar', v920.id, null);
  await upsertAlternate('Arnor', 'arnor', v920.id, null);
  await upsertAlternate('Rhûn', 'rhun', v920.id, null);
  await upsertAlternate('Dol Amroth', 'dolAmroth', v920.id, 'gondor');
  await upsertAlternate('Hueste del Oeste', 'hostOfTheWest', v930.id, null);

  // Maps that came with 9.3.0.
  for (const map of [
    {
      name: 'Dunland',
      players: 4,
      description: 'Rehecho en 9.3.0, ahora para 4 jugadores.',
    },
    { name: 'Emyn Dawath', players: 6, description: 'Nuevo en 9.3.0.' },
    {
      name: 'Mirror Rushes',
      players: 2,
      description: 'Nuevo en 9.3.0, pensado para 1v1.',
    },
  ]) {
    await db
      .insert(gameMap)
      .values({
        gameId: aotr.id,
        name: map.name,
        players: map.players,
        introducedInVersionId: v930.id,
        description: map.description,
      })
      .onConflictDoUpdate({
        target: [gameMap.gameId, gameMap.name],
        set: {
          players: map.players,
          introducedInVersionId: v930.id,
          description: map.description,
        },
      });
  }

  for (const code of Object.keys(CRESTS)) {
    await db
      .update(faction)
      .set({ imageUrl: publicUrl(crestKey(code)) })
      .where(eq(faction.code, code));
  }

  for (const rev of [gondor920, gondor930, misty920, misty930]) {
    const code = rev.data.code;
    const [row] = await db
      .select({ id: faction.id })
      .from(faction)
      .where(eq(faction.code, code));
    if (!row) throw new Error(`Falta la facción ${code}`);
    await upsertRevision(
      rev,
      row.id,
      rev.version === '9.2.0' ? v920.id : v930.id,
    );
  }
  console.log('Wiki sembrada.');
  process.exit(0);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
