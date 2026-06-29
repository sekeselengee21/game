import { memo } from "react";
import type { TableCardProps } from "./types";

const DesktopTableCard = memo<TableCardProps>(
  ({ record, activePlayers, variantLabel, onClick, className }) => {
    const buyinRange = `${record.minBuyIn.toLocaleString("en-US")} / ${record.maxBuyIn.toLocaleString("en-US")}`;
    const stake = `${record.smallBlind.toLocaleString("en-US")} / ${record.bigBlind.toLocaleString("en-US")}`;

    const variantClass = record.gameVariant?.toLowerCase();

    const seatStacks = Object.values(record.seats || {}).map(
      (seat) => seat?.stack || 0,
    );

    const avgPot = seatStacks.length
      ? Math.floor(seatStacks.reduce((a, b) => a + b, 0) / seatStacks.length)
      : 0;

    return (
      <div
        className={`table-card ${variantClass} ${className || ""}`}
        onClick={onClick}
      >
        <div className="table-info">
          <span className="table-name">
            {record.tableName || `Table ${record.tableId}`}
          </span>

          <span className="variant">{variantLabel}</span>

          <span className="stake">{stake}</span>

          <span className="jackpot">
            <div className="seat-count">{record.maxPlayers}</div>
            <div className="jackpot-icon"></div>
            <div className="jackpot-icon-outlined"></div>
          </span>

          <span className="avg-pot">{avgPot.toLocaleString("en-US")}</span>

          <span className="players-num">
            {activePlayers}/{record.maxPlayers}
          </span>

          <div className="buyin-range">
            <div className="btn-buyin">{buyinRange}</div>
          </div>
        </div>
      </div>
    );
  },
);

export default DesktopTableCard;
