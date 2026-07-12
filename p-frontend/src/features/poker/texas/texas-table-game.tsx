import {
  useEffect,
  useLayoutEffect,
  useReducer,
  useCallback,
  useMemo,
  Suspense,
  lazy,
  memo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router";
import { useMeQuery } from "../../../api/user";
import { useGame } from "../../../providers/GameProvider";
import { useIsMobile } from "../../../hooks/useIsMobile.tsx";
import DesktopTableActionButtons from "../DesktopTableActionButtons.tsx";
import formatAmount from "../../../utils/formatNumber.ts";
import TexasTablePlayerSeats from "./texas-table-player-seats";
import PotChips from "../PotChips.tsx";
import TexasTableRechargeForm from "./texas-table-recharge-form";
import type { HandHistory, GamePlayer } from "../../../api/game.ts";
import { useLocation } from "react-router";
import CardDealingAnimation from "../../../components/CardDealingAnimation.tsx";
import PotPayoutAnimation, {
  type PayoutWinner,
} from "../../../components/PotPayoutAnimation.tsx";

const PokerTableSVG = lazy(() => import("../../../components/PokerTableSVG"));
const PokerTableMobile = lazy(
  () => import("../../../components/PokerTableSVGMobile"),
);
const PokerChat = lazy(() => import("../poker-chat"));
const PokerActions = lazy(() => import("../poker-actions"));
const TexasTableCommunityCards = lazy(
  () => import("./texas-table-community-cards"),
);

const MemoDesktopTableActions = memo(DesktopTableActionButtons);
const MemoSeats = memo(TexasTablePlayerSeats);
const MemoPotChips = memo(PotChips);
const MemoCommunityCards = memo(TexasTableCommunityCards);
const MemoPokerActions = PokerActions;

function getElapsedSeconds(seatedAt?: number | null) {
  if (!seatedAt) return 0;
  return Math.floor((Date.now() - seatedAt) / 1000);
}

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

type State = {
  toastMsg: string | null;
  showHistory: boolean;
  historyLimit: number;
  handHistory: HandHistory[];
  modalType: string | null;
  selectedSeat: number | null;
  allInPlayers: Record<number, boolean>;
  rechargeAmount: number;
};

const initialState: State = {
  toastMsg: null,
  showHistory: false,
  historyLimit: 10,
  handHistory: [],
  modalType: null,
  selectedSeat: null,
  allInPlayers: {},
  rechargeAmount: 0,
};

type Action =
  | { type: "SET_TOAST"; payload: string | null }
  | { type: "SET_SHOW_HISTORY"; payload: boolean }
  | { type: "SET_HISTORY_LIMIT"; payload: number }
  | { type: "SET_HAND_HISTORY"; payload: HandHistory[] }
  | { type: "SET_MODAL_TYPE"; payload: string | null }
  | { type: "SET_SELECTED_SEAT"; payload: number | null }
  | { type: "SET_ALL_IN_PLAYERS"; payload: Record<number, boolean> }
  | { type: "SET_RECHARGE_AMOUNT"; payload: number }
  | { type: "BATCH_UPDATE"; payload: Partial<State> };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_TOAST":
      return { ...state, toastMsg: action.payload };
    case "SET_SHOW_HISTORY":
      return { ...state, showHistory: action.payload };
    case "SET_HISTORY_LIMIT":
      return { ...state, historyLimit: action.payload };
    case "SET_HAND_HISTORY":
      return { ...state, handHistory: action.payload };
    case "SET_MODAL_TYPE":
      return { ...state, modalType: action.payload };
    case "SET_SELECTED_SEAT":
      return { ...state, selectedSeat: action.payload };
    case "SET_ALL_IN_PLAYERS":
      return { ...state, allInPlayers: action.payload };
    case "SET_RECHARGE_AMOUNT":
      return { ...state, rechargeAmount: action.payload };
    case "BATCH_UPDATE":
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

function formatGameVariant(variant?: string) {
  if (!variant) return "";

  const mapping: Record<string, string> = {
    TEXAS: "Холдем хязгааргүй",
    OMAHA: "Пот лимит Омаха ",
  };

  return mapping[variant] || variant;
}

export default function TexasTableGame() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const {
    gameState,
    chats,
    ws,
    socketReady,
    tableId,
    destinedCommunityCards,
    dealTrigger,
    rechargeEvent,
    recharge,
    takeSeat,
    leaveSeat,
    sendGameAction,
    sendChat,
  } = useGame();
  const token = localStorage.getItem("accessToken");
  const { data: userInfo } = useMeQuery(undefined, { skip: !token });
  const isAdmin = userInfo?.role === "ADMIN";
  const location = useLocation();
  const lastAction = useMemo(() => {
    const seatWithAction = gameState.seats.find(
      (s): s is typeof s & { lastActionText: string } =>
        typeof s?.lastActionText === "string" && s.lastActionText.trim() !== "",
    );

    if (!seatWithAction) return null;

    return {
      username: seatWithAction.user?.username ?? "Unknown",
      message: seatWithAction.lastActionText,
    };
  }, [gameState.seats]);

  const lastActionRef = useRef<string | null>(null);

  const filteredLastAction = useMemo(() => {
    if (!lastAction) return null;

    const key = `${lastAction.username}-${lastAction.message}`;

    if (lastActionRef.current === key) return null;

    lastActionRef.current = key;
    return lastAction;
  }, [lastAction]);

  const winners = useMemo(() => {
    if (gameState.state !== "FINISHED") return [];

    const hands = gameState.combinedSplitPot?.hands;

    if (!hands) return [];

    return Object.values(hands)
      .filter((hand: Partial<GamePlayer>) => hand.isWinner)
      .map((hand: Partial<GamePlayer>) => ({
        username: hand.user?.username ?? "Unknown",
        amount: hand.winnings ?? hand.netResult ?? 0,
        cards: hand.holeCards ?? [],
      }));
  }, [gameState]);

  const tableFromState = location.state?.table;

  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    // Reset all-in players when game resets
    if (
      ["WAITING_FOR_PLAYERS", "PRE_FLOP", "FINISHED"].includes(gameState.state)
    ) {
      if (Object.keys(state.allInPlayers).length > 0) {
        dispatch({ type: "SET_ALL_IN_PLAYERS", payload: {} });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- this effect dispatches SET_ALL_IN_PLAYERS; depending on state.allInPlayers would loop
  }, [gameState.state]);

  useEffect(() => {
    // Set initial recharge amount only once
    if (gameState.minBuyIn && state.rechargeAmount === 0) {
      dispatch({ type: "SET_RECHARGE_AMOUNT", payload: gameState.minBuyIn });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sets the recharge amount once; depending on state.rechargeAmount would loop
  }, [gameState.minBuyIn]);

  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  const userId = userInfo?.userId;
  const seats = useMemo(() => gameState.seats || [], [gameState.seats]);
  const currentGameState = gameState.state;
  const maxPlayers = gameState.maxPlayers;
  const currentPotValue = gameState.currentPot;
  const currentBets = useMemo(() => gameState.currentBets || {}, [gameState.currentBets]);
  const bigBlind = gameState.bigBlind;
  const currentPlayerSeat = gameState.currentPlayerSeat;
  const turnPlayer = gameState.turnPlayer;
  const isFolded = gameState.isFolded;
  const isAllIn = gameState.isAllIn;
  const isAuto = gameState.isAuto;
  const isAuthenticated = gameState.isAuthenticated;
  const normalizedSeats = useMemo(
    () =>
      Array.from({ length: maxPlayers }, (_, i) => {
        const seat = seats.find((s) => s.seatId === i);
        return {
          seatIndex: i,
          user: seat?.user ?? null,
          stack: seat?.stack ?? 0,
          isDisconnected: seat?.isDisconnected ?? false,
        };
      }),
    [seats, maxPlayers],
  );

  const userHasSeat = useMemo(
    () => !!userId && seats.some((s) => s.user?.userId === userId),
    [userId, seats],
  );

  const playerSeat = useMemo(
    () => (userId ? seats.find((s) => s.user?.userId === userId) : undefined),
    [userId, seats],
  );

  const holeCards = useMemo(
    () => playerSeat?.holeCards || [],
    [playerSeat?.holeCards],
  );

  // Auto-open recharge modal when the hand ends (FINISHED) and the player has
  // 0 chips. Triggering on FINISHED guarantees we catch every hand conclusion
  // even when WAITING_FOR_PLAYERS is skipped and the next hand starts immediately.
  // Delayed 4 s so the winner animation / pot distribution has time to finish.
  const prevGameStateRef = useRef<string | undefined>(undefined);
  const rechargeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const prev = prevGameStateRef.current;
    const curr = currentGameState;
    prevGameStateRef.current = curr;

    if (
      curr === "FINISHED" &&
      prev !== "FINISHED" &&
      prev !== undefined &&
      playerSeat?.stack === 0 &&
      state.modalType !== "RECHARGE"
    ) {
      if (rechargeTimerRef.current) clearTimeout(rechargeTimerRef.current);
      rechargeTimerRef.current = setTimeout(() => {
        dispatch({ type: "SET_MODAL_TYPE", payload: "RECHARGE" });
        rechargeTimerRef.current = null;
      }, 4000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- edge-triggered on the FINISHED transition via prevGameStateRef; intentionally not re-run on playerSeat.stack / state.modalType
  }, [currentGameState]);

  // Clear timer on unmount only
  useEffect(() => {
    return () => {
      if (rechargeTimerRef.current) clearTimeout(rechargeTimerRef.current);
    };
  }, []);

  const userSeatIndex = useMemo(
    () => seats.findIndex((s) => s.user?.userId === userId),
    [seats, userId],
  );

  const isHandOver = useMemo(
    () => ["FINISHED", "WAITING_FOR_PLAYERS"].includes(currentGameState),
    [currentGameState],
  );

  const totalBets = useMemo(
    () => Object.values(currentBets).reduce((a, b) => a + b, 0),
    [currentBets],
  );

  const lastPotRef = useRef(0);
  const currentPot = useMemo(() => {
    const calculatedPot = currentPotValue + totalBets;
    if (currentGameState === "WAITING_FOR_PLAYERS") {
      lastPotRef.current = 0;
      return 0;
    }
    if (calculatedPot > 0) {
      lastPotRef.current = calculatedPot;
      return calculatedPot;
    }
    if (calculatedPot === 0 && lastPotRef.current > 0) {
      return lastPotRef.current;
    }

    return calculatedPot;
  }, [currentPotValue, totalBets, currentGameState]); // Removed isAuto - not used in calculation

  const minRaise = useMemo(
    () => Math.max(bigBlind, totalBets - (currentBets[currentPlayerSeat] || 0)),
    [bigBlind, totalBets, currentBets, currentPlayerSeat],
  );

  const displayedSeats = useMemo(
    () =>
      seats.length
        ? seats
        : Array(maxPlayers).fill({
            seatIndex: 0,
            user: null,
            stack: 0,
            isActive: false,
          }),
    [seats, maxPlayers],
  );

  const tableSeats = useMemo(
    () => seats?.filter((s) => s?.user) || [],
    [seats],
  );

  const showToast = useCallback((msg: string) => {
    dispatch({ type: "SET_TOAST", payload: msg });
    setTimeout(() => dispatch({ type: "SET_TOAST", payload: null }), 3000);
  }, []);

  const handleSeatClick = useCallback(
    (idx: number | null) => {
      if (!isAuthenticated) return showToast("Холбогдоно уу");
      dispatch({
        type: "BATCH_UPDATE",
        payload: {
          selectedSeat: idx,
          modalType: idx !== null ? "TAKE_SEAT" : null,
        },
      });
    },
    [isAuthenticated, showToast],
  );

  const handleTakeSeat = useCallback(
    (idx: number, amount: number, isBot = false, botName?: string, isGoodBot = false, botAvatar?: string) => {
      takeSeat(idx, amount, isBot, botName, isGoodBot, botAvatar);
      if (botAvatar) {
        setBotAvatarMap((prev) => ({ ...prev, [idx]: botAvatar }));
      }
      dispatch({
        type: "BATCH_UPDATE",
        payload: { modalType: null, selectedSeat: null },
      });
    },
    [takeSeat],
  );

  const handleRecharge = useCallback(
    (amt: number) => {
      if (!isAuthenticated) return showToast("Холбогдоно уу");
      recharge(amt);
      dispatch({ type: "SET_MODAL_TYPE", payload: null });
    },
    [isAuthenticated, recharge, showToast],
  );

  const handleCloseModal = useCallback(() => {
    dispatch({
      type: "BATCH_UPDATE",
      payload: { modalType: null, selectedSeat: null },
    });
  }, []);

  const subscribeCallback = useCallback(
    () =>
      ws.current?.send(
        JSON.stringify({
          type: "TABLE",
          data: { tableId: Number(tableId), action: "RECONNECT" },
        }),
      ),
    [ws, tableId],
  );

  const actionButtonsGameState = useMemo(
    () => ({ ...gameState, seats: tableSeats }),
    [gameState, tableSeats],
  );
  const seatsGameState = useMemo(
    () => ({ ...gameState, seats: displayedSeats }),
    [gameState, displayedSeats],
  );
  const potAmountFormatted = formatAmount(currentPot);

  // dealTrigger increments in useTexasTable exactly when the server sends
  // GAME_STATE_UPDATE → PRE_FLOP (a real new hand). It never fires on
  // subscribe/UPDATE_TABLE, so switching tables and coming back never
  // replays the deal animation.
  const [dealRound, setDealRound] = useState(0);
  const [isDealing, setIsDealing] = useState(false);
  // useLayoutEffect runs synchronously before the browser paints, so isDealing
  // is true by the time the first frame is drawn — preventing the brief card
  // flash that occurred when useEffect ran after the render with cardsReady=true.
  useLayoutEffect(() => {
    if (dealTrigger <= 0) return;
    setDealRound((r) => r + 1);
    setIsDealing(true);
  }, [dealTrigger]);
  const handleDealComplete = useCallback(() => setIsDealing(false), []);

  // Pot → winners payout: detect when winners arrive (combinedSplitPot.hands)
  // and bump payoutKey to retrigger the chip-flight animation.
  const [payoutKey, setPayoutKey] = useState(0);
  const [isPayingOut, setIsPayingOut] = useState(false);
  const [payoutWinners, setPayoutWinners] = useState<PayoutWinner[]>([]);
  const payoutFingerprint = useMemo(() => {
    const hands = gameState.combinedSplitPot?.hands;
    if (!hands) return "";
    return Object.entries(hands)
      .filter(
        ([, h]: [string, Partial<GamePlayer>]) => h?.isWinner && (h?.winnings ?? 0) > 0,
      )
      .map(([s, h]: [string, Partial<GamePlayer>]) => `${s}:${h.winnings}`)
      .sort()
      .join(",");
  }, [gameState.combinedSplitPot]);
  const prevPayoutFingerprintRef = useRef("");
  useEffect(() => {
    if (
      payoutFingerprint &&
      payoutFingerprint !== prevPayoutFingerprintRef.current
    ) {
      prevPayoutFingerprintRef.current = payoutFingerprint;
      const hands = gameState.combinedSplitPot?.hands ?? {};
      const ws: PayoutWinner[] = Object.entries(hands)
        .filter(
          ([, h]: [string, Partial<GamePlayer>]) =>
            h?.isWinner && (h?.winnings ?? 0) > 0,
        )
        .map(([s, h]: [string, Partial<GamePlayer>]) => ({
          seatIndex: parseInt(s, 10),
          amount: h.winnings ?? 0,
        }));
      setPayoutWinners(ws);
      setPayoutKey((k) => k + 1);
      setIsPayingOut(true);
    }
    if (!payoutFingerprint) {
      prevPayoutFingerprintRef.current = "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- edge-triggered on payoutFingerprint (derived from combinedSplitPot); hands are read fresh at trigger time
  }, [payoutFingerprint]);
  // After the chips fly to the winner, keep the middle pot hidden until
  // new chips actually enter the pot for the next hand.
  const [potConsumed, setPotConsumed] = useState(false);
  const handlePayoutComplete = useCallback(() => {
    lastPotRef.current = 0;
    setPotConsumed(true);
    setIsPayingOut(false);
  }, []);
  useEffect(() => {
    if (currentPotValue + totalBets > 0) {
      setPotConsumed(false);
    }
  }, [currentPotValue, totalBets]);

  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      forceUpdate((n) => n + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Latest chat message per username, shown as a speech bubble next to the
  // player's avatar. Each new message resets that user's auto-clear timer.
  // Chats arrive batched (100ms debounce in useTexasTable), so we process
  // every new entry since the last run, not just the tail.
  const CHAT_BUBBLE_TTL_MS = 2000;
  const [chatBubbles, setChatBubbles] = useState<Record<string, string>>({});
  const botAvatarStorageKey = tableId ? `bot_avatars_${tableId}` : null;
  const [botAvatarMap, setBotAvatarMap] = useState<Record<number, string>>(() => {
    if (!tableId) return {};
    try {
      const stored = localStorage.getItem(`bot_avatars_${tableId}`);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });
  useEffect(() => {
    if (!botAvatarStorageKey) return;
    localStorage.setItem(botAvatarStorageKey, JSON.stringify(botAvatarMap));
  }, [botAvatarMap, botAvatarStorageKey]);

  const lastProcessedChatLenRef = useRef(0);
  const bubbleTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {},
  );
  useEffect(() => {
    if (chats.length < lastProcessedChatLenRef.current) {
      // Chats array shrank (table switch reset) — reset our cursor.
      lastProcessedChatLenRef.current = 0;
    }
    const fresh = chats.slice(lastProcessedChatLenRef.current);
    if (fresh.length === 0) return;
    lastProcessedChatLenRef.current = chats.length;

    fresh.forEach((chat) => {
      const username = chat.username;
      const message = chat.message;
      if (!username || !message) return;

      if (bubbleTimersRef.current[username]) {
        clearTimeout(bubbleTimersRef.current[username]);
      }

      setChatBubbles((prev) => ({ ...prev, [username]: message }));

      bubbleTimersRef.current[username] = setTimeout(() => {
        setChatBubbles((prev) => {
          const next = { ...prev };
          delete next[username];
          return next;
        });
        delete bubbleTimersRef.current[username];
      }, CHAT_BUBBLE_TTL_MS);
    });
  }, [chats]);
  useEffect(() => {
    return () => {
      Object.values(bubbleTimersRef.current).forEach((t) => clearTimeout(t));
      bubbleTimersRef.current = {};
    };
  }, []);

  // Recharge "+amount" bubble per seat. Each event from the server bumps
  // the seat's entry and schedules a 2s auto-clear.
  const RECHARGE_BUBBLE_TTL_MS = 2000;
  const [rechargeBubbles, setRechargeBubbles] = useState<
    Record<number, { amount: number; key: number }>
  >({});
  const rechargeTimersRef = useRef<
    Record<number, ReturnType<typeof setTimeout>>
  >({});
  const lastRechargeKeyRef = useRef<number | null>(null);
  useEffect(() => {
    if (!rechargeEvent) return;
    if (lastRechargeKeyRef.current === rechargeEvent.key) return;
    lastRechargeKeyRef.current = rechargeEvent.key;

    const { seatId, amount, key } = rechargeEvent;
    if (typeof seatId !== "number" || amount <= 0) return;

    if (rechargeTimersRef.current[seatId]) {
      clearTimeout(rechargeTimersRef.current[seatId]);
    }

    setRechargeBubbles((prev) => ({ ...prev, [seatId]: { amount, key } }));

    rechargeTimersRef.current[seatId] = setTimeout(() => {
      setRechargeBubbles((prev) => {
        const next = { ...prev };
        delete next[seatId];
        return next;
      });
      delete rechargeTimersRef.current[seatId];
    }, RECHARGE_BUBBLE_TTL_MS);
  }, [rechargeEvent]);
  useEffect(() => {
    return () => {
      Object.values(rechargeTimersRef.current).forEach((t) => clearTimeout(t));
      rechargeTimersRef.current = {};
    };
  }, []);

  return (
    <div className="container-vertical">
      {state.toastMsg && <div className="toast">{state.toastMsg}</div>}

      <Suspense fallback={null}>
        <MemoDesktopTableActions
          userHasSeat={userHasSeat}
          setModalType={(v) => dispatch({ type: "SET_MODAL_TYPE", payload: v })}
          navigate={navigate}
          gameState={actionButtonsGameState}
          tableId={tableId}
          leaveSeat={leaveSeat}
          userSeatIndex={userSeatIndex}
          setShowHistory={(v) =>
            dispatch({ type: "SET_SHOW_HISTORY", payload: v })
          }
        />
      </Suspense>

      <div className="table-container">
        <div
          className={`custom-login-modal ${state.modalType ? "modal-open" : "modal-hidden"}`}
          onClick={handleCloseModal}
        >
          <div
            className={`modal-content ${state.modalType ? "modal-content-open" : "modal-content-closed"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="modal-header">
              <h2>
                {state.modalType === "RECHARGE" ? "Цэнэглэх" : "Ширээнд суух"}
              </h2>
            </header>
            <TexasTableRechargeForm
              isActuallySeated={userHasSeat}
              modalType={state.modalType || ""}
              gameState={gameState}
              selectedSeat={state.selectedSeat ?? -1}
              takeSeat={handleTakeSeat}
              recharge={handleRecharge}
              setRechargeAmount={(amt) =>
                dispatch({ type: "SET_RECHARGE_AMOUNT", payload: amt })
              }
              rechargeAmount={state.rechargeAmount}
            />
          </div>
        </div>

        <div className="table-background">
          <div className="image-container">
            <Suspense fallback={null}>
              {isMobile ? <PokerTableMobile /> : <PokerTableSVG />}
            </Suspense>

            <CardDealingAnimation
              seatStates={normalizedSeats}
              cardsPerSeat={
                gameState.tablestate?.gameVariant === "OMAHA" ? 4 : 2
              }
              size={isMobile ? 16 : 52}
              dealRound={dealRound}
              onAnimationComplete={handleDealComplete}
            />

            <MemoSeats
              gameState={seatsGameState}
              userInfo={userInfo}
              seatCount={maxPlayers}
              isHandOver={isHandOver}
              allInPlayers={state.allInPlayers}
              setSelectedSeat={handleSeatClick}
              isDealing={isDealing}
              chatBubbles={chatBubbles}
              rechargeBubbles={rechargeBubbles}
              botAvatarMap={botAvatarMap}
            />

            <PotPayoutAnimation
              winners={payoutWinners}
              triggerKey={payoutKey}
              onComplete={handlePayoutComplete}
            />
          </div>

          <div className="table-inner-flex">
            <div
              className="pot-chips-container"
              style={{
                visibility: isPayingOut || potConsumed ? "hidden" : "visible",
              }}
            >
              <span>Бооцоо:</span>
              <span>{potAmountFormatted}</span>
              <MemoPotChips gameState={gameState} />
            </div>
            {gameState.currentPot > 0 && !isPayingOut && !potConsumed && (
              <div className="pot-chips-container-duplicate">
                <span>{potAmountFormatted}</span>
              </div>
            )}

            <Suspense fallback={null}>
              <MemoCommunityCards gameState={gameState} />
            </Suspense>
            <div className="tableDetails-onTable">
              <span className="table-name-details">
                {tableFromState.tableName} 💸
              </span>
              <span className="table-variant-details">
                {formatGameVariant(tableFromState.gameVariant)}
              </span>
              <span className="table-blinds-details">
                Стек: {tableFromState.smallBlind}/{tableFromState.bigBlind}
              </span>
            </div>
          </div>
        </div>
      </div>

      <Suspense fallback={null}>
        <PokerChat
          messages={chats}
          sendChat={sendChat}
          destinedCommunityCards={destinedCommunityCards}
          subscribe={subscribeCallback}
          player={playerSeat}
          lastAction={filteredLastAction}
          winners={winners}
          cgpScore={userInfo?.cgpScore ?? 0}
        />
      </Suspense>

      <Suspense fallback={null}>
        <MemoPokerActions
          stack={playerSeat?.stack || 0}
          player={userInfo ?? null}
          turnPlayer={turnPlayer}
          isFolded={isFolded || currentGameState === "FINISHED"}
          isAllIn={isAllIn}
          currentBet={currentBets[currentPlayerSeat] || 0}
          isAuto={isAuto}
          currentRequiredBet={Math.max(...Object.values(currentBets || {}), 0)}
          currentPot={currentPot}
          minRaise={minRaise}
          sendAction={sendGameAction}
          isHandOver={isHandOver}
          gameState={gameState}
          GamePlayer={playerSeat}
          holeCards={holeCards}
          socketReady={socketReady}
          subscribe={subscribeCallback}
          isDealing={isDealing}
        />
      </Suspense>

      {/* <Suspense fallback={null}>
        <HandHistoryList
          handHistory={state.handHistory}
          isLoading={isHistoryLoading}
          open={state.showHistory}
          onClose={() => dispatch({ type: "SET_SHOW_HISTORY", payload: false })}
          hasMore={fetchedHistory.length >= state.historyLimit}
          loadMore={loadMore}
        />
      </Suspense> */}

      {isAdmin && !isMobile && (
        <div className="players-time-panel">
          {seats
            .filter((s) => s.user)
            .map((s, i) => {
              return (
                <div key={i} className="player-time-row">
                  <span className="player-names">{s.user?.username}</span>

                  <span className="player-start">
                    {s.seatedAt
                      ? new Date(s.seatedAt).toLocaleTimeString()
                      : "--:--"}
                  </span>

                  <span className="player-running">
                    {s.seatedAt
                      ? `⏱ ${formatTime(getElapsedSeconds(s.seatedAt))}`
                      : "⏱ 00:00"}
                  </span>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
