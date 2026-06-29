import { Suspense, useState, useMemo } from "react";
import UserWithdrawPage from "../features/user/user-withdraw-page";
import UserDepositPage from "../features/user/user-deposit-page";
import { useFetchWithdrawalsQuery, useFetchDepositsQuery } from "../api/user";
import TransactionHistoryTable, { type TransactionHistoryItem } from "../features/user/TransactionHistoryTable";
import { useIsMobile } from "../hooks/useIsMobile";

interface UserFinanceModalProps {
  isModalVisible: boolean;
  isAuthenticated: boolean;
  closeModal?: () => void;
  userBalance?: number;
}

export default function UserFinanceModal({ userBalance, closeModal }: UserFinanceModalProps) {
  const [activeTab, setActiveTab] = useState<"withdraw" | "deposit" | "history">("withdraw");
  const isMobile = useIsMobile();
  const { data: withdrawalsData } = useFetchWithdrawalsQuery();
  const { data: depositsData } = useFetchDepositsQuery();

  const withdrawals = withdrawalsData || [];
  const deposits = depositsData || [];

  const mergedHistory: TransactionHistoryItem[] = useMemo(() => {
    return [
      ...withdrawals.map((w: any) => ({
        id: w.withdrawalId,
        type: "Таталт",
        amount: w.amount,
        date: w.createDate,
        status: w.approvedBy ? "Complete" : "Pending",
      })),
      ...deposits.map((d: any) => ({
        id: d.depositId,
        type: "Цэнэглэлт",
        amount: d.amount,
        date: d.createDate,
        status: "Complete",
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [withdrawals, deposits]);

  return (
    <div className="ufm-bottom-sheet" onClick={(e) => e.stopPropagation()}>
      {!isMobile && (
        <div className="utf-header">
          <div className="utf-header-icon logo"></div>
          <div className="utf-header-name">Касс</div>
          <div className="utf-header-icon close" onClick={closeModal}></div>
        </div>
      )}

      <div className="bottom-wrapper">
        <div className="ufm-tabs">
          <div className={`ufm-tab ${activeTab === "withdraw" ? "active" : ""}`} onClick={() => setActiveTab("withdraw")}>
            Татах
          </div>
          <div className={`ufm-tab ${activeTab === "deposit" ? "active" : ""}`} onClick={() => setActiveTab("deposit")}>
            Цэнэглэх
          </div>
          <div className={`ufm-tab ${activeTab === "history" ? "active" : ""}`} onClick={() => setActiveTab("history")}>
            Түүх
          </div>
        </div>

        <div className="ufm-content-anim">
          <Suspense fallback={<div className="ufm-loading">Уншиж байна...</div>}>
            {activeTab === "withdraw" && <UserWithdrawPage balance={userBalance} key="withdraw" />}
            {activeTab === "deposit" && <UserDepositPage balance={userBalance} key="deposit" />}
            {activeTab === "history" && <TransactionHistoryTable history={mergedHistory} />}
          </Suspense>
        </div>
      </div>
    </div>
  );
}
