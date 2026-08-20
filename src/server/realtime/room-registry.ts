import { EventEmitter } from 'node:events';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no O/0, I/1
const CODE_LENGTH = 5;

type RoomRegistry<T> = {
  rooms: Map<string, T>;
  emitter: EventEmitter;
  generateUniqueCode: () => string;
};

/**
 * A `Map` + `EventEmitter` pair for one room type, cached on `globalThis`
 * under `key` so a dev HMR reload doesn't orphan whatever room is
 * currently running — same reasoning as `src/server/db/index.ts` caching
 * its connection. This state is explicitly process-local: see the
 * "no database" tradeoff in `.claude/simulator-plan.md`.
 */
const createRoomRegistry = <T>(key: string): RoomRegistry<T> => {
  const globalForRooms = globalThis as unknown as Record<string, unknown>;
  const roomsKey = `${key}Rooms`;
  const emitterKey = `${key}RoomEmitter`;

  const rooms =
    (globalForRooms[roomsKey] as Map<string, T> | undefined) ??
    new Map<string, T>();
  globalForRooms[roomsKey] = rooms;

  const emitter =
    (globalForRooms[emitterKey] as EventEmitter | undefined) ??
    new EventEmitter();
  globalForRooms[emitterKey] = emitter;
  // An unbounded number of phones/spectators may subscribe to one room's
  // channel over the course of a session.
  emitter.setMaxListeners(0);

  const generateCode = (): string =>
    Array.from(
      { length: CODE_LENGTH },
      () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)],
    ).join('');

  const generateUniqueCode = (): string => {
    let code = generateCode();
    while (rooms.has(code)) code = generateCode();
    return code;
  };

  return { rooms, emitter, generateUniqueCode };
};

export { createRoomRegistry };
