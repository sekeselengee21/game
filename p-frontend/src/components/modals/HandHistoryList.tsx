import React, { useMemo, useCallback } from "react";
import type { HandHistory, GameCard } from "../../api/game";
import PokerCard from "../../features/poker/poker-card";
import { useIsMobile } from "../../hooks/useIsMobile";

interface HandHistoryListProps {
  handHistory: HandHistory[];
  isLoading?: boolean;
  open: boolean;
  onClose: () => void;
  loadMore?: () => void;
  hasMore?: boolean;
}

const HandHistoryList: React.FC<HandHistoryListProps> = ({ handHistory, isLoading = false, open, onClose, loadMore }) => {
  const isMobile = useIsMobile();

  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [open]);

  const renderCards = useCallback(
    (cards?: GameCard[]) =>
      !cards?.length ? (
        "-"
      ) : (
        <div className="cards-row">
          {cards.map((card, i) => (
            <div key={i} className="card-wrapper">
              <PokerCard info={{ rank: card.rank, suit: card.suit, secret: card.secret ?? false }} />
            </div>
          ))}
        </div>
      ),
    [],
  );

  const renderCommunityCards = useCallback((cards?: GameCard[]) => {
    const revealed = cards ?? [];
    const placeholders = Array.from({ length: 5 - revealed.length });
    return (
      <div className="cards-row">
        {revealed.map((card, i) => (
          <div key={i} className="card-wrapper">
            <PokerCard info={{ rank: card.rank, suit: card.suit, secret: card.secret ?? false }} />
          </div>
        ))}
        {placeholders.map((_, i) => (
          <div key={`b-${i}`} className="card-wrapper">
            <PokerCard info={{ rank: null, suit: null, secret: true }} />
          </div>
        ))}
      </div>
    );
  }, []);

  const sortedHands = useMemo(() => [...handHistory].sort((a, b) => b.handNumber - a.handNumber).slice(0, 50), [handHistory]);

  if (isLoading && handHistory.length === 0) return <div className="hand-history-loading">Loading hand history...</div>;

  return (
    <>
      <div className={`hand-history-overlay ${open ? "open" : ""}`} onClick={onClose} />

      <div className={`hand-history-panel ${visible ? "open" : ""} ${isMobile ? "mobile" : ""}`}>
        <div className="hand-history-list">
          <div className="hand-history-title">Гарын түүх</div>

          {sortedHands.map((hand, i) => (
            <div key={i} className="hand-history-row">
              <div className="hand-header">#{hand.handNumber}</div>
              <div className="winner">Ялагч - {hand.winnerUsername}</div>
              <div className="hole-cards">{renderCards(hand.winningHoleCards)}</div>
              <div className="community-cards">{renderCommunityCards(hand.winningCommunityCards)}</div>
            </div>
          ))}

          <div className="hand-history-load-more">
            <button onClick={loadMore} disabled={isLoading}>
              {isLoading ? "Уншиж байна..." : "Илүү ихийг харах"}
            </button>
          </div>

          {isLoading && handHistory.length > 0 && <div className="hand-history-loading-bottom">Loading more...</div>}
        </div>
      </div>
    </>
  );
};

export default React.memo(HandHistoryList, (prevProps, nextProps) => {
  return prevProps.open === nextProps.open && prevProps.handHistory === nextProps.handHistory && prevProps.isLoading === nextProps.isLoading;
});
