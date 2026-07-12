import type { GamePlayer, GameCard } from "../api/game";
import type { User } from "../api/user";

// Raw seat objects exactly as serialized by the backend. Field names differ
// from the normalized GamePlayer (e.g. Jackson emits `folded`, not `isFolded`)
// and several fields are bot-/session-specific, so this is a deliberately loose
// shape that the mapper reads defensively and normalizes into GamePlayer.
interface RawSeat {
  user?: (User & { botAvatar?: string | null }) | null;
  seatId?: number;
  stack?: number;
  allIn?: boolean;
  inHand?: boolean;
  isFolded?: boolean;
  folded?: boolean;
  winnings?: number;
  netResult?: number;
  disconnected?: boolean;
  timeoutActed?: boolean;
  sittingOut?: boolean;
  winner?: boolean;
  hasActedShowdown?: boolean;
  seatedAt?: number | null;
  botAvatar?: string | null;
}

export function mapSeats(
  tableSeats: Record<string, RawSeat>,
  maxPlayers: number,
  sessionHoleCards: Record<string, GameCard[]> = {},
  sessionPlayers: GamePlayer[] = [],
  sessionSeats: Record<string, { kickCountdownSeconds?: number | null }> = {},
): GamePlayer[] {
  return Array.from({ length: maxPlayers }, (_, i) => {
    const seatData = tableSeats[i.toString()] || {};
    const playerData = sessionPlayers[i] || {};
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
      isSittingOut: seatData.sittingOut ?? false,
      isWinner: seatData.winner || false,
      hasActedShowdown: seatData.hasActedShowdown || false,
      seatedAt: playerData.seatedAt ?? tableSeats[i.toString()]?.seatedAt ?? null,
      kickCountdownSeconds: sessionSeatData.kickCountdownSeconds ?? null,
    };
  });
}
