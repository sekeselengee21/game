import { useState } from "react";
import type { GameTable } from "../../api/admin";
import { MdDelete } from "react-icons/md";
import { CiEdit } from "react-icons/ci";

function AdminTableList({
  tables,
  editTable,
  deleteTable,
}: {
  tables: GameTable[];
  fetchTables: () => void;
  editTable: (table: GameTable) => void;
  deleteTable: (table: GameTable) => void;
  startSimulation: (args: { tableId: number }) => Promise<any>;
  stopSimulation: (args: { tableId: number }) => Promise<any>;
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalPages = Math.ceil(tables.length / pageSize);
  const paginatedData = tables.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPageSize(Number(e.target.value));
    setCurrentPage(1);
  };

  return (
    <div className="admin-table-wrapper">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Нэр</th>
            <th>Төрөл</th>
            <th>Ширээний доод лимит</th>
            <th>Ширээний дээд лимит</th>
            <th>Тоглогчийн тоо</th>
            <th>Small Blind</th>
            <th>Big Blind</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {paginatedData.map((table) => {
            return (
              <tr key={table.tableId}>
                <td>{table.tableName}</td>
                <td>{table.gameVariant === "TEXAS" ? "Texas Holdem" : table.gameVariant === "OMAHA" ? "Omaha" : "Unknown"}</td>
                <td>{table.minBuyIn}</td>
                <td>{table.maxBuyIn}</td>
                <td>{table.maxPlayers}</td>
                <td>{table.smallBlind}</td>
                <td>{table.bigBlind}</td>
                <td className="actions-cell">
                  <button className="btn-action" title="Edit" onClick={() => editTable(table)}>
                    <CiEdit />
                  </button>
                  <button className="btn-action btn-danger" title="Delete" onClick={() => deleteTable(table)}>
                    <MdDelete />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="pagination-controls">
        <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>
          Prev
        </button>

        <span>
          Хуудас {currentPage} / {totalPages || 1}
        </span>

        <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages || totalPages === 0}>
          Next
        </button>

        <select value={pageSize} onChange={handlePageSizeChange} className="page-size-select">
          {[10, 20, 50, 100].map((size) => (
            <option key={size} value={size}>
              {size} / хуудас
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default AdminTableList;
