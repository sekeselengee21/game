import React, {
  useMemo,
  useCallback,
  useEffect,
  useRef,
  useState,
  Suspense,
} from "react";
import type { User } from "../../../api/user";
import type { GameState } from "../../../types/gameTypes";
import TablePlayer from "../table-player";
import PokerChip from "../PokerChipStack";
import { useIsMobile } from "../../../hooks/useIsMobile";
import { getSeatLayouts, getChipOffsets, getSeatLayoutsMobileSeated, getChipOffsetsMobileSeated } from "../../../utils/seatOffsets";
import HandDescription from "../../../components/HandDescription";

interface Props {
  gameState: GameState;
  userInfo: User | undefined;
  setSelectedSeat: (seatIndex: number | null) => void;
  seatCount: number;
  isHandOver: boolean;
  allInPlayers: Record<number, boolean>;
  isDealing?: boolean;
  chatBubbles?: Record<string, string>;
  rechargeBubbles?: Record<number, { amount: number; key: number }>;
  botAvatarMap?: Record<number, string>;
}

const TexasTablePlayerSeats: React.FC<Props> = ({
  gameState,
  userInfo,
  seatCount,
  setSelectedSeat,
  isHandOver,
  allInPlayers,
  isDealing,
  chatBubbles,
  rechargeBubbles,
  botAvatarMap,
}) => {
  const myUserId = userInfo?.userId;
  const mySeatIndex = useMemo(
    () => gameState.seats.findIndex((seat) => seat.user?.userId === myUserId),
    [gameState.seats, myUserId],
  );
  const hasTakenSeat = mySeatIndex !== -1;
  const isMobile = useIsMobile();

  // On mobile when seated: use a dedicated layout that places is-me at center-
  // bottom with other players lifted above the card area. On desktop the original
  // layout is always used — the rotation formula handles positioning.
  const mobileSeated = hasTakenSeat && isMobile;
  const positions = mobileSeated
    ? getSeatLayoutsMobileSeated(seatCount)
    : getSeatLayouts(seatCount, isMobile);
  const chipOffsets = mobileSeated
    ? getChipOffsetsMobileSeated(seatCount)
    : getChipOffsets(seatCount, isMobile);


  const [collectingChips, setCollectingChips] = useState<Record<number, boolean>>({});
  // Frozen bet amounts — kept alive for the 600 ms collecting animation even
  // after currentBets resets to 0 (server sends state change + bet reset in
  // the same batch, so playerBet would already be 0 on first render).
  const [frozenBets, setFrozenBets] = useState<Record<number, number>>({});
  const previousStateRef = useRef(gameState.state);
  const previousBetsRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const currentState = gameState.state;
    const previousState = previousStateRef.current;
    const currentBets = gameState.currentBets || {};
    const previousBets = previousBetsRef.current;

    const stateTransitions = [
      { from: "PRE_FLOP", to: "FLOP" },
      { from: "FLOP", to: "TURN" },
      { from: "TURN", to: "RIVER" },
      { from: "RIVER", to: "SHOWDOWN" },
      { from: "RIVER", to: "FINISHED" },
    ];

    const isRoundEnd = stateTransitions.some(
      (t) => previousState === t.from && currentState === t.to,
    );

    const hadBets = Object.values(previousBets).some((b) => b > 0);
    const currentBetsSum = Object.values(currentBets).reduce((sum, v) => sum + v, 0);
    const betsCollected = hadBets && currentBetsSum === 0;

    if (isRoundEnd || betsCollected) {
      const collecting: Record<number, boolean> = {};
      const frozen: Record<number, number> = {};
      Object.keys(previousBets).forEach((seatStr) => {
        const seat = parseInt(seatStr);
        if (previousBets[seat] > 0) {
          collecting[seat] = true;
          frozen[seat] = previousBets[seat];
        }
      });
      setCollectingChips(collecting);
      setFrozenBets(frozen);

      setTimeout(() => {
        setCollectingChips({});
        setFrozenBets({});
      }, 600);
    }

    previousStateRef.current = currentState;
    previousBetsRef.current = { ...currentBets };
  }, [gameState.state, gameState.currentBets]);

  const handleSelectSeat = useCallback(
    (ind: number, disable: boolean) => {
      if (!disable) {
        setSelectedSeat(ind);
      }
    },
    [setSelectedSeat],
  );

  return (
    <div className={`player-seats-container ${isMobile ? "mobile" : ""}`}>
      {gameState.seats.map((seat, ind) => {
        // Rotate so the user's seat lands at visual slot 0 (bottom-left).
        // Seats are numbered counter-clockwise in the original layout, so
        // (ind - mySeatIndex) correctly preserves that order: the seat that was
        // one step counter-clockwise from the user appears at slot 1 (left),
        // the seat one step clockwise appears at slot 7 (right).
        const visualIndex = hasTakenSeat
          ? (ind - mySeatIndex + seatCount) % seatCount
          : ind;
        const pos = positions[visualIndex % positions.length];
        const isTaken = !!seat.user;
        const isMySeat = mySeatIndex === ind;
        const disableSeat = !isTaken && hasTakenSeat && !isMySeat;
        const playerBet = gameState.currentBets[ind] || 0;
        const isFolded = seat.isFolded === true;
        const isDisconnected = seat.isDisconnected === true;
        const isTimeoutActed = seat.isTimeoutActed === true;
        const hideHandDesc = isFolded || isDisconnected || isTimeoutActed;

        const displayX = pos.x;

      return (
        <div key={ind}>
          {/* Position wrapper — transition fires when displayX changes */}
          <div
            style={{
              position: "absolute",
              left: `${displayX}%`,
              top: `${pos.y}%`,
              transform: "translate(-50%, -50%)",
              }}
          >
            {isTaken ? (
              <div
                className={`seat-taken ${isFolded ? "folded" : ""}`}
                style={{
                  opacity: isFolded || isDisconnected || isTimeoutActed ? 0.5 : 1,
                }}
              >
                <TablePlayer
                  key={seat.user?.userId}
                  userInfo={userInfo}
                  seatIndex={ind}
                  player={seat}
                  isMe={isMySeat}
                  overrideAvatar={botAvatarMap?.[ind]}
                  usableBalance={isMySeat ? gameState.usableBalance : undefined}
                  isTurn={ind === gameState.currentPlayerSeat && !isFolded}
                  holeCards={seat?.holeCards || []}
                  gameState={gameState}
                  lastActionText={seat?.lastActionText}
                  isHandOver={isHandOver}
                  communityCards={gameState.communityCards || []}
                  allInPlayers={allInPlayers}
                  players={gameState.seats}
                  seatPosition={{ x: pos.x, y: pos.y }}
                  isFolded={isFolded}
                  isDealing={isDealing}
                  chatBubble={
                    seat.user?.username
                      ? chatBubbles?.[seat.user.username]
                      : undefined
                  }
                  rechargeBubble={rechargeBubbles?.[ind]}
                />

                {seat.user &&
                  !hideHandDesc &&
                  gameState.state !== "WAITING_FOR_PLAYERS" && (
                    <Suspense fallback={null}>
                      <HandDescription
                        player={seat}
                        seatIndex={ind}
                        communityCards={gameState.communityCards || []}
                        gameState={gameState}
                        isMe={mySeatIndex === ind}
                      />
                    </Suspense>
                  )}
              </div>
            ) : (
              <div
                className={`seat seat-available ${disableSeat ? "seat-disabled" : ""}`}
                onClick={() => handleSelectSeat(ind, disableSeat)}
                style={{
                  cursor: disableSeat ? "not-allowed" : "pointer",
                  opacity: disableSeat ? 0.5 : 1,
                }}
                title="Take a seat"
              >
                <div className={`seat-icon ${disableSeat ? "disabled" : ""}`} />
              </div>
            )}
          </div>

          {/* Chips always at the real seat position (only relevant when taken) */}
          {isTaken && (playerBet > 0 || collectingChips[ind]) && (
            <div
              className={collectingChips[ind] ? "player-bet-collecting" : ""}
              style={{
                position: "absolute",
                left: `calc(${pos.x}% + ${chipOffsets[visualIndex]?.x || 0}px)`,
                top: `calc(${pos.y}% + ${chipOffsets[visualIndex]?.y || 0}px)`,
              }}
            >
              <PokerChip amount={playerBet > 0 ? playerBet : (frozenBets[ind] ?? 0)} />
            </div>
          )}
        </div>
      );
      })}
    </div>
  );
};

export default React.memo(TexasTablePlayerSeats);
