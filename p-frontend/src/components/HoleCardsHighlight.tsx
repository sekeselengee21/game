import type { GamePlayer, CombinedSplitPot, GameCard } from "../api/game";
import PokerCard from "../features/poker/poker-card";
import { useIsMobile } from "../hooks/useIsMobile";
import { useDesktopSettings } from "./context/DesktopSettingsContext";

interface HoleCardsHighlightProps {
  player: GamePlayer | null;
  combinedSplitPot?: CombinedSplitPot;
  isMe?: boolean;
  variant?: string;
  isFolding?: boolean;
}

export default function HoleCardsHighlight({ player, combinedSplitPot, isFolding }: HoleCardsHighlightProps) {
  const { settings } = useDesktopSettings();
  const highlightEnabled = settings["highlightBestHand"] ?? false;

  if (!player || !player.holeCards || player.holeCards.length === 0) {
    return null;
  }
  const winnersData = Object.values(combinedSplitPot?.hands ?? {}).filter((p: any) => p.isWinner);
  const winner = winnersData.find((p: any) => p.user?.username === player.user?.username);
  const isWinner = !!winner;
  const winningCards: GameCard[] = winner?.bestHandCards ?? [];
  const isMobile = useIsMobile();

  const isCardConnected = (card: GameCard): boolean =>
    highlightEnabled && winningCards.some((wc) => wc.rank === card.rank && wc.suit === card.suit);

  return (
    <div
      className="hole-cards-container"
      style={{
        opacity: highlightEnabled && winnersData.length > 0 && !isWinner ? 0.6 : 1,
        transition: "opacity 0.15s ease",
      }}
    >
      {player.holeCards.map((card, idx) => {
        const isWinningCard = isCardConnected(card);
        const isCardDimmed = highlightEnabled && winnersData.length > 0 && (!isWinner || (isWinner && !isWinningCard));
        const displayCard = { ...card };
        return (
          <div
            key={idx}
            className={`hole-card-wrapper ${isCardDimmed ? "dimmed-card" : ""} ${isFolding ? "folding" : ""} ${isWinningCard ? "winning-card" : ""}`}
            style={{
              zIndex: idx + 10,
              flex: `1 1 ${100 / player.holeCards.length}%`,
              marginLeft: idx === 0 ? 0 : isMobile ? "-14px" : "-50px",
            }}
          >
            <PokerCard info={displayCard} index={idx} />
          </div>
        );
      })}
    </div>
  );
}
