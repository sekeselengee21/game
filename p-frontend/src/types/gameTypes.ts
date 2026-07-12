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
  lastActions: Record<string, string>;
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

// Dynamic payloads carried on websocket-driven actions. Fields are optional
// because they arrive from server JSON and are read defensively in the reducer.
export interface PlayerActionData {
  actionType?: string;
  seatId: number;
  amount?: number;
  updatedStack?: number;
  cards?: GameCard[];
  currentPot?: number;
  currentBets?: Record<number, number>;
  actionId?: string;
  optimistic?: boolean;
}

export interface TurnUpdateData {
  currentPlayerSeat: number;
  isAuto?: boolean;
  turnStartTime?: string;
}

export interface TableSessionData {
  players?: GamePlayer[];
  seats?: Record<number, GamePlayer>;
  holeCards?: Record<string, GameCard[]>;
  state?: GameState["state"];
  currentPot?: number;
  currentBets?: Record<number, number>;
  dealerSeatIndex?: number;
  smallBlindSeatIndex?: number;
  bigBlindSeatIndex?: number;
  turnPlayer?: User | null;
  currentPlayerSeat?: number;
  communityCards?: GameCard[];
  turnStartTime?: string;
  destinedCommunityCards?: GameCard[];
}

// --- Reducer Action Types ---
export type GameAction =
  | { type: "PLAYER_ACTION"; data: PlayerActionData }
  | { type: "UPDATE_TABLE"; table: TableState; session?: TableSessionData; botsAloneSecondsLeft?: number | null }
  | { type: "GAME_STATE_UPDATE"; payload: GameStateUpdatePayload }
  | { type: "TURN_UPDATE"; data: TurnUpdateData }
  | { type: "CONNECTED"; data: unknown }
  | { type: "AUTH"; data: { balance: number; user: User; isAuthenticated: boolean } }
  | { type: "COMBINED_SPLIT_POT"; data: CombinedSplitPot }
  | { type: "RESET_GAME" }
  | { type: "RESET_FOR_TABLE_SWITCH" }
  | { type: "HOLE_CARDS_UPDATE"; payload: { [seatId: number]: GameCard[] } };
