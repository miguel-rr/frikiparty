import type { HotkeyGroup } from '@/lib/wiki/guides/types';

/**
 * Every keyboard shortcut of the game, as the 10.0 install defines them:
 * the global ones from CommandMap.ini (rotwk/lang/English.big; Age of the
 * Ring doesn't override it) and the button ones from lotr.str (the letter
 * after "&"). Key names are those of a Spanish keyboard: KEY_TICK, the key
 * left of 1, is "º" there.
 */
const AOTR_HOTKEYS: HotkeyGroup[] = [
  {
    id: 'mouse',
    title: 'Ratón',
    entries: [
      { keys: [['Clic izq.']], action: 'Seleccionar', essential: true },
      {
        keys: [['Arrastrar']],
        action: 'Seleccionar todo lo que quede dentro del recuadro',
      },
      {
        keys: [['Clic dcho.']],
        action: 'Mover, atacar o usar',
        detail: 'Al revés si activáis el «control alternativo del ratón».',
        essential: true,
      },
      {
        keys: [['Doble clic']],
        action: 'Seleccionar las del mismo tipo que se ven en pantalla',
      },
      { keys: [['Rueda']], action: 'Acercar y alejar la cámara' },
    ],
  },
  {
    id: 'modifiers',
    title: 'Mantener pulsado',
    entries: [
      {
        keys: [['Mayús', 'Clic']],
        action: 'Añadir o quitar de la selección',
        essential: true,
      },
      {
        keys: [['Ctrl', 'Clic dcho.']],
        action: 'Forzar ataque',
        detail: 'Sobre suelo, edificios o aliados.',
      },
      {
        keys: [['Alt', 'Clic dcho.']],
        action: 'Encadenar órdenes',
        detail: 'Puntos de ruta: la unidad los sigue en orden.',
      },
    ],
  },
  {
    id: 'selection',
    title: 'Selección',
    entries: [
      { keys: [['Q']], action: 'Todo tu ejército', essential: true },
      {
        keys: [['E']],
        action: 'Todas las unidades del mismo tipo que las seleccionadas',
      },
      { keys: [['Ctrl', 'H']], action: 'Seleccionar un héroe' },
      {
        keys: [['Mayús', '← →']],
        action: 'Unidad anterior o siguiente',
      },
      {
        keys: [['Mayús', '↓ ↑']],
        action: 'Constructor anterior o siguiente',
      },
    ],
  },
  {
    id: 'groups',
    title: 'Grupos',
    entries: [
      {
        keys: [['Ctrl', '0–9']],
        action: 'Guardar la selección como grupo',
        essential: true,
      },
      { keys: [['0–9']], action: 'Seleccionar el grupo', essential: true },
      { keys: [['Mayús', '0–9']], action: 'Añadir la selección al grupo' },
      {
        keys: [['Alt', '0–9']],
        action: 'Seleccionar el grupo y centrar la cámara',
      },
    ],
  },
  {
    id: 'orders',
    title: 'Órdenes',
    entries: [
      { keys: [['S']], action: 'Detener' },
      {
        keys: [['A']],
        action: 'Atacar moviendo',
        detail: 'Avanza y pelea con todo lo que encuentre por el camino.',
        essential: true,
      },
      { keys: [['Ctrl', 'F']], action: 'Mantener la formación al moverse' },
      { keys: [['Supr']], action: 'Vender o derribar el edificio' },
      { keys: [['Ctrl', 'C']], action: 'Vítores de tus tropas' },
    ],
  },
  {
    id: 'stances',
    title: 'Actitud',
    entries: [
      {
        keys: [['D']],
        action: 'Agresiva',
        detail:
          'Más daño (en torno a +25 %) y menos armadura. Ataca a todo lo que ve.',
      },
      { keys: [['F']], action: 'Batalla: la normal, sin bonificaciones' },
      {
        keys: [['G']],
        action: 'Mantener posición',
        detail:
          'Más armadura (en torno a +25 %) y menos daño. No sale a buscar enemigos.',
      },
    ],
  },
  {
    id: 'camera',
    title: 'Cámara',
    entries: [
      { keys: [['H']], action: 'Ir a tu base', essential: true },
      {
        keys: [['Espacio']],
        action: 'Ir al último aviso',
        detail: 'Donde te acaban de atacar.',
        essential: true,
      },
      { keys: [['← ↑ → ↓']], action: 'Mover la cámara' },
      { keys: [['5 (num.)']], action: 'Volver a la cámara normal' },
      { keys: [['Ctrl', 'F1–F8']], action: 'Guardar un punto del mapa' },
      { keys: [['F1–F8']], action: 'Ir a ese punto' },
    ],
  },
  {
    id: 'interface',
    title: 'Interfaz',
    entries: [
      {
        keys: [['º']],
        action: 'Libro de poderes',
        detail: 'La tecla a la izquierda del 1.',
        essential: true,
      },
      { keys: [['Esc']], action: 'Menú y opciones' },
      { keys: [['Tab']], action: 'Diplomacia' },
      { keys: [['F9']], action: 'Ocultar o mostrar la barra de mando' },
      { keys: [['F12']], action: 'Captura de pantalla' },
    ],
  },
  {
    id: 'chat',
    title: 'Chat y señales',
    entries: [
      { keys: [['Retroceso']], action: 'Escribir a tus aliados' },
      { keys: [['Intro']], action: 'Escribir a todos' },
      {
        keys: [['Ctrl', 'B']],
        action: 'Poner una señal en el mapa',
        detail: 'Tus aliados la ven en el minimapa.',
      },
    ],
  },
  {
    id: 'upgrades',
    title: 'Mejoras de las tropas',
    note: 'Las de casi todas las facciones. Ante la duda, cada botón muestra su tecla al pasar el ratón.',
    entries: [
      { keys: [['V']], action: 'Estandartes: el batallón sube a nivel 2' },
      { keys: [['C']], action: 'Armas forjadas: más daño cuerpo a cuerpo' },
      { keys: [['T']], action: 'Armadura pesada: mucho menos daño recibido' },
    ],
  },
];

export { AOTR_HOTKEYS };
