import { useApproveWithdrawalMutation, type Withdrawal } from "../../api/admin";
import { useState } from "react";
import { FaCheck } from "react-icons/fa6";

interface AdminWithdrawListProps {
  withdrawals: Withdrawal[];
  showHistory?: boolean;
}

function AdminWithdrawList({ withdrawals, showHistory = false }: AdminWithdrawListProps) {
  const [approve] = useApproveWithdrawalMutation();

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPageSize(Number(e.target.value));
    setCurrentPage(1);
  };

  const paginatedData = withdrawals.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalPages = Math.ceil(withdrawals.length / pageSize);

  return (
    <div className="admin-table-wrapper">
      <table className="admin-table">
        <thead>
          <tr>
            <th>№</th>
            <th>Хэрэглэгч</th>
            <th>Хүсэлтийн огноо</th>
            {showHistory && <th>Батласан огноо</th>}
            <th>Дүн</th>
            {showHistory ? <th>Төлөв</th> : <th>Үйлдэл</th>}
          </tr>
        </thead>
        <tbody>
          {paginatedData.map((record, index) => {
            const createDate = new Date(record.createDate);
            const dateOptions: Intl.DateTimeFormatOptions = {
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            };
            
            const isPending = !record.approvedBy && !record.approveDate;
            const isApproved = record.approvedBy || record.approveDate;
            
            let statusText = "Хүлээгдэж буй";
            let statusClass = "status-pending";
            
            if (isApproved) {
              statusText = "Батлагдсан";
              statusClass = "status-approved";
            }
            
            const approveDate = record.approveDate ? new Date(record.approveDate) : null;

            return (
              <tr key={record.withdrawalId} className={isPending ? "row-pending" : "row-approved"}>
                <td className="table-index">{(currentPage - 1) * pageSize + index + 1}</td>
                <td className="table-user">{record.user?.username}</td>
                <td className="table-date">{createDate.toLocaleString("mn-MN", dateOptions)}</td>
                {showHistory && (
                  <td className="table-date">
                    {approveDate ? approveDate.toLocaleString("mn-MN", dateOptions) : "-"}
                  </td>
                )}
                <td className="table-amount">{record.amount.toLocaleString("mn-MN")}</td>
                <td className="table-actions">
                  {!showHistory && isPending ? (
                    <button
                      type="button"
                      className="btn-icon btn-accept"
                      title="Батлах"
                      onClick={() => approve({ id: record.withdrawalId })}
                    >
                      <FaCheck size={18} />
                    </button>
                  ) : (
                    <span className={statusClass}>{statusText}</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="pagination-controls">
        <span>
          Page {currentPage} of {totalPages}
        </span>
        <button onClick={() => handlePageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>
          Өмнөх
        </button>
        <button onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>
          Дараагийнх
        </button>
        <label>
          Items per page:
          <select className="custom-select" value={pageSize} onChange={handlePageSizeChange}>
            {[10, 20, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <span>Нийт: {withdrawals.length}</span>
      </div>
    </div>
  );
}

export default AdminWithdrawList;
