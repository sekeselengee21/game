import { useEffect, useState, useRef } from "react";
import { getChipsForAmount } from "../../utils/chips";
import { useIsMobile } from "../../hooks/useIsMobile";

interface GameState {
  currentPot: number;
  currentBets: Record<string, number>;
  state: string;
  isAuto?: boolean;
}

function PotChips({ gameState }: { gameState: GameState }) {
  const [displayPot, setDisplayPot] = useState(0);
  const [isCollecting, setIsCollecting] = useState(false);
  const previousStateRef = useRef(gameState.state);
  const previousBetsRef = useRef<Record<string, number>>({});
  const isMobile = useIsMobile();

  useEffect(() => {
    const currentState = gameState.state;
    const currentBets = gameState.currentBets || {};

    if (currentState === "WAITING_FOR_PLAYERS" && !gameState.isAuto) {
      setDisplayPot(0);
      setIsCollecting(false);
      previousStateRef.current = currentState;
      previousBetsRef.current = {};
      return;
    }

    // Keep the last non-zero amount on screen during showdown / finished so
    // the chip stacks don't vanish before the payout animation measures the
    // pot's position. They reset when the next hand starts.
    if (gameState.currentPot > 0) {
      setDisplayPot(gameState.currentPot);
    }

    previousStateRef.current = currentState;
    previousBetsRef.current = { ...currentBets };
  }, [gameState.currentPot, gameState.currentBets, gameState.state, gameState.isAuto]);

  const chips = getChipsForAmount(displayPot);

  return (
    <div className={`chip-stacks ${isCollecting ? "collecting" : ""}`}>
      {chips.map((chip, i) => (
        <div key={i} className="chip-stack">
          {[...Array(Math.min(chip.count, 5))].map((_, j) => (
            <img
              key={j}
              src={chip.svg}
              alt={`chip-${chip.svg}`}
              className="chip-svg"
              style={{
                top: isMobile ? `-${j * 2}px` : `-${j * 4}px`,
                animationDelay: `${j * 0.05}s`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export default PotChips;
