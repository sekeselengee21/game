import React, { memo, useMemo } from "react";
import { getSeatLayouts } from "../utils/seatOffsets";
import type { GameTable } from "../api/admin";
import Avatar from "../assets/image/avatar/6836.png";

interface TableGamePreviewProps {
  table: GameTable;
  className?: string;
}

const TableGamePreview: React.FC<TableGamePreviewProps> = ({ table, className }) => {
  const seatCount = table.maxPlayers || 6;
  const positions = getSeatLayouts(seatCount, false);
  const buyinAmount = table.minBuyIn && table.maxBuyIn ? `${table.minBuyIn.toLocaleString()} - ${table.maxBuyIn.toLocaleString()}` : "";
  const seatsArray = useMemo(() => {
    return Array.from({ length: seatCount }).map((_, i) => table.seats?.[i] || null);
  }, [table.seats, seatCount]);

  return (
    <div className={`table-game-preview ${className || ""}`}>
      <div className="preview-table-wrapper">
        <div className="poker-table" />
        <div className="felt-color" />
        <div className="felt-shadow" />
        <div className="buyin-amount">Орох дүн: {buyinAmount}</div>
        <div className="preview-player-seats">
          {seatsArray.map((seat, idx) => {
            const pos = positions[idx % positions.length];
            const isTaken = !!seat?.user;
            const isFolded = seat?.isFolded === true;
            const isDisconnected = seat?.isDisconnected === true;

            return (
              <React.Fragment key={idx}>
                {isTaken ? (
                  <div
                    className={`preview-seat-taken ${isFolded || isDisconnected ? "inactive" : ""}`}
                    style={{
                      position: "absolute",
                      left: `${pos.x}%`,
                      top: `${pos.y}%`,
                      transform: "translate(-50%, -50%)",
                      opacity: isFolded || isDisconnected ? 0.5 : 1,
                    }}
                  >
                    <div className="preview-player-avatar">
                      <img src={seat?.user?.avatar || Avatar} alt={seat?.user?.username || "Player"} />
                    </div>
                    <div className="preview-player-info">
                      <span className="preview-player-name">{seat?.user?.username}</span>
                      <span className="preview-player-stack">{seat?.stack?.toLocaleString()}</span>
                    </div>
                  </div>
                ) : (
                  <div
                    className="preview-seat-empty"
                    style={{
                      position: "absolute",
                      left: `${pos.x}%`,
                      top: `${pos.y}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    <div className="preview-empty-indicator" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default memo(TableGamePreview);
