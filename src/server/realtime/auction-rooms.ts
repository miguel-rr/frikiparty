import {
  applyBid,
  createAuctionState,
  resolveLockoutEnded,
  resolveLotTimeoutOnce,
} from '@/lib/simulator/auction-resolution';
import type { AuctionRoomPayload, Pots } from '@/lib/simulator/types';
import { createRoomRegistry } from '@/server/realtime/room-registry';

type Room = {
  payload: AuctionRoomPayload;
  timer: NodeJS.Timeout | null;
};

const { rooms, emitter, generateUniqueCode } =
  createRoomRegistry<Room>('auction');

/**
 * (Re)schedules the single timer that resolves this room's next deadline —
 * the server-side twin of the client's `use-auction-clock.ts`, just shared
 * by every connected device instead of duplicated per browser tab.
 */
const scheduleTimer = (code: string): void => {
  const room = rooms.get(code);
  if (!room) return;
  if (room.timer) clearTimeout(room.timer);
  room.timer = null;

  const { auction } = room.payload;
  const deadline =
    auction.status === 'lockout'
      ? auction.lockoutEndsAt
      : auction.status === 'open'
        ? auction.countdownEndsAt
        : null;
  if (deadline === null) return;

  const delay = Math.max(0, deadline - Date.now());
  room.timer = setTimeout(() => {
    const current = rooms.get(code);
    if (!current) return;
    const now = Date.now();
    const nextAuction =
      current.payload.auction.status === 'lockout'
        ? resolveLockoutEnded(current.payload.auction, now)
        : resolveLotTimeoutOnce(
            current.payload.auction,
            current.payload.pots,
            current.payload.captainIds,
            now,
          );
    current.payload = { ...current.payload, auction: nextAuction };
    emitter.emit(`update:${code}`, current.payload);
    scheduleTimer(code);
  }, delay);
};

const createRoom = (pots: Pots, captainIds: string[]): string => {
  const code = generateUniqueCode();
  const auction = createAuctionState(pots, captainIds, Date.now());
  const payload: AuctionRoomPayload = { pots, captainIds, claims: {}, auction };
  rooms.set(code, { payload, timer: null });
  scheduleTimer(code);
  return code;
};

const getRoom = (code: string): AuctionRoomPayload | undefined =>
  rooms.get(code)?.payload;

const claimCaptain = (
  code: string,
  captainId: string,
  deviceId: string,
): AuctionRoomPayload | { error: string } => {
  const room = rooms.get(code);
  if (!room) return { error: 'La sala no existe.' };
  if (!room.payload.captainIds.includes(captainId)) {
    return { error: 'Ese capitán no existe en esta subasta.' };
  }
  const existing = room.payload.claims[captainId];
  if (existing && existing !== deviceId) {
    return { error: 'Ese capitán ya ha sido reclamado por otro móvil.' };
  }
  room.payload = {
    ...room.payload,
    claims: { ...room.payload.claims, [captainId]: deviceId },
  };
  emitter.emit(`update:${code}`, room.payload);
  return room.payload;
};

const placeBid = (
  code: string,
  deviceId: string,
  amount: number,
): AuctionRoomPayload | { error: string } => {
  const room = rooms.get(code);
  if (!room) return { error: 'La sala no existe.' };
  const captainId = Object.entries(room.payload.claims).find(
    ([, owner]) => owner === deviceId,
  )?.[0];
  if (!captainId) return { error: 'No has reclamado ningún capitán.' };

  const result = applyBid(
    room.payload.auction,
    room.payload.pots,
    room.payload.captainIds,
    captainId,
    amount,
    Date.now(),
  );
  if ('error' in result) return result;

  room.payload = { ...room.payload, auction: result };
  scheduleTimer(code);
  emitter.emit(`update:${code}`, room.payload);
  return room.payload;
};

export { claimCaptain, createRoom, emitter, getRoom, placeBid };
