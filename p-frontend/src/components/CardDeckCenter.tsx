import React from "react";
import PokerCard from "../features/poker/poker-card";
import type { GameCard } from "../api/game";
import { useIsMobile } from "../hooks/useIsMobile";

interface Props {
  count: number;
  size?: number;
  spread?: number;
}

const CardDeckCenter: React.FC<Props> = ({ count, size = 60, spread = 3 }) => {
  const isMobile = useIsMobile();
  if (!count || count <= 0) return null;

  const cardSize = isMobile ? size * 0.7 : size;
  const cardSpread = isMobile ? spread * 0.7 : spread;

  const cards: GameCard[] = Array.from({ length: count }, () => ({
    rank: "ACE",
    suit: "SPADES",
    secret: true,
  }));

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
        height: cardSize * 1.4 + count * cardSpread,
        width: cardSize,
      }}
    >
      {cards.map((card, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: 0,
            top: i * cardSpread,
            width: cardSize,
            height: cardSize * 1.4,
            zIndex: count - i,
            boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
          }}
        >
          <PokerCard info={card} isFolded={false} />
        </div>
      ))}
    </div>
  );
};

export default CardDeckCenter;
