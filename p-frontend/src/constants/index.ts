// WebSocket Configuration
export const WEBSOCKET = {
  RECONNECT_DELAY: 2000, // 2 seconds
  MAX_RECONNECT_ATTEMPTS: 5,
  MESSAGE_BATCH_INTERVAL: 16, // 16ms (~60fps)
  HEARTBEAT_INTERVAL: 30000, // 30 seconds
} as const;

// Game Configuration
export const GAME = {
  MIN_PASSWORD_LENGTH: 8,
  MAX_USERNAME_LENGTH: 20,
  MAX_CHAT_MESSAGE_LENGTH: 500,
  ACTION_DEBOUNCE_MS: 150,
  ANIMATION_DURATION_MS: 300,
  CARD_DEAL_DELAY_MS: 100,
} as const;

// UI Configuration
export const UI = {
  TOAST_DURATION: 3000, // 3 seconds
  MODAL_ANIMATION_DURATION: 200,
  SCROLL_LOAD_MORE_THRESHOLD: 100, // pixels from bottom
} as const;

// API Configuration
export const API = {
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
} as const;

// Poker Game Constants
export const POKER = {
  MIN_PLAYERS: 2,
  MAX_PLAYERS_8: 8,
  MAX_PLAYERS_6: 6,
  HOLDEM_CARDS: 2,
  OMAHA_CARDS: 4,
  COMMUNITY_CARDS_MAX: 5,
} as const;

// Game States
export const GAME_STATES = {
  WAITING: "WAITING_FOR_PLAYERS",
  PRE_FLOP: "PRE_FLOP",
  FLOP: "FLOP",
  TURN: "TURN",
  RIVER: "RIVER",
  FINISHED: "FINISHED",
} as const;

// Betting Phases
export const BETTING_PHASES = [GAME_STATES.PRE_FLOP, GAME_STATES.FLOP, GAME_STATES.TURN, GAME_STATES.RIVER] as const;
