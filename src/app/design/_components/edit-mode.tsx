'use client';

import { useState } from 'react';
import { MATCH_DETAIL, TEAMS } from '@/app/design/fixtures';
import {
  btn,
  input,
  label,
  Meeple,
  panel,
  Section,
  SectionHeader,
  tag,
} from '@/components/theme/primitives';
import { FACTIONS, type FactionId } from '@/lib/tournament/factions';

/**
 * Organizer-only controls, live specimens: segmented controls, steppers and
 * toggles hold real state. The game recorder follows the domain model
 * (core-logic, "Facciones"): every PLAYER picks their own faction per
 * partida — never one faction per team.
 */

const FACTION_IDS = Object.keys(FACTIONS) as FactionId[];

const Segmented = ({
  name,
  onChange,
  options,
  value,
}: {
  name: string;
  onChange: (option: string) => void;
  options: string[];
  value: string;
}) => (
  <fieldset
    aria-label={name}
    className="inline-flex max-w-full flex-wrap gap-0.5 rounded-full border border-(--hair) bg-(--night-2) p-0.75"
  >
    {options.map((option) => (
      <button
        className={`rounded-full px-4 py-1.5 font-bold text-sm transition-colors ${
          option === value
            ? 'bg-linear-to-b from-(--gold-hi) to-(--gold) text-[#211803]'
            : 'text-(--faded) hover:text-(--parchment)'
        }`}
        key={option}
        onClick={() => onChange(option)}
        type="button"
      >
        {option}
      </button>
    ))}
  </fieldset>
);

const Stepper = ({ initial, min = 1 }: { initial: number; min?: number }) => {
  const [value, setValue] = useState(initial);
  return (
    <div className="inline-flex items-center gap-3">
      <button
        aria-label="Restar uno"
        className="inline-flex size-8 items-center justify-center rounded-full border border-(--hair) bg-(--panel-2) font-extrabold text-(--gold) transition-colors hover:border-(--hair-gold)"
        onClick={() => setValue((current) => Math.max(min, current - 1))}
        type="button"
      >
        −
      </button>
      <span className="w-6 text-center font-bold font-mono text-lg">
        {value}
      </span>
      <button
        aria-label="Sumar uno"
        className="inline-flex size-8 items-center justify-center rounded-full border border-(--hair) bg-(--panel-2) font-extrabold text-(--gold) transition-colors hover:border-(--hair-gold)"
        onClick={() => setValue((current) => current + 1)}
        type="button"
      >
        +
      </button>
    </div>
  );
};

const Toggle = ({ initial, text }: { initial: boolean; text: string }) => {
  const [checked, setChecked] = useState(initial);
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4">
      <span className="font-bold text-sm">{text}</span>
      <input
        checked={checked}
        className="d-toggle"
        onChange={(event) => setChecked(event.target.checked)}
        type="checkbox"
      />
    </label>
  );
};

/** One side of the recorder: a faction select PER PLAYER (domain rule). */
const FactionSideEditor = ({
  color,
  defaults,
  players,
  sideId,
}: {
  color: string;
  defaults: readonly string[];
  players: string[];
  sideId: string;
}) => (
  <div className="flex flex-col gap-2.5">
    <span className="flex items-center gap-2 font-bold font-mono text-(--faded) text-2xs uppercase tracking-2xl">
      <Meeple color={color} size={13} />
      Facción de cada jugador
    </span>
    {players.map((player, index) => {
      const selectId = `faction-${sideId}-${player}`;
      return (
        <div className="flex items-center gap-3" key={player}>
          <label
            className="w-20 flex-none font-bold text-sm"
            htmlFor={selectId}
          >
            {player}
          </label>
          <select
            className={`${input} d-select py-1.5 pr-9 text-sm`}
            defaultValue={defaults[index] ?? 'gondor'}
            id={selectId}
          >
            {FACTION_IDS.map((factionId) => (
              <option key={factionId} value={factionId}>
                {FACTIONS[factionId].name}
              </option>
            ))}
          </select>
        </div>
      );
    })}
  </div>
);

const teamA = TEAMS[0];
const teamB = TEAMS[1];
/** Sensible defaults: the factions everyone fielded in partida 3 of the mock. */
const lastPartida = MATCH_DETAIL.partidas[2];

const ScoreRecorder = () => {
  const [winner, setWinner] = useState('Equipo de Richar');
  return (
    <div className="flex h-fit flex-col gap-5 rounded-lg border border-(--hair) bg-(--night-2) p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="font-bold font-mono text-(--gold) text-2xs uppercase tracking-2xl">
          Partida 3 · Semifinal
        </span>
        <span className={tag}>En juego</span>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <FactionSideEditor
          color={teamA?.color ?? '#8b969e'}
          defaults={lastPartida?.factionsA ?? []}
          players={teamA?.players ?? []}
          sideId="a"
        />
        <FactionSideEditor
          color={teamB?.color ?? '#8b969e'}
          defaults={lastPartida?.factionsB ?? []}
          players={teamB?.players ?? []}
          sideId="b"
        />
      </div>
      <div>
        <span className={label}>Equipo ganador de la partida</span>
        <Segmented
          name="Equipo ganador"
          onChange={setWinner}
          options={['Equipo de Richar', 'Equipo de Arsu']}
          value={winner}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button className={`${btn.primary} px-5 py-2 text-sm`} type="button">
          Registrar partida
        </button>
        <button className={`${btn.ghost} text-sm`} type="button">
          Cancelar
        </button>
      </div>
    </div>
  );
};

const EditMode = () => {
  const [model, setModel] = useState('Clásico');
  return (
    <Section id="edit">
      <SectionHeader
        eyebrowText="Herramientas del organizador"
        lead="Solo quien organiza ve estos controles: configurar el torneo, mover jugadores y registrar resultados sin salir de la página."
        title="Modo Edición"
      />
      <div
        className={`${panel} grid grid-cols-1 gap-8 p-6 sm:p-8 lg:grid-cols-2`}
      >
        <div className="flex flex-col gap-6">
          <div>
            <label className={label} htmlFor="edition-venue">
              Sede de la edición
            </label>
            <input
              className={input}
              defaultValue="El huertar de Valentín"
              id="edition-venue"
            />
          </div>
          <div>
            <label className={label} htmlFor="pot-select">
              Bombo
            </label>
            <select
              className={`${input} d-select pr-9`}
              defaultValue="Bombo 2"
              id="pot-select"
            >
              <option>Bombo 1 · Capitanes</option>
              <option>Bombo 2</option>
              <option>Bombo 3</option>
              <option>Bombo 4</option>
            </select>
          </div>
          <div>
            <span className={label}>Modelo de torneo</span>
            <Segmented
              name="Modelo de torneo"
              onChange={setModel}
              options={['Clásico', 'Suizo']}
              value={model}
            />
          </div>
          <div>
            <span className={label}>Partidas para ganar el partido</span>
            <Stepper initial={2} />
          </div>
          <div className="flex max-w-75 flex-col gap-3.5">
            <Toggle initial text="Liga a ida y vuelta" />
            <Toggle initial={false} text="Torneo individual paralelo" />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2.5 border-(--hair) border-t pt-6">
            <button className={btn.primary} type="button">
              Guardar cambios
            </button>
            <button className={btn.secondary} type="button">
              Cancelar
            </button>
            <button className={btn.danger} type="button">
              Eliminar equipo
            </button>
          </div>
        </div>
        <ScoreRecorder />
      </div>
    </Section>
  );
};

export { EditMode };
