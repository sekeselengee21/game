import type { GameCard, GamePlayer, CombinedSplitPot, TableState } from "../api/game";
import type { User } from "../api/user";

// --- Side Pot Info ---
export interface SidePot {
  amount: number;
  eligiblePlayers: GamePlayer[];
  winners: GamePlayer[];
  winningsPerPlayer: number;
  mainPot: boolean;
  winningCommunityCards?: GameCard[];
}

// --- Game State ---
export interface GameState {
  minBuyIn: number;
  maxBuyIn: number;
  smallBlind: number;
  bigBlind: number;
  maxPlayers: number;
  lastActions: Record<number, string>;
  callAmounts?: Record<number, number>;
  dealerSeatIndex: number;
  smallBlindSeatIndex: number;
  bigBlindSeatIndex: number;
  usableBalance: number;
  isAuthenticated: boolean;
  currentUser?: User;
  turnPlayer: User | null;
  isFolded: boolean;
  isAllIn: boolean;
  isAuto: boolean;
  currentBets: Record<number, number>;
  currentPot: number;
  pots: SidePot[];
  seats: GamePlayer[];
  currentPlayerSeat: number;
  communityCards?: GameCard[];
  state: "WAITING_FOR_PLAYERS" | "PRE_FLOP" | "FLOP" | "TURN" | "RIVER" | "SHOWDOWN" | "FINISHED";
  combinedSplitPot?: CombinedSplitPot;
  turnStartTime?: string;
  tablestate?: TableState;
  revealedHoleCards: Record<number, boolean>;
  botsAloneSecondsLeft?: number | null;
}

// --- Chat Messages ---
export interface Chat {
  id: number;
  username: string;
  message: string;
}
export type GameStateUpdatePayload = {
  players: GamePlayer[];
  currentPot: number;
  currentBets?: Record<number, number>;
  communityCards?: GameCard[];
  state: GameState["state"];
  pots?: SidePot[];
};

export type TableCategory = "Ширээнүүд" | "Тэмцээнүүд" | "Sit & Go" | "Settings" | "Cashier" | "Games" | "Home" | "Chat";

// --- Reducer Action Types ---
export type GameAction =
  | { type: "PLAYER_ACTION"; data: any }
  | { type: "UPDATE_TABLE"; table: TableState; session: any; botsAloneSecondsLeft?: number | null }
  | { type: "GAME_STATE_UPDATE"; payload: GameStateUpdatePayload }
  | { type: "TURN_UPDATE"; data: any }
  | { type: "CONNECTED"; data: any }
  | { type: "AUTH"; data: { balance: number; user: User; isAuthenticated: boolean } }
  | { type: "COMBINED_SPLIT_POT"; data: CombinedSplitPot }
  | { type: "RESET_GAME" }
  | { type: "RESET_FOR_TABLE_SWITCH" }
  | { type: "HOLE_CARDS_UPDATE"; payload: { [seatId: number]: GameCard[] } };
