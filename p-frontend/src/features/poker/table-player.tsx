import React, { useMemo, memo, useState, useEffect, useRef } from "react";
import type { GameCard, GamePlayer } from "../../api/game";
import type { GameState } from "../../types/gameTypes";
import type { User } from "../../api/user";
import HoleCardsHighlight from "../../components/HoleCardsHighlight";
import RechargeChipAnimation from "../../components/RechargeChipAnimation";
import PokerCard from "./poker-card";
import WinnerAnimation from "../../components/WinnerAnimation";
import { useIsMobile } from "../../hooks/useIsMobile";
import dealer from "../../assets/chips/D.svg";
import Avatar from "../../assets/image/avatar/6836.png";
import { playActionSound } from "../../utils/sounds";

import { useDesktopSettings } from "../../components/context/DesktopSettingsContext";

interface TablePlayerProps {
  userInfo?: User;
  seatIndex: number;
  player?: GamePlayer;
  isTurn: boolean;
  holeCards: GameCard[];
  gameState: GameState;
  isMe?: boolean;
  lastActionText?: string;
  isHandOver?: boolean;
  communityCards: GameCard[];
  allInPlayers: Record<number, boolean>;
  players: GamePlayer[];
  seatPosition?: { x: number; y: number };
  isFolded?: boolean;
  isDealing?: boolean;
  overrideAvatar?: string;
  chatBubble?: string;
  rechargeBubble?: { amount: number; key: number };
  usableBalance?: number;
}

const TablePlayer = (props: TablePlayerProps) => {
  const { seatIndex, player, isTurn, lastActionText, gameState, seatPosition, isMe, isFolded, holeCards, isDealing, chatBubble, rechargeBubble, overrideAvatar } =
    props;
  const isMobile = useIsMobile();
  const [turnKey, setTurnKey] = React.useState(0);
  const formatStack = (num: number) => num.toLocaleString("en-US");

  const { settings } = useDesktopSettings();
  const showStackAsBB = settings["showCashInBB"] ?? false;
  const stackDisplay = showStackAsBB ? ((player?.stack ?? 0) / (gameState.tablestate?.bigBlind ?? 1)).toFixed(2) : formatStack(player?.stack ?? 0);

  const handData = useMemo(() => gameState.combinedSplitPot?.hands?.[seatIndex], [gameState.combinedSplitPot, seatIndex]);
  const isWinner = handData?.isWinner ?? false;
  // const winningAmount = handData?.winnings ?? 0;
  const netProfit = handData?.netResult ?? 0;

  const variant = gameState.tablestate?.gameVariant ?? "TEXAS";

  const winnerAnimationMemo = useMemo(
    () => (isWinner && netProfit > 0 ? <WinnerAnimation winningAmount={netProfit} formatStack={formatStack} /> : null),
    [isWinner, netProfit],
  );

  // Show "Хаясан" briefly after a fold, then swap back to the player's
  // stack. Resets whenever the seat is no longer folded (next hand).
  const [foldLabelExpired, setFoldLabelExpired] = React.useState(false);
  React.useEffect(() => {
    if (!isFolded) {
      setFoldLabelExpired(false);
      return;
    }
    setFoldLabelExpired(false);
    const timer = setTimeout(() => setFoldLabelExpired(true), 2000);
    return () => clearTimeout(timer);
  }, [isFolded]);
  const showFoldLabel = !!isFolded && !foldLabelExpired;

  // Show "Бүгдийг нь" briefly after going all-in, then show the stack.
  // Resets when the all-in flag clears (hand ends or next hand).
  const [allInLabelExpired, setAllInLabelExpired] = React.useState(false);
  React.useEffect(() => {
    if (!player?.isAllIn) {
      setAllInLabelExpired(false);
      return;
    }
    setAllInLabelExpired(false);
    const timer = setTimeout(() => setAllInLabelExpired(true), 2000);
    return () => clearTimeout(timer);
  }, [player?.isAllIn]);
  const showAllInLabel = !!player?.isAllIn && !allInLabelExpired;

  const isShowingStack = !showFoldLabel && !showAllInLabel && (player?.stack ?? 0) > 0;

  // Per-player kick countdown — initialised from server value, ticks locally.
  const serverKickSecs = player?.kickCountdownSeconds ?? null;
  const [kickSecsLeft, setKickSecsLeft] = useState<number | null>(serverKickSecs);
  const kickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (kickIntervalRef.current) clearInterval(kickIntervalRef.current);
    if (serverKickSecs === null || serverKickSecs <= 0) {
      setKickSecsLeft(null);
      return;
    }
    setKickSecsLeft(serverKickSecs);
    kickIntervalRef.current = setInterval(() => {
      setKickSecsLeft((prev) => {
        if (prev === null || prev <= 1) {
          if (kickIntervalRef.current) clearInterval(kickIntervalRef.current);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (kickIntervalRef.current) clearInterval(kickIntervalRef.current);
    };
  }, [serverKickSecs]);

  // Show the countdown whenever the server sends one — covers busted (0 stack),
  // sitting-out, and disconnected players without duplicating the condition logic.
  const showKickTimer = kickSecsLeft !== null && kickSecsLeft > 0;
  const kickTimerLabel = showKickTimer ? `${Math.floor((kickSecsLeft ?? 0) / 60)}:${String((kickSecsLeft ?? 0) % 60).padStart(2, "0")}` : null;

  React.useEffect(() => {
    if (isTurn) {
      setTurnKey((k) => k + 1);
    }
  }, [isTurn, gameState.state]);

  React.useEffect(() => {
    if (!lastActionText) return;
    playActionSound(lastActionText);
  }, [lastActionText]);

  const holeCardsHighlightMemo = useMemo(() => {
    if (!player || !seatPosition) return null;
    if (gameState.state === "WAITING_FOR_PLAYERS") return null;
    if (player.isFolded) return null;
    const shouldAnimatePreflop = gameState.state === "PRE_FLOP";
    const isReveal = lastActionText?.includes("Reveal");
    const cardsReady = variant === "OMAHA" ? holeCards.length === 4 : holeCards.length > 0;
    const cardsRevealed = !isMe && holeCards.some(c => c.rank && c.suit && !c.secret);
    // Keep the wrapper mounted during the dealing animation so its position
    // can be measured; hide its contents until the deal lands.
    const showCards = cardsReady && !isDealing;
    const placeholderCount = variant === "OMAHA" ? 4 : 2;

    return (
      <div
        data-deal-target={`seat-${seatIndex}`}
        className={`holecards-highlight-wrapper
          ${shouldAnimatePreflop ? "slide-up" : ""}
          ${isReveal ? "reveal" : ""}
          ${isFolded ? "folded" : ""}
          ${isMobile ? "mobile" : ""}
          ${isMe ? "is-me" : ""}
          ${isMobile && !isMe && seatPosition && seatPosition.x < 40 ? "seat-left" : ""}
          ${isMobile && !isMe && seatPosition && seatPosition.x > 60 ? "seat-right" : ""}
          ${cardsRevealed ? "cards-visible" : ""}
          ${variant === "OMAHA" ? "omaha" : ""}`}
        style={{ opacity: showCards ? 1 : 0 }}
      >
        {showCards ? (
          <HoleCardsHighlight
            player={player}
            combinedSplitPot={gameState.combinedSplitPot}
            isMe={isMe}
            variant={variant}
            isFolding={lastActionText?.includes("Fold")}
          />
        ) : (
          // Placeholder card-backs so the wrapper keeps its real size; the
          // deal animation reads this element's bounding rect for landing.
          <div className="hole-cards-container">
            {Array.from({ length: placeholderCount }).map((_, idx) => (
              <div
                key={idx}
                className="hole-card-wrapper"
                style={{
                  flex: `1 1 ${100 / placeholderCount}%`,
                  marginLeft: idx === 0 ? 0 : isMobile ? "-20px" : "-50px",
                }}
              >
                <PokerCard info={{ secret: true } as GameCard} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }, [
    player,
    seatPosition,
    isFolded,
    gameState.state,
    holeCards,
    variant,
    isMobile,
    isMe,
    gameState.combinedSplitPot,
    lastActionText,
    isDealing,
    seatIndex,
  ]);

  return (
    <div
      className={`player-container-wrapper 
    ${isWinner ? "winner" : ""} 
    ${player?.isSittingOut ? "sitting-out" : ""} 
    ${player?.isDisconnected ? "disconnected" : ""}`}
    >
      {chatBubble && (
        <div key={chatBubble} className="player-chat-bubble" title={chatBubble}>
          <span className="player-chat-bubble-text">{chatBubble}</span>
        </div>
      )}
      {rechargeBubble && rechargeBubble.amount > 0 && (
        <>
          <div key={`recharge-${rechargeBubble.key}`} className="player-recharge-bubble">
            +{formatStack(rechargeBubble.amount)}
          </div>
          <RechargeChipAnimation key={`chips-${rechargeBubble.key}`} animKey={rechargeBubble.key} />
        </>
      )}
      <div className="player-avatar-wrapper">
        <div className="avatar-content">
          <img src={player?.user?.avatar || player?.user?.profileUrl || overrideAvatar || Avatar} alt="avatar" loading="lazy" />
        </div>
      </div>
      {/* Rendered as sibling of avatar-wrapper so it is NOT inside z-index:-1,
          which would bury the text beneath other stacking-context layers. */}
      {winnerAnimationMemo}
      {holeCardsHighlightMemo}
      <div
        key={turnKey}
        className={`stack-box ${
          isTurn && !["WAITING_FOR_PLAYERS", "SHOWDOWN", "FINISHED"].includes(gameState.state) && !gameState.isAuto ? "turn-active" : ""
        }`}
      >
        {gameState.dealerSeatIndex === seatIndex && (
          <div className="seat-number dealer-seat">
            <img src={dealer} alt="" />
          </div>
        )}

        <div className="player-info-wrapper">
          <span className="user-name" data-fullname={player?.user?.username}>
            {player?.user?.username}
          </span>
          <div className="divider">
            {player?.user &&
              (() => {
                const cgp = player.user?.cgpScore ?? 0;
                const thresholds = [100_000, 500_000, 1_000_000, 5_000_000, 10_000_000];
                const filled = thresholds.filter((t) => cgp >= t).length;
                return (
                  <span className="divider-stars">
                    {thresholds.map((_, i) => (
                      <span key={i} className={i < filled ? "divider-star divider-star--filled" : "divider-star divider-star--empty"}>
                        {i < filled ? "★" : "☆"}
                      </span>
                    ))}
                  </span>
                );
              })()}
          </div>
          <span className="player-status">
            {player?.isDisconnected
              ? "Disconnected"
              : player?.isSittingOut
                ? "Sitting Out"
                : showFoldLabel
                  ? "Хаясан"
                  : showAllInLabel
                    ? "Бүгдийг нь"
                    : isShowingStack
                      ? stackDisplay
                      : (player?.stack ?? 0) === 0 && ["FINISHED", "WAITING_FOR_PLAYERS"].includes(gameState.state)
                        ? "Busted"
                        : (player?.stack ?? 0) === 0
                          ? "Бүгдийг нь"
                          : ""}

            {isShowingStack && !player?.isSittingOut && !player?.isDisconnected && <span className="currency">{showStackAsBB ? "BB" : ""}</span>}
          </span>
          <div className="player-flag">
            <div className="flag-icon" />
          </div>
        </div>

        {kickTimerLabel && <div className="kick-countdown">{kickTimerLabel}</div>}

        {lastActionText && (
          <div
            key={`action-${seatIndex}-${lastActionText}`}
            className={`action-label ${getActionClass(lastActionText)} ${isMobile ? "mobile" : ""}`}
            style={{ opacity: 1, willChange: "transform, opacity" }}
          >
            <span>{formatActionTextMn(lastActionText)}</span>
          </div>
        )}

        {!lastActionText && (
          <div className="action-label blind-label">
            <span>{getSeatLabel(seatIndex, gameState)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

function areEqualTablePlayer(prev: TablePlayerProps, next: TablePlayerProps) {
  const holeCardsEqual = prev.holeCards.length === next.holeCards.length && prev.holeCards.every((card, i) => card === next.holeCards[i]);

  return (
    prev.player === next.player &&
    prev.isTurn === next.isTurn &&
    holeCardsEqual &&
    prev.isFolded === next.isFolded &&
    prev.isDealing === next.isDealing &&
    prev.lastActionText === next.lastActionText &&
    prev.seatPosition?.x === next.seatPosition?.x &&
    prev.seatPosition?.y === next.seatPosition?.y &&
    prev.chatBubble === next.chatBubble &&
    prev.rechargeBubble?.key === next.rechargeBubble?.key &&
    prev.usableBalance === next.usableBalance &&
    prev.overrideAvatar === next.overrideAvatar
  );
}

function getActionClass(text?: string) {
  if (!text) return "";
  if (text.includes("Fold")) return "action-fold";
  if (text.includes("Raise")) return "action-raise";
  if (text.includes("Call")) return "action-call";
  if (text.includes("Check")) return "action-check";
  if (text.includes("All-in")) return "action-all-in";
  if (text.includes("Reveal")) return "action-reveal";
  if (text.includes("Auto-Muck")) return "action-auto-muck";
  if (text.includes("Muck")) return "action-muck";
  return "";
}

export default memo(TablePlayer, areEqualTablePlayer);

function formatActionTextMn(text?: string): string {
  if (!text) return "";
  if (text.includes("Fold")) return "Хаях";
  if (text.includes("Check")) return "Эндээ";
  if (text.includes("Call")) return "Дагах";
  if (text.includes("Raise")) return "Өсгөх";
  if (text.includes("All-in")) return "Бүгдийг нь";
  if (text.includes("Reveal")) return "Хөзөр дэлгэх";
  if (text.includes("Auto-Muck")) return "Хүлээгдсэн";
  if (text.includes("Muck")) return "Нуух";
  return text;
}

function getSeatLabel(seatIndex: number, gameState: GameState, lastActionText?: string): string {
  if (lastActionText) return "";

  if (seatIndex === gameState.smallBlindSeatIndex) return "SB";
  if (seatIndex === gameState.bigBlindSeatIndex) return "BB";
  return "";
}
