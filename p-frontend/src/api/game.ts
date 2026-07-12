import type { PokerCardImage } from "../assets/card";
import type { SidePot } from "../types/gameTypes";
import type { User } from "./user";
const baseURL = import.meta.env.VITE_BACKEND_URL;
const websocketURL = baseURL.replace(/^https?:\/\/(.*)\/api$/, "wss://$1").replace(/^http/, "ws") + "/ws/table";

type WebsocketEvent = {
  id: string;
  type: string;
  // Raw deserialized websocket payload; its shape varies per event type and is
  // narrowed by each consumer. Intentionally untyped at this transport boundary.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
};

interface HandHistory {
  handNumber: number;
  winnerUserId: number;
  winningHoleCards: GameCard[];
  winningCommunityCards: GameCard[];
  winnings: number;
  winnerUsername: string;
}

interface TableState {
  minBuyIn: number;
  maxBuyIn: number;
  smallBlind: number;
  bigBlind: number;
  maxPlayers: number;
  seats: Record<number, GamePlayer>;
  isFolded: boolean;
  gameVariant: string;
}

type Suit = keyof typeof PokerCardImage;
type Rank = keyof (typeof PokerCardImage)[Suit];

type GameCard = {
  suit: Suit | null;
  rank: Rank | null;
  secret: boolean;
};

interface GamePlayer {
  user: User | null;
  stack: number;
  isAllIn: boolean;
  isFolded: boolean;
  isDisconnected: boolean;
  isTimeoutActed: boolean;
  hasActedShowdown: boolean;
  holeCards: GameCard[];
  seatId: number;
  winnings: number;
  lastActionText?: string;
  isWinner?: boolean;
  netResult: number;
  bestHandCards?: GameCard[];
  isSittingOut: boolean;
  inHand: boolean;
  seatedAt?: number | null;
  kickCountdownSeconds?: number | null;
}

interface CombinedSplitPot {
  hands: { [seatId: number]: Partial<GamePlayer> };
  sidePots: SidePot[];
  stacks: { [seatId: number]: number };
  communityCards: GameCard[];
}

interface GameHand {
  rank:
    | "HIGH_CARD"
    | "ONE_PAIR"
    | "TWO_PAIR"
    | "THREE_OF_A_KIND"
    | "STRAIGHT"
    | "FLUSH"
    | "FULL_HOUSE"
    | "FOUR_OF_A_KIND"
    | "STRAIGHT_FLUSH"
    | "ROYAL_FLUSH";
  combinationCards: GameCard[];
  rankCards: GameCard[];
}

export { websocketURL };
export type {
  WebsocketEvent,
  TableState,
  GamePlayer,
  GameCard,
  GameHand,
  CombinedSplitPot,
  HandHistory,
};
