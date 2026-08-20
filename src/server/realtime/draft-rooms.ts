import {
  buildCaptainOrder,
  buildDraftOrder,
  getUndraftedPlayersInPot,
  hasPickedFromPot,
  resolveNextTurn,
} from '@/lib/simulator/draft';
import type {
  CaptainOrderMethod,
  DraftMethod,
  DraftRoomPayload,
  Pots,
} from '@/lib/simulator/types';
import { createRoomRegistry } from '@/server/realtime/room-registry';

const { rooms, emitter, generateUniqueCode } =
  createRoomRegistry<DraftRoomPayload>('draft');

const createRoom = (
  pots: Pots,
  captainIds: string[],
  ranking: string[],
  captainOrderMethod: CaptainOrderMethod,
  draftMethod: DraftMethod,
): string => {
  const code = generateUniqueCode();
  const baseOrder = buildCaptainOrder(captainIds, ranking, captainOrderMethod);
  const draftablePotCount = pots.length - 1;
  const turnQueue = buildDraftOrder(
    captainIds,
    baseOrder,
    draftablePotCount,
    captainOrderMethod,
    draftMethod,
  );
  const payload: DraftRoomPayload = {
    pots,
    captainIds,
    claims: {},
    draft: { method: draftMethod, turnQueue, picks: [] },
  };
  rooms.set(code, payload);
  return code;
};

const getRoom = (code: string): DraftRoomPayload | undefined => rooms.get(code);

const claimCaptain = (
  code: string,
  captainId: string,
  deviceId: string,
): DraftRoomPayload | { error: string } => {
  const room = rooms.get(code);
  if (!room) return { error: 'La sala no existe.' };
  if (!room.captainIds.includes(captainId)) {
    return { error: 'Ese capitán no existe en este draft.' };
  }
  const existing = room.claims[captainId];
  if (existing && existing !== deviceId) {
    return { error: 'Ese capitán ya ha sido reclamado por otro móvil.' };
  }
  const updated: DraftRoomPayload = {
    ...room,
    claims: { ...room.claims, [captainId]: deviceId },
  };
  rooms.set(code, updated);
  emitter.emit(`update:${code}`, updated);
  return updated;
};

const pickPlayer = (
  code: string,
  deviceId: string,
  potIndex: number,
  playerId: string,
): DraftRoomPayload | { error: string } => {
  const room = rooms.get(code);
  if (!room) return { error: 'La sala no existe.' };
  const captainId = Object.entries(room.claims).find(
    ([, owner]) => owner === deviceId,
  )?.[0];
  if (!captainId) return { error: 'No has reclamado ningún capitán.' };
  if (resolveNextTurn(room.draft, room.pots) !== captainId) {
    return { error: 'No es tu turno.' };
  }
  if (hasPickedFromPot(room.draft, captainId, potIndex)) {
    return { error: 'Ya has elegido de este bombo.' };
  }
  const undrafted = getUndraftedPlayersInPot(room.pots, room.draft, potIndex);
  if (!undrafted.includes(playerId)) {
    return { error: 'Ese jugador ya no está disponible.' };
  }

  const updated: DraftRoomPayload = {
    ...room,
    draft: {
      ...room.draft,
      picks: [...room.draft.picks, { captainId, potIndex, playerId }],
    },
  };
  rooms.set(code, updated);
  emitter.emit(`update:${code}`, updated);
  return updated;
};

export { claimCaptain, createRoom, emitter, getRoom, pickPlayer };
