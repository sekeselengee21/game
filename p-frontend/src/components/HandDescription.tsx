import React, { useMemo } from "react";
import type { GameCard, GamePlayer } from "../api/game";
import type { GameState } from "../types/gameTypes";
import { formatHandDescription } from "../utils/pokerHelpers";
import { evaluateBestHand } from "../utils/pokerSolver";

interface HandDescriptionProps {
  player: GamePlayer;
  seatIndex: number;
  communityCards: GameCard[];
  gameState: GameState;
  isMe?: boolean;
}

const HandDescription: React.FC<HandDescriptionProps> = ({ player, communityCards, gameState, isMe }) => {
  const bestHand = useMemo(() => {
    if (!player?.holeCards?.length) return null;

    const shouldShow = isMe || gameState.isAuto || player.lastActionText?.includes("Reveal");

    if (!shouldShow) return null;

    return evaluateBestHand(player.holeCards, communityCards);
  }, [player, communityCards, gameState.isAuto, isMe]);

  if (!bestHand) return null;

  return (
    <div className="rank-label-wrapper">
      <div className="rank-label">
        <span className="hand-description">{formatHandDescription(bestHand)}</span>
      </div>
    </div>
  );
};

export default HandDescription;
