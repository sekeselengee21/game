import React, { useEffect, useRef, useState } from "react";
import { getChipsForAmount } from "../utils/chips";

export interface PayoutWinner {
  seatIndex: number;
  amount: number;
}

interface Props {
  winners: PayoutWinner[];
  triggerKey: number;
  onComplete?: () => void;
}

interface FlightChip {
  seatIndex: number;
  amount: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  delayMs: number;
  id: string;
}

const FLIGHT_MS = 360;
const PER_WINNER_DELAY_MS = 30;

const PotPayoutAnimation: React.FC<Props> = ({
  winners,
  triggerKey,
  onComplete,
}) => {
  const [chips, setChips] = useState<FlightChip[]>([]);
  const layerRef = useRef<HTMLDivElement | null>(null);
  const lastKeyRef = useRef(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Latest winners via ref so the effect only fires when triggerKey changes.
  const winnersRef = useRef(winners);
  winnersRef.current = winners;

  useEffect(() => {
    if (triggerKey <= 0) return;
    if (lastKeyRef.current === triggerKey) return;
    if (!layerRef.current) return;

    const w = winnersRef.current;
    if (!w.length) return;

    const layer = layerRef.current;
    const layerRect = layer.getBoundingClientRect();
    if (layerRect.width === 0 || layerRect.height === 0) return;

    // Pot starts at the visible chip stacks (the actual pot graphic). If
    // those aren't rendered (no chips drawn for the current amount), fall
    // back to the pot container, then to the layer center.
    const pickRect = (selector: string) => {
      const el = document.querySelector(selector) as HTMLElement | null;
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 ? r : null;
    };
    const potRect =
      pickRect(".pot-chips-container .chip-stacks") ??
      pickRect(".pot-chips-container");
    const fromX = potRect
      ? potRect.left + potRect.width / 2 - layerRect.left
      : layerRect.width / 2;
    const fromY = potRect
      ? potRect.top + potRect.height / 2 - layerRect.top
      : layerRect.height / 2;

    const flights: FlightChip[] = [];
    w.forEach((winner, i) => {
      const target = document.querySelector(
        `[data-deal-target="seat-${winner.seatIndex}"]`,
      ) as HTMLElement | null;
      if (!target) return;
      const rect = target.getBoundingClientRect();
      flights.push({
        seatIndex: winner.seatIndex,
        amount: winner.amount,
        fromX,
        fromY,
        toX: rect.left + rect.width / 2 - layerRect.left,
        toY: rect.top + rect.height / 2 - layerRect.top,
        delayMs: i * PER_WINNER_DELAY_MS,
        id: `${triggerKey}-${winner.seatIndex}`,
      });
    });

    if (!flights.length) return;
    lastKeyRef.current = triggerKey;
    setChips(flights);

    const totalDuration =
      (flights[flights.length - 1]?.delayMs ?? 0) + FLIGHT_MS;
    const cleanup = setTimeout(() => {
      setChips([]);
      onCompleteRef.current?.();
    }, totalDuration);

    return () => clearTimeout(cleanup);
  }, [triggerKey]);

  return (
    <div ref={layerRef} className="pot-payout-layer" aria-hidden>
      {chips.map((c) => {
        // Render chip stacks with the same structure as PotChips (no amount
        // label below) so the flying chips line up pixel-for-pixel with the
        // pot they're replacing, instead of appearing offset upward.
        const stacks = getChipsForAmount(c.amount);
        return (
          <div
            key={c.id}
            className="pot-flight-chip"
            style={{
              animationDelay: `${c.delayMs}ms`,
              animationDuration: `${FLIGHT_MS}ms`,
              ["--from-x" as string]: c.fromX,
              ["--from-y" as string]: c.fromY,
              ["--to-x" as string]: c.toX,
              ["--to-y" as string]: c.toY,
            }}
          >
            <div className="chip-stacks">
              {stacks.map((chip, i) => (
                <div key={i} className="chip-stack">
                  {[...Array(Math.min(chip.count, 5))].map((_, j) => (
                    <img
                      key={j}
                      src={chip.svg}
                      alt=""
                      className="chip-svg"
                      style={{ top: `-${j * 4}px` }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PotPayoutAnimation;
