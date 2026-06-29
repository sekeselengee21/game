import { logger } from "../../utils/logger";
import { useEffect, useState, useContext } from "react";
import type { GameTable } from "../../api/admin";
import type { GamePlayer } from "../../api/game";
import { GlobalWebSocketContext } from "../../providers/GlobalWebSocketProvider.tsx";

function TableDetails({ table }: { table: GameTable | null }) {
  const [dataSource, setDataSource] = useState<GamePlayer[]>([]);
  const { jackpotAmount: wsJackpotAmount } = useContext(GlobalWebSocketContext);
  const [jackpotAmount, setJackpotAmount] = useState<number>(0);

  useEffect(() => {
    const fetchJackpot = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/v1/jackpot/current`);
        const data = await res.json();
        setJackpotAmount(Number(data.amount));
      } catch (err) {
        logger.error("Failed to fetch jackpot", err);
      }
    };
    fetchJackpot();
  }, []);

  useEffect(() => {
    if (wsJackpotAmount > 0) {
      setJackpotAmount(wsJackpotAmount);
    }
  }, [wsJackpotAmount]);

  useEffect(() => {
    setDataSource(Object.values(table?.seats || {}).map((seat) => seat));
  }, [table]);

  const formatJackpot = (amount: number) => {
    const formatted = amount.toLocaleString("de-DE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const [intPart, decimalPart] = formatted.split(",");
    return (
      <>
        {intPart}
        <span style={{ fontSize: "0.8em" }}>,{decimalPart}</span>
      </>
    );
  };

  return (
    <div className="table-details-container">
      <div className="jackpot-display">{formatJackpot(jackpotAmount)}</div>

      <div className="table-details-table">
        <div className="table-details-header">
          <span className="table-title">{table?.tableName || "No Table Selected"}</span>
          <span className="table-jackpot">Jackpot: {formatJackpot(jackpotAmount)}</span>
        </div>

        <div className="table-details-columns">
          <div className="table-column header">Name</div>
          <div className="table-column header">Amount</div>
        </div>

        <div className="table-details-rows">
          {dataSource.length === 0 ? (
            <div className="table-no-players">No Players</div>
          ) : (
            dataSource.map((player) => (
              <div key={player.user?.userId} className="table-row">
                <div className="table-column">
                  <strong>{player.user?.username}</strong>
                </div>
                <div className="table-column">{player.stack?.toLocaleString("mn-MN")}₮</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default TableDetails;
