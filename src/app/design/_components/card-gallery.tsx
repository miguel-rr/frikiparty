import { Section, SectionHeader, tag } from '@/components/theme/primitives';
import { PortraitCard } from '@/components/tournament/portrait-card';
import { dealCardSpecs } from '@/lib/tournament/card-lore';
import { RANKING } from '../fixtures';

/**
 * Showcase: one card per known player (plus two placeholder recruits),
 * with real ring totals where history has them. Abilities and flavour
 * texts are dealt from the AotR/frikiparty lore deck on every reload.
 */

/** DB players without titles yet — not present in the historical ranking. */
const UNTITLED_PLAYERS = [
  'Armonds',
  'Chete',
  'Erimo',
  'Gusnik',
  'Ita',
  'Periko',
];

const PLACEHOLDER_PLAYERS = ['Nuevo Fichaje', 'La Promesa'];

const GALLERY = [
  ...RANKING.map((player) => ({
    name: player.name,
    rings: player.rings,
    individualRings: player.individualRings,
  })),
  ...[...UNTITLED_PLAYERS, ...PLACEHOLDER_PLAYERS].map((name) => ({
    name,
    rings: 0,
    individualRings: 0,
  })),
];

const CardGallery = () => {
  const cards = dealCardSpecs(GALLERY);
  return (
    <Section id="cards">
      <SectionHeader
        eyebrowText="Sistema de cartas"
        lead="Una carta por jugador: retrato fijo por raza, anillos reales, y habilidades repartidas del spellbook de Age of the Ring y del lore de la frikiparty — recarga la página y cambia la mano."
        title="La Baraja del Concilio"
      />
      <div className="flex flex-col items-center gap-7">
        <span className={tag}>
          {GALLERY.length} cartas · el mazo se baraja en cada carga
        </span>
        <ul className="flex flex-wrap justify-center gap-5">
          {cards.map((card) => (
            <li key={card.name}>
              <PortraitCard card={card} className="w-[195px]" />
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
};

export { CardGallery };
