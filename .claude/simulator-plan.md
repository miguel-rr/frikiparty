# Multi-device draft + auction anonymity fix

**Status: implemented.** Both parts shipped as described below — the
auction anonymity fix, the shared `room-registry.ts` extraction, the draft
room server/router, the host step, and the phone join page (with the
shared `claim-captain-list.tsx`).

`pnpm run typecheck` and `pnpm run check` pass clean. Browser-verified live
with the dev server:

- Auction: the "Puja actual" line only shows the amount mid-bid; the
  roster/budget panel still reveals winners immediately once a lot closes.
- Draft: created a "Con varios móviles" room for a 7-captain / 3-pot
  config where the third pot deliberately holds 6 players instead of 7
  (to exercise the short-last-pot deadlock fix from the single-device
  draft work). Claimed each captain from a separate browser tab/device id,
  confirmed only the captain whose turn it is sees pick controls (others
  see a "espera tu turno" / spectator view), confirmed every pick
  propagates live to the host screen and all phones, and confirmed the
  draft self-terminated correctly at 13 (not 14) picks once pot 3 ran dry
  — Doble Filo ended with 1 pick instead of 2, exactly as designed. "Ver
  equipos" activated on the host and correctly built all 7 teams via
  `IMPORT_DRAFT_RESULT`.
- Note from testing, not a product bug: `next dev`'s HTTP/1.1 server plus
  Chrome's 6-connections-per-origin cap means opening many simultaneous
  SSE-subscribed tabs against localhost can transiently stall a mutation
  (claim/pick) until a connection frees up. Doesn't apply in production
  (Vercel serves over HTTP/2), and isn't a reason to change the
  architecture — just something to keep in mind if a local multi-tab test
  seems to hang.

## Context

Two follow-ups flagged (and deferred) during the multi-device auction work:
each captain should be able to draft from their own phone the same way they
already bid from their own phone, and the auction should stop revealing who
placed the current high bid — `core-logic.md` is explicit that only the
amount is public mid-bid ("La identidad del capitán que posee en cada
momento la puja más alta no se conoce"), but the shipped UI shows "Puja
actual: X de Centella". Both are scoped together since they touch the same
captains/room screens and the draft room reuses the auction room's
architecture directly.

No open design questions this time — the multi-device auction already
proved out the pattern (in-memory rooms, tRPC subscriptions over SSE,
device-id-based claiming, host spectator screen + phone join page); this
is that same shape applied to the draft, which is actually simpler (no
wall-clock timers — a pick only happens when a captain acts, there's no
lockout/countdown to schedule).

## 1. Auction anonymity fix

**`auction-simulation-step.tsx`, `auction-room-host-step.tsx`,
`src/app/simulator/auction/[code]/page.tsx`**: the "Puja actual: X de
{name}" line loses the "de {name}" part everywhere a bid is shown
mid-auction — just the amount. Nothing else changes: the final roster
reveal (via `CaptainBudgetHud`, already showing who bought whom once a lot
resolves) already matches the spec, since hiding is only about the
*current, still-open* bid.

## 2. Shared room-registry plumbing (dedupe before adding a second room type)

**New `src/server/realtime/room-registry.ts`**: extracts the
code-generation + `globalThis`-cached `Map`/`EventEmitter` pair that
`auction-rooms.ts` already hand-rolls, as `createRoomRegistry<T>(key):
{ rooms: Map<string, T>; emitter: EventEmitter; generateUniqueCode(): string }`.
**`src/server/realtime/auction-rooms.ts`** (modify): use it instead of its
own inline caching block — behavior-preserving cleanup, not a rewrite.

## 3. Draft room state + server

**New `src/server/realtime/draft-rooms.ts`**, mirroring
`auction-rooms.ts` minus the timer machinery (drafts have no deadlines):
- `DraftRoomPayload` (new type in `src/lib/simulator/types.ts`):
  `{ pots: Pots; captainIds: string[]; claims: Record<string, string>;
  draft: DraftState }`.
- `createRoom(pots, captainIds, ranking, captainOrderMethod, draftMethod):
  string` — builds the initial `DraftState` server-side via the existing
  `buildCaptainOrder`/`buildDraftOrder` (`src/lib/simulator/draft.ts`,
  unchanged), seeds the room, returns the code.
- `claimCaptain(code, captainId, deviceId)` — identical contract to the
  auction room's.
- `pickPlayer(code, deviceId, potIndex, playerId)` — resolves the caller's
  `captainId` via `claims` (never trusts a client-supplied id, same guard
  as bidding), then validates with the existing pure helpers
  (`resolveNextTurn`, `hasPickedFromPot`, `getUndraftedPlayersInPot` from
  `draft.ts`) before appending the pick and emitting.

**New `src/server/api/routers/draft-room.ts`**: `create`, `claim`, `pick`,
`onUpdate` (subscription) — same shape as `auction-room.ts`'s router,
mounted as `draftRoom` in `root.ts`.

## 4. Host side

**`draft-method-step.tsx`** (modify): same two-button pattern as
`auction-config-step.tsx` — "Solo, en este dispositivo" keeps today's
`START_DRAFT` + advance-to-`draft-simulation`; "Con varios móviles" calls
`draftRoom.create`, dispatches a new `SET_DRAFT_ROOM_CODE` action, advances
to a new step.

**New `src/app/simulator/_components/steps/draft-room-host-step.tsx`**:
subscribes via `draftRoom.onUpdate`, shows the code + join link, and a
read-only render of the same information `draft-simulation-step.tsx`
already shows locally (current turn, each captain's picks so far — no
privacy concern here, draft turn order is public per the spec). "Ver
equipos" enables once the draft is complete, dispatching a new
`IMPORT_DRAFT_RESULT` action (mirrors `IMPORT_AUCTION_RESULT`: sets
`state.draft` and rebuilds `state.teams` via the existing
`buildTeamsFromDraft`) then `ADVANCE`.

**`types.ts` / `wizard-reducer.ts`**: add `'draft-room-host'` to
`WizardStep`, `draftRoomCode?: string` to `WizardState`,
`SET_DRAFT_ROOM_CODE` and `IMPORT_DRAFT_RESULT` to `WizardAction`.
`computeNextStep`: `draft-method` → `draftRoomCode ? 'draft-room-host' :
'draft-simulation'` (same branch shape as `auction-config`'s), `draft-room-host`
→ `summary`. Reset `draftRoomCode` alongside the other downstream fields
in `SET_TEAM_METHOD`/`SET_PARTICIPANTS`/etc., same as `auctionRoomCode`
today.

**`wizard-shell.tsx`**: register `DraftRoomHostStep`.

## 5. Phone side

**New `src/app/simulator/_components/ui/claim-captain-list.tsx`**: the
"tap your name to claim it" list, extracted from the auction phone page (it
becomes the first genuinely shared bit between the two room types) —
`{ captainIds, claims, onClaim, claiming, error }`. `src/app/simulator/auction/[code]/page.tsx`
switches to use it (no behavior change, just dedupe).

**New `src/app/simulator/draft/[code]/page.tsx`**: same shape as the
auction phone page — `deviceId` from the same `localStorage` key, subscribe
to `draftRoom.onUpdate`, `claim-captain-list` when unclaimed. Once claimed:
if it's this captain's turn (`resolveNextTurn` against the subscribed
payload), the same two-step "pick a pot, then a player" UI
`draft-simulation-step.tsx` already has, wired to `draftRoom.pick` instead
of a local dispatch; otherwise a "turno de {captain}" waiting view. "Draft
completo" message once done.

## Verification

1. `pnpm run typecheck` / `pnpm run check`.
2. `pnpm run dev`, single-device auction: confirm the current-bid line no
   longer names a captain, but the roster/budget panel still reveals
   winners immediately once a lot closes.
3. Bombos + draft, "Con varios móviles": code appears on host; open
   `/simulator/draft/[code]` in two more tabs (distinct `localStorage`
   device ids, same trick used for the auction test — set
   `frikiparty-device-id` via the JS tool before first load), claim two
   different captains, confirm only the captain whose turn it is sees pick
   controls and the others see the waiting view, confirm picks propagate
   to all three screens live, confirm "Ver equipos" activates correctly on
   the host once every pot is exhausted (including the short-last-pot
   deadlock fix from earlier this session — still exercised the same way).

## Critical files

- `src/server/realtime/room-registry.ts` (new)
- `src/server/realtime/draft-rooms.ts` (new)
- `src/server/api/routers/draft-room.ts` (new)
- `src/app/simulator/_components/steps/draft-room-host-step.tsx` (new)
- `src/app/simulator/draft/[code]/page.tsx` (new)
- `src/app/simulator/_components/ui/claim-captain-list.tsx` (new)
