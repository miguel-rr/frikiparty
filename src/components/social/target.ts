/** What a like or a comment hangs from; mirrors the server's targetSchema. */
type SocialTarget =
  | { mediaId: string }
  | { editionId: string }
  | { playerId: string }
  | { matchId: string };

export type { SocialTarget };
