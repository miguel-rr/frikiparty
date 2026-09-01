/**
 * Card backdrops: public-domain art from Wikimedia Commons in Middle-earth
 * spirit, all naturally dark. Two families, interleaved for variety:
 * romantic paintings (John Martin, Böcklin, Joseph Wright, C. D.
 * Friedrich, Luca Giordano) and the illustrators behind Tolkien's visual
 * tradition — Arthur Rackham (the Ring of the Nibelung, Nibelheim's
 * dwarves), Ferdinand Leeke and A. P. Ryder (Wagner scenes), N. C. Wyeth
 * (The Boy's King Arthur), Viktor Vasnetsov (dragons and bogatyrs) and
 * the Nordic troll painters Kittelsen and Bauer. A scene never repeats
 * within 32 consecutive cards.
 */
/**
 * `position` frames the image's important area (CSS background-position);
 * `zoom` widens the image beyond the card (percentage of card width) to
 * crop away scanned paper margins on engravings and book plates.
 */
type Scene = { file: string; alt: string; position?: string; zoom?: number };

const SCENES: Scene[] = [
  {
    file: 'crossroads',
    alt: 'El caballero en la encrucijada',
    position: 'center 45%',
  },
  {
    file: 'black-dragon',
    alt: 'El dragón negro sobre el héroe',
    position: 'center 35%',
  },
  {
    file: 'soria-moria',
    alt: 'El palacio dorado a lo lejos',
    position: 'center 30%',
  },
  {
    file: 'excalibur',
    alt: 'La espada surgiendo del lago',
    position: 'center 55%',
  },
  {
    file: 'forest-troll',
    alt: 'El troll del bosque bajo la luna',
    position: 'center 55%',
  },
  {
    file: 'hero-forge',
    alt: 'La espada reforjada en la caverna',
    position: 'center 32%',
  },
  {
    file: 'watcher-water',
    alt: 'El vigilante del agua',
    position: 'center 42%',
  },
  { file: 'wrath', alt: 'Paisaje de fuego y ruina', position: 'center 45%' },
  {
    file: 'dwarf-hoard',
    alt: 'El tesoro de los enanos en la caverna',
    position: 'center 60%',
    zoom: 106,
  },
  { file: 'dragon', alt: 'El dragón en su guarida', position: 'center 35%' },
  {
    file: 'echo',
    alt: 'La barca en el lago entre montañas',
    position: 'center 72%',
  },
  {
    file: 'last-battle',
    alt: 'La última batalla al ocaso',
    position: 'center 62%',
  },
  {
    file: 'nibelheim',
    alt: 'Los enanos bajo el árbol retorcido',
    position: 'center 65%',
    zoom: 106,
  },
  {
    file: 'deep-forest',
    alt: 'El corazón verde del bosque',
    position: 'center 60%',
  },
  {
    file: 'trolls-hall',
    alt: 'La princesa entre trolls',
    position: 'center 76%',
    zoom: 106,
  },
  {
    file: 'forge-volcano',
    alt: 'La fragua en el corazón del volcán',
    position: 'center 45%',
  },
  {
    file: 'night-rider',
    alt: 'El jinete junto al río a la luz de la luna',
    position: 'center 55%',
  },
  {
    file: 'giants-quarrel',
    alt: 'La pelea de los gigantes',
    position: 'center 30%',
    zoom: 108,
  },
  {
    file: 'sword-hall',
    alt: 'La espada en el salón oscuro',
    position: 'center 40%',
  },
  { file: 'marshes', alt: 'La isla de los muertos', position: 'center 45%' },
  {
    file: 'three-riders',
    alt: 'Los tres jinetes oteando la frontera',
    position: 'center 45%',
  },
  {
    file: 'ash-troll',
    alt: 'El troll asomando sobre el bosque',
    position: 'center 40%',
  },
  {
    file: 'pandemonium',
    alt: 'La fortaleza del enemigo',
    position: 'center 45%',
  },
  {
    file: 'norns',
    alt: 'Las hilanderas del destino',
    position: 'center 45%',
    zoom: 106,
  },
  {
    file: 'knights-parley',
    alt: 'Parlamento de caballeros ante el castillo',
    position: 'center 45%',
  },
  {
    file: 'dark-tarn',
    alt: 'El estanque oscuro del bosque',
    position: 'center 58%',
  },
  { file: 'grotto', alt: 'Una gruta en penumbra', position: 'center 55%' },
  {
    file: 'sword-forged',
    alt: 'La espada recién forjada',
    position: 'center 30%',
    zoom: 106,
  },
  {
    file: 'oakwood',
    alt: 'Bosque de robles en la niebla',
    position: 'center 52%',
  },
  {
    file: 'wild-wood',
    alt: 'El corazón del bosque salvaje',
    position: 'center 35%',
    zoom: 106,
  },
  { file: 'volcano', alt: 'La montaña en erupción', position: 'center 40%' },
  {
    file: 'troll-lurking',
    alt: 'El troll acechando en la costa',
    position: 'center 45%',
    zoom: 112,
  },
];

const sceneStyle = (scene: Scene) => ({
  backgroundImage: `linear-gradient(180deg, rgba(10,15,12,0.78) 0%, rgba(10,15,12,0.58) 45%, rgba(10,15,12,0.84) 100%), url(/design/scenes/${scene.file}.jpg)`,
  backgroundPosition: scene.position ?? 'center',
  backgroundSize: scene.zoom ? `${scene.zoom}% auto` : 'cover',
});

/** Scene for one edition given its position in the newest-first timeline. */
const sceneForIndex = (index: number): Scene =>
  SCENES[index % SCENES.length] as Scene;

export { SCENES, type Scene, sceneForIndex, sceneStyle };
