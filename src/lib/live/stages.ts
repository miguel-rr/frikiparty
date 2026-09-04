import {
  stageIndex,
  TOURNAMENT_STAGES,
  type TournamentStage,
} from '@/lib/tournament/stages';

type StageMeta = {
  /** Short name on the timeline. */
  label: string;
  /** Headline for the live block ("¿Qué está pasando?"). */
  title: string;
  /** "¿Qué toca ahora?" in the Council's register. */
  next: string;
};

const STAGE_META: Record<TournamentStage, StageMeta> = {
  setup: {
    label: 'Preparación',
    title: 'El Concilio prepara el torneo',
    next: 'El organizador cierra la lista de participantes y da comienzo.',
  },
  voting: {
    label: 'Votación',
    title: 'Votación abierta',
    next: 'Cada participante envía su ranking personal. Cuando todos hayan hablado, el Concilio deliberará.',
  },
  ranking_review: {
    label: 'Ranking',
    title: 'El Concilio delibera',
    next: 'El ranking del torneo se está cerrando. Después vendrán los bombos.',
  },
  pots_review: {
    label: 'Bombos',
    title: 'Se forjan los bombos',
    next: 'Cuando los bombos sean definitivos, sus cabezas de serie serán capitanes.',
  },
  formation: {
    label: 'Equipos',
    title: 'Se forman los equipos',
    next: 'Los capitanes eligen. Sigue la sala en directo.',
  },
  teams_ready: {
    label: 'Equipos listos',
    title: 'Los equipos están hechos',
    next: 'El calendario se está forjando. Pronto, la primera jornada.',
  },
  phase_setup: {
    label: 'Calendario',
    title: 'El calendario toma forma',
    next: 'El organizador revisa los cruces. En cuanto los confirme, arranca el torneo.',
  },
  in_progress: {
    label: 'En juego',
    title: 'El torneo está en marcha',
    next: 'Sigue los partidos, la clasificación y el cuadro en directo.',
  },
  completed: {
    label: 'Campeón',
    title: 'Hay campeón',
    next: 'El torneo ha terminado. Los anillos ya tienen dueño.',
  },
};

/** Stages shown on the public timeline (setup is private). */
const PUBLIC_STAGES = TOURNAMENT_STAGES.filter((stage) => stage !== 'setup');

export { PUBLIC_STAGES, STAGE_META, type StageMeta, stageIndex };
