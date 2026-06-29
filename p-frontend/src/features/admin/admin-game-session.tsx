import { logger } from "../../utils/logger";
import { useFetchGameSessionsQuery } from "../../api/admin";

function AdminGameSession() {
  const { data } = useFetchGameSessionsQuery({ tableId: 4 });

  const handleViewPlayers = (players: any[]) => {
    logger.log("View players", players);
  };

  return (
    <div className="admin-table-container">
      <table className="custom-table">
        <thead>
          <tr>
            <th>№</th>
            <th>ID</th>
            <th>Он сар</th>
            <th>Тоглогчдын жагсаалт</th>
            <th>Ялагчид</th>
            <th>Орлого</th>
          </tr>
        </thead>
        <tbody>
          {data?.map((item: any, index: number) => (
            <tr key={item.sessionId}>
              <td>{index + 1}</td>
              <td>{item.sessionId}</td>
              <td>
                {new Date(item.createDate).toLocaleString("mn-MN", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </td>
              <td>
                <span>{item.details?.players?.length || 0}</span>
                <button className="view-btn" onClick={() => handleViewPlayers(item.details?.players || [])}>
                  👁️ Харах
                </button>
              </td>
              <td>
                <span>{item.details?.winners?.length || 0}</span>
                <button className="view-btn" onClick={() => handleViewPlayers(item.details?.winners || [])}>
                  👁️ Харах
                </button>
              </td>
              <td>{(item.details?.rake?.toFixed(2) ?? "0.00") + " ₮"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AdminGameSession;
