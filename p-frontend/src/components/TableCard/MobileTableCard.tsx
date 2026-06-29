import { memo } from "react";
import type { TableCardProps } from "./types";

const MobileTableCard = memo<TableCardProps>(
  ({ record, activePlayers, variantLabel, onClick, className }) => {
    const stakeRange = `${record.smallBlind.toLocaleString("en-US")}/${record.bigBlind.toLocaleString("en-US")}`;
    const buyinRange = `${record.minBuyIn.toLocaleString("en-US")}/${record.maxBuyIn.toLocaleString("en-US")}`;

    const variantClass = record.gameVariant?.toLowerCase();
    const avgPot = record.bigBlind * activePlayers * 6;

    return (
      <div
        className={`table-card ${variantClass} ${className || ""}`}
        onClick={onClick}
      >
        <div className="table-info">
          <div className="jackpot-variant-wrapper">
            <div className={`variant variant-${variantClass}`}>
              {variantLabel}
            </div>

            <span className="jackpot">
              <div className="seat-count">8</div>
              <div className="jackpot-icon"></div>
              <div className="jackpot-icon-outlined"></div>
            </span>
          </div>

          <div className="table-name">
            {record.tableName || `Table ${record.tableId}`}
          </div>

          <div className="avgPot-playernum-wrapper">
            <span className="avg-pot">
              Avg.Pot: {avgPot.toLocaleString("en-US")}
            </span>

            <div className="players-num">
              <div className="players-icon"></div>
              {activePlayers}/{record.maxPlayers}
            </div>
          </div>
        </div>

        <div className="buyin-wrapper">
          <div className="buyin-range">
            <div className="btn-buyin">
              Buy In:
              <br />
              {buyinRange}
            </div>
          </div>

          <div className="btn-buyin">
            <div className="buyin-icon"></div>
            {stakeRange}
          </div>
        </div>
      </div>
    );
  },
);

export default MobileTableCard;
