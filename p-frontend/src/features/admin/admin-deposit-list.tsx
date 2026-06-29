import { useState } from "react";
import type { Deposit } from "../../api/admin";
import { FiCheck, FiX } from "react-icons/fi";

interface AdminDepositListProps {
  deposits: Deposit[];
  onAccept?: (depositId: number) => void;
  onIgnore?: (depositId: number) => void;
  showHistory?: boolean;
}

function AdminDepositList({ deposits, onAccept, onIgnore, showHistory = false }: AdminDepositListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPageSize(Number(e.target.value));
    setCurrentPage(1);
  };

  const paginatedData = deposits.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalPages = Math.ceil(deposits.length / pageSize);

  return (
    <div className="admin-table-wrapper">
      <table className="admin-table">
        <thead>
          <tr>
            <th>№</th>
            <th>Хэрэглэгч</th>
            <th>Дүн</th>
            <th>Үүсгэсэн огноо</th>
            {showHistory && <th>Зөвшөөрсөн огноо</th>}
            <th>{showHistory ? "Төлөв" : "Үйлдэл"}</th>
          </tr>
        </thead>
        <tbody>
          {paginatedData.map((record, index) => {
            const date = new Date(record.createDate);
            const dateOptions: Intl.DateTimeFormatOptions = {
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            };
            
            const isPending = record.status === "PENDING" || (!record.status && !record.approvedBy && !record.approveDate && !record.adminId && !record.approvedDate);
            const isApproved = record.status === "APPROVED" || (record.adminId && record.approvedDate) || (record.approvedBy && record.approveDate);
            const isDenied = record.status === "DENIED";
            
            let statusText = "Хүлээгдэж буй";
            let statusClass = "status-pending";
            
            if (isApproved) {
              statusText = "Зөвшөөрөгдсөн";
              statusClass = "status-approved";
            } else if (isDenied) {
              statusText = "Татгалзсан";
              statusClass = "status-denied";
            }
            
            const approveDate = record.approvedDate ? new Date(record.approvedDate) : (record.approveDate ? new Date(record.approveDate) : null);

            return (
              <tr key={record.depositId} className={isPending ? "row-pending" : isApproved ? "row-approved" : "row-denied"}>
                <td className="table-index">{(currentPage - 1) * pageSize + index + 1}</td>
                <td className="table-user">{record.user?.username}</td>
                <td className="table-amount">{record.amount.toLocaleString("mn-MN")}</td>
                <td className="table-date">{date.toLocaleString("mn-MN", dateOptions)}</td>
                {showHistory && (
                  <td className="table-date">
                    {approveDate ? approveDate.toLocaleString("mn-MN", dateOptions) : "-"}
                  </td>
                )}
                <td className="table-actions">
                  {!showHistory && isPending ? (
                    <>
                      <button className="btn-icon btn-accept" title="Зөвшөөрөх" onClick={() => onAccept?.(record.depositId)}>
                        <FiCheck size={18} />
                      </button>
                      <button className="btn-icon btn-ignore" title="Татгалзах" onClick={() => onIgnore?.(record.depositId)}>
                        <FiX size={18} />
                      </button>
                    </>
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
        <span>Нийт: {deposits.length}</span>
      </div>
    </div>
  );
}

export default AdminDepositList;
