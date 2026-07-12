import { useState, useRef, useCallback, useEffect, useMemo, memo } from "react";
import type { User } from "../../api/user";
import type { GameState } from "../../types/gameTypes";
import type { GamePlayer, GameCard } from "../../api/game";
import ConfirmFoldModal from "../../components/modals/ConfirmFoldModal";
import { useDesktopSettings } from "../../components/context/DesktopSettingsContext";

function formatAmount(amount: number): string {
  if (amount >= 1_000_000) return (amount / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (amount >= 1_000) return (amount / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return amount.toString();
}

function PokerActions({
  player,
  turnPlayer,
  isFolded,
  isAllIn,
  currentBet,
  currentRequiredBet,
  currentPot,
  stack,
  minRaise,
  sendAction,
  isAuto,
  gameState,
  GamePlayer,
  socketReady,
  subscribe,
  isDealing,
}: {
  player: User | null;
  turnPlayer: User | null;
  isFolded: boolean;
  isAllIn: boolean;
  currentBet: number;
  currentRequiredBet: number;
  currentPot: number;
  stack: number;
  minRaise: number;
  sendAction: (action: string, amount?: number) => void;
  isHandOver: boolean;
  isAuto: boolean;
  gameState: GameState;
  GamePlayer: GamePlayer | undefined;
  holeCards: GameCard[];
  socketReady: boolean;
  subscribe?: () => void;
  isDealing?: boolean;
}) {
  const { settings } = useDesktopSettings();
  const [showFoldConfirm, setShowFoldConfirm] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState(0);
  const [showRaisePanel, setShowRaisePanel] = useState(false);

  const raisePanelRef = useRef<HTMLDivElement>(null);
  const raiseButtonRef = useRef<HTMLButtonElement>(null);

  const isPlayerTurn = useMemo(() => turnPlayer?.userId === player?.userId, [turnPlayer?.userId, player?.userId]);
  const toCall = useMemo(() => Math.max(0, currentRequiredBet - currentBet), [currentRequiredBet, currentBet]);

  const bigBlind = gameState.bigBlind || gameState.smallBlind || 1;
  const minRaiseAmount = Math.max(minRaise, bigBlind);

  const gameVariant = gameState.tablestate?.gameVariant || "TEXAS";
  const isOmaha = gameVariant === "OMAHA";

  const maxPotLimitRaise = useMemo(() => {
    if (!isOmaha) return stack;

    const potAfterCall = currentPot + toCall;
    const maxRaise = potAfterCall + toCall;

    return Math.min(stack, maxRaise);
  }, [isOmaha, currentPot, toCall, stack]);

  const minAllowedRaise = Math.min(stack, toCall + minRaiseAmount);
  const maxAllowedRaise = isOmaha ? maxPotLimitRaise : stack;

  const isShowdown = gameState.state === "SHOWDOWN";

  const isInBettingPhase = useMemo(() => {
    return gameState.state === "PRE_FLOP" || gameState.state === "FLOP" || gameState.state === "TURN" || gameState.state === "RIVER";
  }, [gameState.state]);

  const canShowActions = useMemo(() => {
    const conditions = {
      hasGamePlayer: Boolean(GamePlayer),
      isPlayerTurn,
      notFolded: !isFolded,
      notAllIn: !isAllIn,
      hasStack: stack > 0,
      isInBettingPhase,
      notShowdown: gameState.state !== "SHOWDOWN",
      notAuto: !isAuto,
      notTimeoutActed: !GamePlayer?.isTimeoutActed,
      notDisconnected: !GamePlayer?.isDisconnected,
      // Hold the action panel until the deal animation has finished — the
      // user shouldn't see Check / Call / Raise before their cards land.
      notDealing: !isDealing,
    };

    return Object.values(conditions).every(Boolean);
  }, [GamePlayer, isPlayerTurn, isFolded, isAllIn, stack, isInBettingPhase, gameState.state, isAuto, isDealing]);

  const canShowShowdownActions = useMemo(() => {
    const conditions = {
      hasGamePlayer: Boolean(GamePlayer),
      isPlayerTurn,
      isShowdown,
      notAuto: !isAuto,
      notActed: !GamePlayer?.hasActedShowdown,
      notDisconnected: !GamePlayer?.isDisconnected,
    };

    return Object.values(conditions).every(Boolean);
  }, [GamePlayer, isPlayerTurn, isShowdown, isAuto]);

  const safeSendAction = useCallback(
    (action: string, amount?: number) => {
      if (!socketReady) return;
      sendAction(action, amount);
    },
    [socketReady, sendAction],
  );

  useEffect(() => {
    if (!showRaisePanel && selectedAmount !== minAllowedRaise) {
      setSelectedAmount(minAllowedRaise);
    }
  }, [minAllowedRaise, showRaisePanel, selectedAmount]);

  useEffect(() => {
    if (!showRaisePanel) return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!raisePanelRef.current?.contains(target) && !raiseButtonRef.current?.contains(target)) {
        setShowRaisePanel(false);
      }
    };

    document.addEventListener("click", handleClick, { passive: true });
    return () => document.removeEventListener("click", handleClick);
  }, [showRaisePanel]);

  const handleFoldClick = useCallback(() => {
    if (settings["confirmCheckFold"]) {
      setShowFoldConfirm(true);
    } else {
      safeSendAction("FOLD", 0);
    }
  }, [settings, safeSendAction]);

  const handleCallClick = useCallback(() => {
    const callAmount = Math.min(stack, Math.max(0, currentRequiredBet - currentBet));
    safeSendAction(callAmount === 0 ? "CHECK" : "CALL", callAmount);
  }, [stack, currentRequiredBet, currentBet, safeSendAction]);

  // const handleRaiseClick = useCallback(() => {
  //   if (showRaisePanel) {
  //     let finalAmount = selectedAmount;

  //     if (finalAmount > maxAllowedRaise) {
  //       finalAmount = maxAllowedRaise;
  //     }

  //     if (finalAmount < minAllowedRaise && finalAmount !== stack) {
  //       finalAmount = Math.min(stack, minAllowedRaise);
  //     }

  //     safeSendAction("RAISE", finalAmount);
  //     setShowRaisePanel(false);
  //   } else {
  //     setShowRaisePanel(true);
  //   }
  // }, [showRaisePanel, selectedAmount, stack, minAllowedRaise, maxAllowedRaise, safeSendAction]);

  const presets = useMemo(() => {
    const allIn = Math.min(stack, maxAllowedRaise);
    const potRaise = Math.min(maxAllowedRaise, Math.max(minAllowedRaise, toCall + currentPot));
    const threeFourthsPot = Math.min(maxAllowedRaise, Math.max(minAllowedRaise, Math.floor(toCall + (currentPot * 3) / 4)));
    const halfPot = Math.min(maxAllowedRaise, Math.max(minAllowedRaise, Math.floor(toCall + currentPot / 2)));

    return [
      { label: isOmaha ? "Max" : "All-in", value: allIn },
      { label: "Pot", value: potRaise },
      { label: "¾ Pot", value: threeFourthsPot },
      { label: "½ Pot", value: halfPot },
    ];
  }, [stack, minAllowedRaise, maxAllowedRaise, toCall, currentPot, isOmaha]);

  const callButtonText = useMemo(
    () => (currentBet >= currentRequiredBet ? "Check" : `Call ${formatAmount(Math.min(stack, toCall))}`),
    [currentBet, currentRequiredBet, stack, toCall],
  );

  const raiseButtonText = useMemo(() => {
    if (selectedAmount >= maxAllowedRaise && isOmaha && maxAllowedRaise < stack) {
      return `Pot Limit ${formatAmount(selectedAmount)}`;
    }
    if (selectedAmount >= stack) {
      return "All in";
    }
    return `Raise ${formatAmount(selectedAmount)}`;
  }, [selectedAmount, stack, maxAllowedRaise, isOmaha]);

  const isDisconnected = GamePlayer?.isDisconnected || GamePlayer?.isSittingOut || GamePlayer?.isTimeoutActed;

  const showReconnectButton = isDisconnected && GamePlayer && subscribe;
  // const needsShowdownDecision = isShowdown && isPlayerTurn && !GamePlayer?.hasActedShowdown;

  return (
    <div className="poker-actions-container">
      <div className="poker-actions-inner">
        {showReconnectButton && (
          <div className="poker-actions-buttons">
            <button className="poker-action-button reconnect" onClick={subscribe}>
              <span>Дахин холбогдох</span>
            </button>
          </div>
        )}
        {showRaisePanel && canShowActions && (
          <div ref={raisePanelRef} className="raise-section">
            <div className="preset-buttons-group">
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  flex: 1,
                  alignItems: "flex-end",
                }}
              >
                {presets.map(({ label, value }) => (
                  <button key={label} onClick={() => setSelectedAmount(value)}>
                    {label}
                  </button>
                ))}
                <div className="raise-input-wrapper">
                  <input
                    type="number"
                    className="raise-input no-spin"
                    value={selectedAmount === 0 ? "" : selectedAmount}
                    min={minAllowedRaise}
                    max={maxAllowedRaise}
                    onChange={(e) => {
                      const numValue = parseInt(e.target.value, 10) || 0;
                      const clampedValue = Math.min(maxAllowedRaise, Math.max(0, numValue));
                      setSelectedAmount(clampedValue);
                    }}
                  />
                </div>
              </div>
              <div className="raise-slider-wrapper">
                <span
                  style={{
                    fontSize: "11px",
                    color: "rgba(255, 255, 255, 0.7)",
                    fontWeight: 600,
                  }}
                >
                  {formatAmount(maxAllowedRaise)}
                </span>
                <input
                  type="range"
                  className="raise-slider"
                  value={selectedAmount}
                  min={minAllowedRaise}
                  max={maxAllowedRaise}
                  step={Math.max(1, Math.floor((maxAllowedRaise - minAllowedRaise) / 100))}
                  onChange={(e) => {
                    const numValue = parseInt(e.target.value, 10) || minAllowedRaise;
                    setSelectedAmount(numValue);
                  }}
                />
                <span
                  style={{
                    fontSize: "11px",
                    color: "rgba(255, 255, 255, 0.7)",
                    fontWeight: 600,
                  }}
                >
                  {formatAmount(minAllowedRaise)}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="poker-actions-buttons">
          {canShowShowdownActions && (
            <>
              <button
                className="poker-action-button muck"
                disabled={!socketReady}
                onClick={() => {
                  safeSendAction("HIDE_CARDS", 0);
                }}
              >
                <span>Muck</span>
              </button>

              <button
                className="poker-action-button reveal"
                disabled={!socketReady}
                onClick={() => {
                  safeSendAction("REVEAL_CARDS", 0);
                }}
              >
                <span>Show</span>
              </button>
            </>
          )}

          {canShowActions && (
            <>
              <button className="poker-action-button fold" disabled={!socketReady} onClick={handleFoldClick}>
                <span>Fold</span>
              </button>

              <button className="poker-action-button call" disabled={!socketReady} onClick={handleCallClick}>
                <span>{callButtonText}</span>
              </button>

              <button
                ref={raiseButtonRef}
                className="poker-action-button raise"
                disabled={!socketReady}
                onClick={() => {
                  if (!showRaisePanel) {
                    setShowRaisePanel(true);
                  } else {
                    safeSendAction("RAISE", selectedAmount);
                    setShowRaisePanel(false);
                    setSelectedAmount(minAllowedRaise);
                  }
                }}
              >
                <span>{raiseButtonText}</span>
              </button>
            </>
          )}
        </div>

        {/* Confirm fold modal */}
        <ConfirmFoldModal
          open={showFoldConfirm}
          onConfirm={() => {
            safeSendAction("FOLD", 0);
            setShowFoldConfirm(false);
          }}
          onCancel={() => setShowFoldConfirm(false)}
          title="Та хаяхдаа итгэлтэй байна уу?"
          confirmText="Тийм"
          cancelText="Үгүй"
        />
      </div>
    </div>
  );
}

export default memo(PokerActions, (prev, next) => {
  return (
    prev.turnPlayer?.userId === next.turnPlayer?.userId &&
    prev.player?.userId === next.player?.userId &&
    prev.isFolded === next.isFolded &&
    prev.isAllIn === next.isAllIn &&
    prev.currentBet === next.currentBet &&
    prev.currentRequiredBet === next.currentRequiredBet &&
    prev.stack === next.stack &&
    prev.socketReady === next.socketReady &&
    prev.isAuto === next.isAuto &&
    prev.gameState.state === next.gameState.state &&
    prev.GamePlayer?.isTimeoutActed === next.GamePlayer?.isTimeoutActed &&
    prev.GamePlayer?.isDisconnected === next.GamePlayer?.isDisconnected &&
    prev.GamePlayer?.hasActedShowdown === next.GamePlayer?.hasActedShowdown &&
    prev.isDealing === next.isDealing
  );
});
