import { relations } from 'drizzle-orm';

import { account, session, user } from '@/server/db/schema/auth';
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
  tag,
} from '@/server/db/schema/catalog';
import { edition, editionPlayer, venue } from '@/server/db/schema/edition';
import {
  liveRoom,
  liveVersion,
  tournamentEvent,
} from '@/server/db/schema/live';
import {
  match,
  matchGame,
  matchGameFactionDraw,
  matchGamePlayerFaction,
  matchGameSaveFile,
} from '@/server/db/schema/match';
import { media, mediaAssociation, mediaTag } from '@/server/db/schema/media';
import {
  phase,
  phaseBracketConfig,
  phaseBracketRoundConfig,
  phaseFactionRules,
  phaseGroup,
  phaseGroupConfig,
  phaseGroupTeam,
} from '@/server/db/schema/phase';
import { player } from '@/server/db/schema/player';
import { comment, like } from '@/server/db/schema/social';
import {
  auction,
  auctionBid,
  auctionLot,
  draft,
  draftPick,
  team,
  teamFormationPotPlayer,
  teamMember,
} from '@/server/db/schema/team';
import {
  tournament,
  tournamentRankingSnapshot,
  tournamentSwissConfig,
  tournamentVote,
} from '@/server/db/schema/tournament';

const userRelations = relations(user, ({ many, one }) => ({
  accounts: many(account),
  sessions: many(session),
  player: one(player, { fields: [user.id], references: [player.userId] }),
  uploadedMedia: many(media),
  uploadedSaveFiles: many(matchGameSaveFile),
  likes: many(like),
  comments: many(comment),
  createdTournaments: many(tournament),
  tournamentEvents: many(tournamentEvent),
}));

const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

const playerRelations = relations(player, ({ many, one }) => ({
  user: one(user, { fields: [player.userId], references: [user.id] }),
  teamMemberships: many(teamMember),
  editionConfirmations: many(editionPlayer),
  tournamentRankingSnapshots: many(tournamentRankingSnapshot),
  potAssignments: many(teamFormationPotPlayer),
  draftPicksAsCaptain: many(draftPick, { relationName: 'draftPickCaptain' }),
  draftPicksAsPicked: many(draftPick, { relationName: 'draftPickPicked' }),
  auctionLotsAsPlayer: many(auctionLot, { relationName: 'auctionLotPlayer' }),
  auctionLotsWonAsCaptain: many(auctionLot, {
    relationName: 'auctionLotWinner',
  }),
  auctionBids: many(auctionBid),
  matchGamePlayerFactions: many(matchGamePlayerFaction),
  mediaAssociations: many(mediaAssociation),
  likes: many(like),
  comments: many(comment),
  tournamentVotes: many(tournamentVote),
}));

const gameRelations = relations(game, ({ many }) => ({
  versions: many(gameVersion),
  tournaments: many(tournament),
  maps: many(gameMap),
}));

const gameMapRelations = relations(gameMap, ({ many, one }) => ({
  game: one(game, { fields: [gameMap.gameId], references: [game.id] }),
  introducedInVersion: one(gameVersion, {
    fields: [gameMap.introducedInVersionId],
    references: [gameVersion.id],
  }),
  matchGames: many(matchGame),
}));

const factionRevisionRelations = relations(
  factionRevision,
  ({ many, one }) => ({
    faction: one(faction, {
      fields: [factionRevision.factionId],
      references: [faction.id],
    }),
    gameVersion: one(gameVersion, {
      fields: [factionRevision.gameVersionId],
      references: [gameVersion.id],
    }),
    heroes: many(factionHero),
    units: many(factionUnit),
    structures: many(factionStructure),
    powers: many(factionPower),
  }),
);

const factionHeroRelations = relations(factionHero, ({ one }) => ({
  revision: one(factionRevision, {
    fields: [factionHero.revisionId],
    references: [factionRevision.id],
  }),
}));

const factionUnitRelations = relations(factionUnit, ({ one }) => ({
  revision: one(factionRevision, {
    fields: [factionUnit.revisionId],
    references: [factionRevision.id],
  }),
}));

const factionStructureRelations = relations(factionStructure, ({ one }) => ({
  revision: one(factionRevision, {
    fields: [factionStructure.revisionId],
    references: [factionRevision.id],
  }),
}));

const factionPowerRelations = relations(factionPower, ({ one }) => ({
  revision: one(factionRevision, {
    fields: [factionPower.revisionId],
    references: [factionRevision.id],
  }),
}));

const gameVersionRelations = relations(gameVersion, ({ many, one }) => ({
  game: one(game, { fields: [gameVersion.gameId], references: [game.id] }),
  factionsIntroduced: many(faction, { relationName: 'factionIntroduced' }),
  factionsRemoved: many(faction, { relationName: 'factionRemoved' }),
  tournaments: many(tournament),
}));

const factionRelations = relations(faction, ({ many, one }) => ({
  revisions: many(factionRevision),
  transformsFaction: one(faction, {
    relationName: 'factionTransforms',
    fields: [faction.transformsFactionId],
    references: [faction.id],
  }),
  alternates: many(faction, { relationName: 'factionTransforms' }),
  introducedInVersion: one(gameVersion, {
    relationName: 'factionIntroduced',
    fields: [faction.introducedInVersionId],
    references: [gameVersion.id],
  }),
  removedInVersion: one(gameVersion, {
    relationName: 'factionRemoved',
    fields: [faction.removedInVersionId],
    references: [gameVersion.id],
  }),
  matchGamePlayerFactions: many(matchGamePlayerFaction),
}));

const tagRelations = relations(tag, ({ many }) => ({
  mediaTags: many(mediaTag),
}));

const venueRelations = relations(venue, ({ many }) => ({
  editions: many(edition),
  mediaAssociations: many(mediaAssociation),
}));

const editionRelations = relations(edition, ({ many, one }) => ({
  venue: one(venue, { fields: [edition.venueId], references: [venue.id] }),
  tournaments: many(tournament),
  confirmedPlayers: many(editionPlayer),
  mediaAssociations: many(mediaAssociation),
  likes: many(like),
  comments: many(comment),
}));

const editionPlayerRelations = relations(editionPlayer, ({ one }) => ({
  edition: one(edition, {
    fields: [editionPlayer.editionId],
    references: [edition.id],
  }),
  player: one(player, {
    fields: [editionPlayer.playerId],
    references: [player.id],
  }),
}));

const tournamentRelations = relations(tournament, ({ many, one }) => ({
  edition: one(edition, {
    fields: [tournament.editionId],
    references: [edition.id],
  }),
  game: one(game, { fields: [tournament.gameId], references: [game.id] }),
  gameVersion: one(gameVersion, {
    fields: [tournament.gameVersionId],
    references: [gameVersion.id],
  }),
  swissConfig: one(tournamentSwissConfig),
  rankingSnapshots: many(tournamentRankingSnapshot),
  teams: many(team),
  potPlayers: many(teamFormationPotPlayer),
  draft: one(draft),
  auction: one(auction),
  phases: many(phase),
  mediaAssociations: many(mediaAssociation),
  createdByUser: one(user, {
    fields: [tournament.createdByUserId],
    references: [user.id],
  }),
  votes: many(tournamentVote),
  events: many(tournamentEvent),
  liveRooms: many(liveRoom),
  liveVersion: one(liveVersion),
}));

const tournamentVoteRelations = relations(tournamentVote, ({ one }) => ({
  tournament: one(tournament, {
    fields: [tournamentVote.tournamentId],
    references: [tournament.id],
  }),
  voter: one(player, {
    fields: [tournamentVote.voterPlayerId],
    references: [player.id],
  }),
}));

const tournamentEventRelations = relations(tournamentEvent, ({ one }) => ({
  tournament: one(tournament, {
    fields: [tournamentEvent.tournamentId],
    references: [tournament.id],
  }),
  actor: one(user, {
    fields: [tournamentEvent.actorUserId],
    references: [user.id],
  }),
}));

const liveRoomRelations = relations(liveRoom, ({ one }) => ({
  tournament: one(tournament, {
    fields: [liveRoom.tournamentId],
    references: [tournament.id],
  }),
}));

const liveVersionRelations = relations(liveVersion, ({ one }) => ({
  tournament: one(tournament, {
    fields: [liveVersion.tournamentId],
    references: [tournament.id],
  }),
}));

const tournamentSwissConfigRelations = relations(
  tournamentSwissConfig,
  ({ one }) => ({
    tournament: one(tournament, {
      fields: [tournamentSwissConfig.tournamentId],
      references: [tournament.id],
    }),
  }),
);

const tournamentRankingSnapshotRelations = relations(
  tournamentRankingSnapshot,
  ({ one }) => ({
    tournament: one(tournament, {
      fields: [tournamentRankingSnapshot.tournamentId],
      references: [tournament.id],
    }),
    player: one(player, {
      fields: [tournamentRankingSnapshot.playerId],
      references: [player.id],
    }),
  }),
);

const teamRelations = relations(team, ({ many, one }) => ({
  tournament: one(tournament, {
    fields: [team.tournamentId],
    references: [tournament.id],
  }),
  members: many(teamMember),
  matchesAsTeamA: many(match, { relationName: 'matchTeamA' }),
  matchesAsTeamB: many(match, { relationName: 'matchTeamB' }),
  matchesWon: many(match, { relationName: 'matchWinner' }),
  matchesSatOut: many(match, { relationName: 'matchBye' }),
  matchGamesWon: many(matchGame, { relationName: 'matchGameWinner' }),
  groupSeats: many(phaseGroupTeam),
  factionDraws: many(matchGameFactionDraw),
}));

const teamMemberRelations = relations(teamMember, ({ one }) => ({
  team: one(team, { fields: [teamMember.teamId], references: [team.id] }),
  player: one(player, {
    fields: [teamMember.playerId],
    references: [player.id],
  }),
  tournament: one(tournament, {
    fields: [teamMember.tournamentId],
    references: [tournament.id],
  }),
}));

const teamFormationPotPlayerRelations = relations(
  teamFormationPotPlayer,
  ({ one }) => ({
    tournament: one(tournament, {
      fields: [teamFormationPotPlayer.tournamentId],
      references: [tournament.id],
    }),
    player: one(player, {
      fields: [teamFormationPotPlayer.playerId],
      references: [player.id],
    }),
  }),
);

const draftRelations = relations(draft, ({ many, one }) => ({
  tournament: one(tournament, {
    fields: [draft.tournamentId],
    references: [tournament.id],
  }),
  picks: many(draftPick),
}));

const draftPickRelations = relations(draftPick, ({ one }) => ({
  draft: one(draft, {
    fields: [draftPick.draftId],
    references: [draft.id],
  }),
  captain: one(player, {
    relationName: 'draftPickCaptain',
    fields: [draftPick.captainPlayerId],
    references: [player.id],
  }),
  pickedPlayer: one(player, {
    relationName: 'draftPickPicked',
    fields: [draftPick.pickedPlayerId],
    references: [player.id],
  }),
}));

const auctionRelations = relations(auction, ({ many, one }) => ({
  tournament: one(tournament, {
    fields: [auction.tournamentId],
    references: [tournament.id],
  }),
  lots: many(auctionLot),
}));

const auctionLotRelations = relations(auctionLot, ({ many, one }) => ({
  auction: one(auction, {
    fields: [auctionLot.auctionId],
    references: [auction.id],
  }),
  player: one(player, {
    relationName: 'auctionLotPlayer',
    fields: [auctionLot.playerId],
    references: [player.id],
  }),
  winningCaptain: one(player, {
    relationName: 'auctionLotWinner',
    fields: [auctionLot.winningCaptainPlayerId],
    references: [player.id],
  }),
  bids: many(auctionBid),
}));

const auctionBidRelations = relations(auctionBid, ({ one }) => ({
  lot: one(auctionLot, {
    fields: [auctionBid.lotId],
    references: [auctionLot.id],
  }),
  captain: one(player, {
    fields: [auctionBid.captainPlayerId],
    references: [player.id],
  }),
}));

const phaseRelations = relations(phase, ({ many, one }) => ({
  tournament: one(tournament, {
    fields: [phase.tournamentId],
    references: [tournament.id],
  }),
  groupConfig: one(phaseGroupConfig),
  groups: many(phaseGroup),
  bracketConfig: one(phaseBracketConfig),
  bracketRoundConfigs: many(phaseBracketRoundConfig),
  factionRules: one(phaseFactionRules),
  matches: many(match),
}));

const phaseGroupRelations = relations(phaseGroup, ({ many, one }) => ({
  phase: one(phase, { fields: [phaseGroup.phaseId], references: [phase.id] }),
  teams: many(phaseGroupTeam),
  matches: many(match),
}));

const phaseGroupTeamRelations = relations(phaseGroupTeam, ({ one }) => ({
  group: one(phaseGroup, {
    fields: [phaseGroupTeam.groupId],
    references: [phaseGroup.id],
  }),
  team: one(team, { fields: [phaseGroupTeam.teamId], references: [team.id] }),
}));

const phaseBracketConfigRelations = relations(
  phaseBracketConfig,
  ({ one }) => ({
    phase: one(phase, {
      fields: [phaseBracketConfig.phaseId],
      references: [phase.id],
    }),
  }),
);

const phaseFactionRulesRelations = relations(phaseFactionRules, ({ one }) => ({
  phase: one(phase, {
    fields: [phaseFactionRules.phaseId],
    references: [phase.id],
  }),
}));

const phaseGroupConfigRelations = relations(phaseGroupConfig, ({ one }) => ({
  phase: one(phase, {
    fields: [phaseGroupConfig.phaseId],
    references: [phase.id],
  }),
}));

const phaseBracketRoundConfigRelations = relations(
  phaseBracketRoundConfig,
  ({ one }) => ({
    phase: one(phase, {
      fields: [phaseBracketRoundConfig.phaseId],
      references: [phase.id],
    }),
  }),
);

const matchRelations = relations(match, ({ many, one }) => ({
  phase: one(phase, { fields: [match.phaseId], references: [phase.id] }),
  group: one(phaseGroup, {
    fields: [match.groupId],
    references: [phaseGroup.id],
  }),
  byeTeam: one(team, {
    relationName: 'matchBye',
    fields: [match.byeTeamId],
    references: [team.id],
  }),
  teamA: one(team, {
    relationName: 'matchTeamA',
    fields: [match.teamAId],
    references: [team.id],
  }),
  teamB: one(team, {
    relationName: 'matchTeamB',
    fields: [match.teamBId],
    references: [team.id],
  }),
  winnerTeam: one(team, {
    relationName: 'matchWinner',
    fields: [match.winnerTeamId],
    references: [team.id],
  }),
  feederMatchA: one(match, {
    relationName: 'matchFeederA',
    fields: [match.feederMatchAId],
    references: [match.id],
  }),
  feederMatchB: one(match, {
    relationName: 'matchFeederB',
    fields: [match.feederMatchBId],
    references: [match.id],
  }),
  feedsIntoAsA: many(match, { relationName: 'matchFeederA' }),
  feedsIntoAsB: many(match, { relationName: 'matchFeederB' }),
  games: many(matchGame),
  mediaAssociations: many(mediaAssociation),
  likes: many(like),
  comments: many(comment),
}));

const matchGameRelations = relations(matchGame, ({ many, one }) => ({
  match: one(match, {
    fields: [matchGame.matchId],
    references: [match.id],
  }),
  winnerTeam: one(team, {
    relationName: 'matchGameWinner',
    fields: [matchGame.winnerTeamId],
    references: [team.id],
  }),
  mapRow: one(gameMap, {
    fields: [matchGame.mapId],
    references: [gameMap.id],
  }),
  factionDraws: many(matchGameFactionDraw),
  playerFactions: many(matchGamePlayerFaction),
  saveFiles: many(matchGameSaveFile),
  mediaAssociations: many(mediaAssociation),
}));

const matchGameFactionDrawRelations = relations(
  matchGameFactionDraw,
  ({ one }) => ({
    matchGame: one(matchGame, {
      fields: [matchGameFactionDraw.matchGameId],
      references: [matchGame.id],
    }),
    team: one(team, {
      fields: [matchGameFactionDraw.teamId],
      references: [team.id],
    }),
    faction: one(faction, {
      fields: [matchGameFactionDraw.factionId],
      references: [faction.id],
    }),
  }),
);

const matchGamePlayerFactionRelations = relations(
  matchGamePlayerFaction,
  ({ one }) => ({
    matchGame: one(matchGame, {
      fields: [matchGamePlayerFaction.matchGameId],
      references: [matchGame.id],
    }),
    player: one(player, {
      fields: [matchGamePlayerFaction.playerId],
      references: [player.id],
    }),
    faction: one(faction, {
      fields: [matchGamePlayerFaction.factionId],
      references: [faction.id],
    }),
  }),
);

const matchGameSaveFileRelations = relations(matchGameSaveFile, ({ one }) => ({
  matchGame: one(matchGame, {
    fields: [matchGameSaveFile.matchGameId],
    references: [matchGame.id],
  }),
  uploadedByUser: one(user, {
    fields: [matchGameSaveFile.uploadedByUserId],
    references: [user.id],
  }),
}));

const mediaRelations = relations(media, ({ many, one }) => ({
  uploadedByUser: one(user, {
    fields: [media.uploadedByUserId],
    references: [user.id],
  }),
  associations: many(mediaAssociation),
  tags: many(mediaTag),
  likes: many(like),
  comments: many(comment),
}));

const mediaAssociationRelations = relations(mediaAssociation, ({ one }) => ({
  media: one(media, {
    fields: [mediaAssociation.mediaId],
    references: [media.id],
  }),
  edition: one(edition, {
    fields: [mediaAssociation.editionId],
    references: [edition.id],
  }),
  tournament: one(tournament, {
    fields: [mediaAssociation.tournamentId],
    references: [tournament.id],
  }),
  match: one(match, {
    fields: [mediaAssociation.matchId],
    references: [match.id],
  }),
  matchGame: one(matchGame, {
    fields: [mediaAssociation.matchGameId],
    references: [matchGame.id],
  }),
  player: one(player, {
    fields: [mediaAssociation.playerId],
    references: [player.id],
  }),
  venue: one(venue, {
    fields: [mediaAssociation.venueId],
    references: [venue.id],
  }),
}));

const mediaTagRelations = relations(mediaTag, ({ one }) => ({
  media: one(media, { fields: [mediaTag.mediaId], references: [media.id] }),
  tag: one(tag, { fields: [mediaTag.tagId], references: [tag.id] }),
}));

const likeRelations = relations(like, ({ one }) => ({
  user: one(user, { fields: [like.userId], references: [user.id] }),
  media: one(media, { fields: [like.mediaId], references: [media.id] }),
  edition: one(edition, { fields: [like.editionId], references: [edition.id] }),
  player: one(player, { fields: [like.playerId], references: [player.id] }),
  match: one(match, { fields: [like.matchId], references: [match.id] }),
}));

const commentRelations = relations(comment, ({ one }) => ({
  user: one(user, { fields: [comment.userId], references: [user.id] }),
  media: one(media, { fields: [comment.mediaId], references: [media.id] }),
  edition: one(edition, {
    fields: [comment.editionId],
    references: [edition.id],
  }),
  player: one(player, { fields: [comment.playerId], references: [player.id] }),
  match: one(match, { fields: [comment.matchId], references: [match.id] }),
}));

export {
  accountRelations,
  auctionBidRelations,
  auctionLotRelations,
  auctionRelations,
  commentRelations,
  draftPickRelations,
  draftRelations,
  editionPlayerRelations,
  editionRelations,
  factionHeroRelations,
  factionPowerRelations,
  factionRelations,
  factionRevisionRelations,
  factionStructureRelations,
  factionUnitRelations,
  gameMapRelations,
  gameRelations,
  gameVersionRelations,
  likeRelations,
  liveRoomRelations,
  liveVersionRelations,
  matchGameFactionDrawRelations,
  matchGamePlayerFactionRelations,
  matchGameRelations,
  matchGameSaveFileRelations,
  matchRelations,
  mediaAssociationRelations,
  mediaRelations,
  mediaTagRelations,
  phaseBracketConfigRelations,
  phaseBracketRoundConfigRelations,
  phaseFactionRulesRelations,
  phaseGroupConfigRelations,
  phaseGroupRelations,
  phaseGroupTeamRelations,
  phaseRelations,
  playerRelations,
  sessionRelations,
  tagRelations,
  teamFormationPotPlayerRelations,
  teamMemberRelations,
  teamRelations,
  tournamentEventRelations,
  tournamentRankingSnapshotRelations,
  tournamentRelations,
  tournamentSwissConfigRelations,
  tournamentVoteRelations,
  userRelations,
  venueRelations,
};
