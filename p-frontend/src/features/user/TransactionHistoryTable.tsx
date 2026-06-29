import React, { useState } from "react";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";

export type TransactionHistoryItem = {
  id: string;
  type: "Withdrawal" | "Deposit" | "Таталт" | "Цэнэглэлт";
  amount: number;
  date: string;
  status: string;
  details?: string;
};

interface TransactionHistoryTableProps {
  history: TransactionHistoryItem[];
}

const TransactionHistoryTable: React.FC<TransactionHistoryTableProps> = ({ history }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const formatCurrency = (value: number) => value.toLocaleString();
  const formatDate = (date: string) =>
    new Date(date).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const formatStatus = (status: string) => {
    if (status === "Complete") return "Батлагдсан";
    if (status === "Pending") return "Хүлээгдэж буй";
    return status;
  };

  return (
    <div className="withdraw-history-card">
      {history.length === 0 ? (
        <p className="no-data-text">No history found</p>
      ) : (
        <div className="history-list">
          {history.map((tx) => {
            const isExpanded = expandedId === tx.id;
            return (
              <div key={tx.id} className={`history-item ${isExpanded ? "expanded" : ""}`} onClick={() => toggleExpand(tx.id)}>
                <div className="history-summary">
                  <div className="summary-left">
                    {tx.type} - {formatCurrency(tx.amount)}₮
                  </div>
                  <div className="summary-right">{isExpanded ? <FaChevronUp /> : <FaChevronDown />}</div>
                </div>

                <div className={`history-details ${isExpanded ? "expanded" : ""}`}>
                  <p>Огноо: {formatDate(tx.date)}</p>
                  {tx.details && <p>Дэлгэрэнгүй: {tx.details}</p>}
                  <p>Төлөв: {formatStatus(tx.status)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TransactionHistoryTable;
