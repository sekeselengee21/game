import type { GamePlayer, GameCard } from "../api/game";

export function mapSeats(
  tableSeats: Record<string, any>,
  maxPlayers: number,
  sessionHoleCards: Record<string, GameCard[]> = {},
  sessionPlayers: Record<string, any> = {},
  sessionSeats: Record<string, any> = {},
): GamePlayer[] {
  return Array.from({ length: maxPlayers }, (_, i) => {
    const seatData = tableSeats[i.toString()] || {};
    const playerData = sessionPlayers[i.toString()] || {};
    // kickCountdownSeconds is computed per-hand in createSessionData and stored
    // in session.seats — it is NOT on the raw GamePlayer (table.seats).
    const sessionSeatData = sessionSeats[i.toString()] || {};
    // Trust only session.holeCards (per-recipient, filtered server-side).
    // Falling back to seatData.holeCards leaked folded players' cards because
    // the full GameTable is serialized into the WS payload.
    const rawHoleCards: GameCard[] = sessionHoleCards[i.toString()] ?? [];

    const rawUser = seatData.user || null;
    const botAvatarFromServer = seatData.botAvatar || seatData.user?.botAvatar || null;
    const user = rawUser && botAvatarFromServer && !rawUser.avatar
      ? { ...rawUser, avatar: botAvatarFromServer }
      : rawUser;

    return {
      user,
      seatId: seatData.seatId ?? i,
      stack: seatData.stack || 0,
      holeCards: rawHoleCards.map((card) => ({ ...card })),
      isAllIn: seatData.allIn || false,
      inHand: seatData.inHand || false,
      // Jackson serializes the `folded` field with `isFolded()` getter as
      // `folded` (the "is" prefix is stripped). Accept both names.
      isFolded: seatData.isFolded ?? seatData.folded ?? false,
      winnings: seatData.winnings || 0,
      netResult: seatData.netResult || 0,
      username: seatData.user?.username ?? "Empty",
      isDisconnected: seatData.disconnected || false,
      isTimeoutActed: seatData.timeoutActed || false,
      isSittingOut: seatData.sittingOut,
      isWinner: seatData.winner || false,
      hasActedShowdown: seatData.hasActedShowdown || false,
      seatedAt: playerData.seatedAt ?? tableSeats[i.toString()]?.seatedAt ?? null,
      kickCountdownSeconds: sessionSeatData.kickCountdownSeconds ?? null,
    };
  });
}
