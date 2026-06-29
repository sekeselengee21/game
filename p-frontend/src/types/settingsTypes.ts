export interface DesktopSettingsState {
  showTurnIndicator: boolean;
  autoPayBlind: boolean;
  acceptBBAutomatically: boolean;
  hideHoleCardsAutomatically: boolean;
  autoStraddle: boolean;
  cancelStraddle: boolean;
  showBetAmount: boolean;
  autoRunItTwice: boolean;
  offerInsurance: boolean;
  showCashInBB: boolean;
  showTournamentStackInBB: boolean;
  streamMode: boolean;
  confirmCheckFold: boolean;
  allowEmoji: boolean;
  allowThrowables: boolean;
  animateChipsCards: boolean;
  showFlagOnSeat: boolean;
  squeezeHoleCards: boolean;
  highlightBestHand: boolean;
}

export const DEFAULT_SETTINGS: DesktopSettingsState = {
  showTurnIndicator: false,
  autoPayBlind: false,
  acceptBBAutomatically: false,
  hideHoleCardsAutomatically: false,
  autoStraddle: false,
  cancelStraddle: false,
  showBetAmount: false,
  autoRunItTwice: false,
  offerInsurance: false,
  showCashInBB: false,
  showTournamentStackInBB: false,
  streamMode: false,
  confirmCheckFold: false,
  allowEmoji: false,
  allowThrowables: false,
  animateChipsCards: false,
  showFlagOnSeat: false,
  squeezeHoleCards: false,
  highlightBestHand: false,
};
