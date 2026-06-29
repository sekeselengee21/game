import React, { useEffect, useRef, useState } from "react";
import type { GameCard } from "../api/game";
import PokerCard from "../features/poker/poker-card";
import FlipCardAudio from "../assets/sounds/card-flip.wav";
import { Howl } from "howler";

interface SeatState {
  user: any | null;
  isDisconnected?: boolean;
  stack?: number;
  seatIndex: number;
}

interface Props {
  seatStates: (SeatState | null)[];
  cardsPerSeat: number;
  size: number;
  dealRound: number;
  onAnimationComplete?: () => void;
}

interface DealingCard {
  seatIndex: number;
  cardIndex: number;
  delayMs: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  id: string;
}

const DEAL_DELAY_MS = 55;
const CARD_FLIGHT_MS = 250;

const CardDealingAnimation: React.FC<Props> = ({
  seatStates,
  cardsPerSeat,
  size,
  dealRound,
  onAnimationComplete,
}) => {
  const [dealingCards, setDealingCards] = useState<DealingCard[]>([]);
  const layerRef = useRef<HTMLDivElement | null>(null);
  const cardWidth = size;
  const cardHeight = cardWidth * 1.4;

  const dealSoundRef = useRef<Howl | null>(null);
  const lastDealtRef = useRef(0);

  useEffect(() => {
    dealSoundRef.current = new Howl({
      src: [FlipCardAudio],
      volume: 0.35,
      preload: true,
    });
    return () => {
      dealSoundRef.current?.unload();
    };
  }, []);

  // Capture latest props in refs so the dealing effect only fires on
  // `dealRound` change. Otherwise prop tweaks during a deal would cancel
  // the timers (cleanup runs) and the animation would never settle.
  const seatStatesRef = useRef(seatStates);
  const cardsPerSeatRef = useRef(cardsPerSeat);
  const cardWidthRef = useRef(cardWidth);
  const onCompleteRef = useRef(onAnimationComplete);
  seatStatesRef.current = seatStates;
  cardsPerSeatRef.current = cardsPerSeat;
  cardWidthRef.current = cardWidth;
  onCompleteRef.current = onAnimationComplete;

  useEffect(() => {
    if (dealRound <= 0) return;
    if (lastDealtRef.current === dealRound) return;
    if (!layerRef.current) return;

    const activeSeats = seatStatesRef.current.filter(
      (seat): seat is SeatState =>
        !!seat && !!seat.user && (seat.stack ?? 0) > 0,
    );
    if (activeSeats.length === 0) return;
    const cardsPerSeatVal = cardsPerSeatRef.current;
    const cardWidthVal = cardWidthRef.current;

    const layer = layerRef.current;
    const layerRect = layer.getBoundingClientRect();
    if (layerRect.width === 0 || layerRect.height === 0) return;

    const fromX = layerRect.width / 2;
    const fromY = layerRect.height / 2;

    // Resolve each seat's hole-card target position by querying the DOM.
    // The hole-cards wrapper carries `data-deal-target="seat-<i>"`.
    const resolveTarget = (seatIndex: number) => {
      const el = document.querySelector(
        `[data-deal-target="seat-${seatIndex}"]`,
      ) as HTMLElement | null;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return null;
      return {
        x: rect.left + rect.width / 2 - layerRect.left,
        y: rect.top + rect.height / 2 - layerRect.top,
      };
    };

    const cards: DealingCard[] = [];
    let order = 0;
    for (let c = 0; c < cardsPerSeatVal; c++) {
      for (const seat of activeSeats) {
        const target = resolveTarget(seat.seatIndex);
        if (!target) {
          order++;
          continue;
        }
        // Stack cards horizontally so 2/4 cards fan across the slot.
        const spread =
          (c - (cardsPerSeatVal - 1) / 2) * (cardWidthVal * 0.55);
        cards.push({
          seatIndex: seat.seatIndex,
          cardIndex: c,
          delayMs: order * DEAL_DELAY_MS,
          fromX,
          fromY,
          toX: target.x + spread,
          toY: target.y,
          id: `${dealRound}-${seat.seatIndex}-${c}`,
        });
        order++;
      }
    }

    if (cards.length === 0) return;
    lastDealtRef.current = dealRound;
    setDealingCards(cards);

    const soundTimers = cards.map((card) =>
      setTimeout(() => {
        dealSoundRef.current?.play();
      }, card.delayMs),
    );

    const totalDuration =
      (cards[cards.length - 1]?.delayMs ?? 0) + CARD_FLIGHT_MS;
    const cleanupTimer = setTimeout(() => {
      setDealingCards([]);
      onCompleteRef.current?.();
    }, totalDuration);

    return () => {
      soundTimers.forEach(clearTimeout);
      clearTimeout(cleanupTimer);
    };
  }, [dealRound]);

  return (
    <div ref={layerRef} className="dealing-cards-layer" aria-hidden>
      {dealingCards.map((dc) => (
        <div
          key={dc.id}
          className="dealing-card-animate"
          style={{
            width: cardWidth,
            height: cardHeight,
            animationDelay: `${dc.delayMs}ms`,
            animationDuration: `${CARD_FLIGHT_MS}ms`,
            ["--from-x" as string]: dc.fromX,
            ["--from-y" as string]: dc.fromY,
            ["--to-x" as string]: dc.toX,
            ["--to-y" as string]: dc.toY,
          }}
        >
          <PokerCard
            info={{ rank: "ACE", suit: "SPADES", secret: true } as GameCard}
            isFolded={false}
          />
        </div>
      ))}
    </div>
  );
};

export default CardDealingAnimation;
