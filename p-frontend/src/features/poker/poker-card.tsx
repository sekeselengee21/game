import React from "react";
import { BackCard, PokerCardImage } from "../../assets/card";
import type { GameCard } from "../../api/game";

interface PokerCardProps {
  info: GameCard;
  isFolded?: boolean;
  index?: number;
}

const PokerCard: React.FC<PokerCardProps> = ({ info, isFolded = false }) => {
  if (isFolded) return null;

  const isHidden = info.secret === true || !info.suit || !info.rank;

  let cardImage = BackCard;

  if (!isHidden && info.suit && info.rank) {
    cardImage = PokerCardImage[info.suit][info.rank];
  }
  return (
    <img
      src={cardImage}
      className={`poker-card-image ${isHidden ? "back-card" : ""}`}
      alt={isHidden ? "Hidden card" : `${info.rank} of ${info.suit}`}
    />
  );
};

export default React.memo(PokerCard);
