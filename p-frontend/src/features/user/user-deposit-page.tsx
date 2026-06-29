import { logger } from "../../utils/logger";
import { useMeQuery, useCreateDepositMutation, useFetchDataBlockByNameQuery } from "../../api/user";
import { useEffect, useContext, useState } from "react";
import { toast } from "react-toastify";
import { CiBank } from "react-icons/ci";
import { FaRegUser, FaCopy } from "react-icons/fa";
import { MdDriveFileRenameOutline, MdAccountBalanceWallet } from "react-icons/md";
import { GlobalWebSocketContext } from "../../providers/GlobalWebSocketProvider";

interface UserDepositPageProps {
  balance?: number;
}

function UserDepositPage({ balance }: UserDepositPageProps) {
  const token = localStorage.getItem("accessToken");
  const { data } = useMeQuery(undefined, { skip: !token });
  const [createDeposit, { isLoading }] = useCreateDepositMutation();
  const { ws } = useContext(GlobalWebSocketContext);
  const [copied, setCopied] = useState(false);
  const [amount, setAmount] = useState<number>(0);

  const { data: cashierBlock } = useFetchDataBlockByNameQuery("cashier_settings");
  const cashierSettings = (() => {
    try {
      return cashierBlock ? JSON.parse(cashierBlock.value) : null;
    } catch {
      return null;
    }
  })();
  const cashierBankName: string = cashierSettings?.bankName ?? "";
  const cashierAccountNumber: string = cashierSettings?.accountNumber ?? "";
  const cashierAccountHolder: string = cashierSettings?.accountHolder ?? "";

  const formatNumber = (num: number) => num.toLocaleString("en-US").replace(/,/g, " ");

  // WebSocket listener for deposit updates (still kept if needed elsewhere)
  useEffect(() => {
    if (!ws) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === "DEPOSIT_STATUS_UPDATE") {
          // Placeholder: you can refetch deposits if needed
        }
      } catch (error) {
        logger.error("Failed to parse WebSocket message:", error);
      }
    };

    ws.addEventListener("message", handleMessage);
    return () => {
      ws.removeEventListener("message", handleMessage);
    };
  }, [ws]);

  const effectiveBalance = balance ?? data?.userBalance?.balance ?? 0;

  const formatBalance = (num?: number) => {
    if (num === undefined) return "0";
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const handleCopyAccountNumber = () => {
    const accountNumber = cashierAccountNumber;
    navigator.clipboard.writeText(accountNumber).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => {
        toast.error("Хуулах үед алдаа гарлаа!");
      },
    );
  };

  const handleDeposit = async () => {
    if (!amount || amount <= 0) {
      toast.error("Дүн оруулна уу!");
      return;
    }

    try {
      await createDeposit({
        userId: data!.userId,
        amount,
        type: "BANK_TRANSFER",
        details: { note: "User requested deposit" },
      }).unwrap();

      toast.success("Таны хүсэлт амжилттай илгээгдлээ!");
      setAmount(0);
    } catch (e) {
      logger.error("Deposit error:", e);
      toast.error("Алдаа гарлаа!");
    }
  };

  return (
    <div className="user-deposit-container">
      {/* Balance */}
      <div className="deposit-balance-box">
        <span className="deposit-balance-title">Боломжит үлдэгдэл:</span>
        <span className="deposit-balance-amount">{formatBalance(effectiveBalance)} ₮</span>
      </div>

      <div className="bank-info">
        <div className="bank-row">
          <CiBank />
          <span>Банкны нэр : {cashierBankName}</span>
        </div>

        <div className="bank-row account-number-wrapper">
          <MdAccountBalanceWallet />
          <span>Bank account : {cashierAccountNumber}</span>
          <button onClick={handleCopyAccountNumber} title="Хуулах">
            <FaCopy />
          </button>
          {copied && <span className="tooltip">Хуулсан!</span>}
        </div>

        <div className="bank-row">
          <FaRegUser />
          <span>Данс эзэмшигч : {cashierAccountHolder}</span>
        </div>

        <div className="bank-row">
          <MdDriveFileRenameOutline />
          <span>
            Гүйлгээний утга хэсэгт өөрийн <b>Username-ээ</b> заавал бичнэ үү.
          </span>
        </div>
      </div>

      {/* Deposit input */}
      <input
        id="deposit-amount"
        type="text"
        value={amount === 0 || isNaN(amount) ? "" : formatNumber(amount)}
        onFocus={() => {
          if (amount === 0) setAmount(NaN);
        }}
        onBlur={() => {
          if (isNaN(amount)) setAmount(0);
        }}
        onChange={(e) => {
          const numericValue = Number(e.target.value.replace(/\s/g, ""));
          setAmount(numericValue);
        }}
        placeholder="Орлого хийх дүн"
        className="withdraw-input"
      />

      <button className="withdraw-submit-btn" onClick={handleDeposit} disabled={isLoading}>
        {isLoading ? "Илгээж байна..." : "Орлого хийх"}
      </button>
    </div>
  );
}

export default UserDepositPage;
