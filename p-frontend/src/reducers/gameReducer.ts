import type { GameState, GameAction } from "../types/gameTypes";
import type { GameCard } from "../api/game";
import { mapSeats } from "../utils/mapSeats";
import formatAmount from "../utils/formatNumber";

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "RESET_GAME":
      return {
        ...state,
        seats: state.seats.map((seat) => ({
          ...seat,
          holeCards: [],
          isAllIn: false,
          isFolded: false,
          isWinner: false,
          winnings: 0,
          netResult: 0,
          lastActionText: "",
          hasActedShowdown: false,
        })),
        communityCards: [],
        currentPot: 0,
        currentBets: {},
        pots: [],
        combinedSplitPot: undefined,
        turnPlayer: null,
        currentPlayerSeat: 0,
        state: "WAITING_FOR_PLAYERS",
      };
    case "RESET_FOR_TABLE_SWITCH":
      // Hard reset of every table-bound field so data from the table we're
      // leaving (pot, seats, community cards, sit-out flags, etc.) doesn't
      // bleed into the new table while we wait for its first TABLE message.
      // Auth/balance stay intact since they belong to the user, not the table.
      return {
        ...state,
        seats: [],
        communityCards: [],
        currentPot: 0,
        currentBets: {},
        pots: [],
        combinedSplitPot: undefined,
        turnPlayer: null,
        currentPlayerSeat: 0,
        state: "WAITING_FOR_PLAYERS",
        lastActions: {},
        callAmounts: {},
        revealedHoleCards: {},
        dealerSeatIndex: 0,
        smallBlindSeatIndex: 0,
        bigBlindSeatIndex: 0,
        smallBlind: 0,
        bigBlind: 0,
        minBuyIn: 0,
        maxBuyIn: 0,
        maxPlayers: 8,
        tablestate: undefined,
        turnStartTime: undefined,
        isFolded: false,
        isAllIn: false,
        isAuto: false,
      };
    case "GAME_STATE_UPDATE": {
      const {
        state: phase,
        currentPot,
        currentBets,
        communityCards,
        pots,
      } = action.payload;
      if (phase === "WAITING_FOR_PLAYERS") {
        return gameReducer(state, { type: "RESET_GAME" });
      }
      const shouldResetShowdownData = phase === "PRE_FLOP";
      const communityCardsChanged =
        communityCards &&
        communityCards.length !== (state.communityCards?.length || 0);
      const shouldClearActions =
        communityCardsChanged || shouldResetShowdownData;

      return {
        ...state,
        currentPot,
        currentBets: currentBets || {},
        communityCards: communityCards || [],
        state: phase,
        pots: pots || [],
        combinedSplitPot: shouldResetShowdownData
          ? undefined
          : state.combinedSplitPot,
        seats: shouldClearActions
          ? state.seats.map((seat) => ({
              ...seat,
              lastActionText: "",
              hasActedShowdown: shouldResetShowdownData ? false : seat.hasActedShowdown,
            }))
          : state.seats,
      };
    }
    case "UPDATE_TABLE": {
      const { table, session, botsAloneSecondsLeft } = action;

      const effectiveSession = session || {
        holeCards: state.seats.reduce(
          (acc, seat) => {
            if (seat.user) acc[seat.seatId] = seat.holeCards || [];
            return acc;
          },
          {} as Record<number, any[]>,
        ),
        currentBets: state.currentBets || {},
        currentPot: state.currentPot || 0,
      };

      const newSeats = mapSeats(
        table.seats,
        table.maxPlayers,
        effectiveSession.holeCards,
        session?.players ?? [],
        session?.seats ?? {},
      );

      const seatsWithLastAction = newSeats.map((newSeat, idx) => {
        const oldSeat = state.seats[idx];

        if (oldSeat && oldSeat.lastActionText && newSeat.user) {
          return {
            ...newSeat,
            lastActionText: oldSeat.lastActionText,
          };
        }
        return newSeat;
      });

      const newState = session?.state || state.state;
      const isShowdownOrFinished =
        newState === "SHOWDOWN" || newState === "FINISHED";
      const shouldPreservePot =
        isShowdownOrFinished &&
        session?.currentPot === 0 &&
        state.currentPot > 0;

      return {
        ...state,
        tablestate: table,
        seats: seatsWithLastAction,
        dealerSeatIndex: session?.dealerSeatIndex ?? state.dealerSeatIndex,
        smallBlindSeatIndex:
          session?.smallBlindSeatIndex ?? state.smallBlindSeatIndex,
        bigBlindSeatIndex:
          session?.bigBlindSeatIndex ?? state.bigBlindSeatIndex,
        smallBlind: table.smallBlind || 0,
        bigBlind: table.bigBlind || 0,
        maxBuyIn: table.maxBuyIn || 0,
        minBuyIn: table.minBuyIn || 0,
        maxPlayers: table.maxPlayers || 8,
        turnPlayer: session?.turnPlayer ?? state.turnPlayer,
        currentBets: session?.currentBets || state.currentBets,
        currentPot: shouldPreservePot
          ? state.currentPot
          : session?.currentPot || state.currentPot,
        currentPlayerSeat:
          session?.currentPlayerSeat ?? state.currentPlayerSeat,
        state: newState,
        communityCards: session?.communityCards ?? state.communityCards,
        turnStartTime: session?.turnStartTime ?? state.turnStartTime,
        botsAloneSecondsLeft: botsAloneSecondsLeft ?? state.botsAloneSecondsLeft,
      };
    }
    case "PLAYER_ACTION": {
      const {
        actionType,
        seatId,
        amount = 0,
        updatedStack,
        cards = [],
        currentPot,
        currentBets,
        actionId,
        optimistic,
      } = action.data;

      if (actionId && state.lastActions?.[actionId]) return state;

      const seat = state.seats[seatId];
      if (!seat) return state;
      const formattedAmount = formatAmount(amount);

      const lastActionText =
        actionType === "FOLD"
          ? "Fold"
          : actionType === "CALL"
            ? `Call ${formattedAmount}`
            : actionType === "RAISE"
              ? `Raise ${formattedAmount}`
              : actionType === "ALL_IN"
                ? "All-in"
                : actionType === "CHECK"
                  ? "Check"
                  : actionType === "REVEAL_CARDS"
                    ? "Reveal"
                    : actionType === "HIDE_CARDS"
                      ? "Muck"
                      : actionType === "AUTO_MUCK"
                        ? "Auto-Muck"
                        : "";

      const stack =
        updatedStack ?? (seat.stack ?? 0) - (optimistic ? 0 : amount);
      const isAllIn = amount >= stack + amount;
      const isFolding = actionType === "FOLD";
      const isShowdownAction =
        actionType === "REVEAL_CARDS" ||
        actionType === "HIDE_CARDS" ||
        actionType === "AUTO_MUCK";

      const holeCards =
        cards.length > 0
          ? cards.map((c: GameCard) => ({
              ...c,
            }))
          : (seat.holeCards ?? []);

      const seatChanged =
        seat.isFolded !== (seat.isFolded || isFolding) ||
        seat.isAllIn !== (isAllIn || actionType === "ALL_IN") ||
        seat.stack !== stack ||
        seat.lastActionText !== lastActionText ||
        holeCards.length !== (seat.holeCards?.length ?? 0) ||
        (isShowdownAction && !seat.hasActedShowdown);

      if (!seatChanged && !currentPot && !currentBets && !actionId) {
        return state;
      }

      const newSeats = seatChanged
        ? state.seats.map((s, idx) =>
            idx === seatId
              ? {
                  ...s,
                  isFolded: seat.isFolded || isFolding,
                  isAllIn: isAllIn || actionType === "ALL_IN",
                  stack,
                  holeCards,
                  lastActionText,
                  hasActedShowdown: isShowdownAction ? true : s.hasActedShowdown,
                }
              : s,
          )
        : state.seats;

      const isShowdownOrFinished =
        state.state === "SHOWDOWN" || state.state === "FINISHED";
      const shouldPreservePot =
        isShowdownOrFinished && currentPot === 0 && state.currentPot > 0;

      return {
        ...state,
        seats: newSeats,
        currentPot: shouldPreservePot
          ? state.currentPot
          : (currentPot ?? state.currentPot),
        currentBets: currentBets ?? state.currentBets,
        lastActions: {
          ...state.lastActions,
          ...(actionId ? { [actionId]: "applied" } : {}),
        },
      };
    }

    case "TURN_UPDATE": {
      const { currentPlayerSeat, isAuto, turnStartTime } = action.data;
      return {
        ...state,
        currentPlayerSeat: currentPlayerSeat ?? state.currentPlayerSeat,
        turnPlayer: state.seats[currentPlayerSeat]?.user || null,
        isAuto: isAuto ?? false,
        turnStartTime: turnStartTime ?? state.turnStartTime,
      };
    }
    case "COMBINED_SPLIT_POT": {
      const { hands, sidePots, stacks, communityCards } = action.data;

      // Hand has resolved: the per-hand all-in flag is no longer meaningful,
      // and the previous "All-in" action label should give way to the
      // winner's stack. Clear them on every seat, then merge in the
      // hand-specific updates (stack, winner, winnings) for seats with hand
      // data.
      const updatedSeats = state.seats.map((seat, idx) => {
        const hand = hands?.[idx];

        const cleared = {
          ...seat,
          isAllIn: false,
          lastActionText: "",
        };

        if (!hand) return cleared;

        const revealedHoleCards =
          hand.holeCards && hand.holeCards.length > 0
            ? hand.holeCards.map((c: GameCard) => ({ ...c }))
            : seat.holeCards;

        return {
          ...cleared,
          stack: stacks?.[idx] ?? seat.stack,
          isWinner: hand.isWinner ?? seat.isWinner,
          netResult: hand.netResult ?? seat.netResult,
          winnings: hand.winnings ?? seat.winnings,
          holeCards: revealedHoleCards,
        };
      });

      return {
        ...state,
        combinedSplitPot: { hands, sidePots, stacks, communityCards },
        seats: updatedSeats,
      };
    }
    case "AUTH":
      return {
        ...state,
        isAuthenticated: true,
        usableBalance: action.data.balance ?? 0,
        currentUser: action.data.user,
      };

    case "HOLE_CARDS_UPDATE": {
      const payload: { [seatId: number]: GameCard[] } = action.payload;

      let hasChanges = false;
      const newSeats = state.seats.map((seat, idx) => {
        const cardsForSeat = payload[idx];
        if (!cardsForSeat) return seat;

        hasChanges = true;

        const mappedCards = cardsForSeat.map((c: GameCard) => ({
          ...c,
        }));

        return {
          ...seat,
          holeCards: mappedCards,
        };
      });

      return hasChanges ? { ...state, seats: newSeats } : state;
    }

    default:
      return state;
  }
}
