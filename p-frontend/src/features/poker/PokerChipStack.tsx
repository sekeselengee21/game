import React, { useMemo } from "react";
import { getChipsForAmount } from "../../utils/chips";
import formatAmount from "../../utils/formatNumber";
interface PokerChipStackProps {
  amount: number;
}

const PokerChipStack: React.FC<PokerChipStackProps> = ({ amount }) => {
  const MAX_CHIPS = 5;

  // One chip per denomination present (highest first), capped at MAX_CHIPS.
  const mixedChips = useMemo(() => {
    const denominations = getChipsForAmount(amount);
    return denominations.slice(0, MAX_CHIPS).map((c) => c.svg);
  }, [amount]);

  return (
    <div className="chip-stacks">
      <div className="chip-stack">
        {mixedChips.map((svg, j) => (
          <img
            key={j}
            src={svg}
            alt="Chip"
            className="chip-svg"
            style={{
              top: `-${j * 3}px`,
              zIndex: j,
            }}
          />
        ))}
      </div>
      <span className="poker-chip-amount">{formatAmount(amount)}</span>
    </div>
  );
};

export default React.memo(PokerChipStack);
