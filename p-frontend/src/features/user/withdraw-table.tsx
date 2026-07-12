import { useEffect, useState } from "react";
import { useCreateWithdrawalMutation, useMeQuery } from "../../api/user";

function WithdrawTable({ balance = 0 }: { balance?: number }) {
  const [amount, setAmount] = useState<number>(0);
  const [createWithdrawal, { isSuccess, isError, error }] = useCreateWithdrawalMutation();
  const token = localStorage.getItem("accessToken");
  const { data: meData } = useMeQuery(undefined, { skip: !token });
  console.log(meData);
  const formatNumber = (num: number) => num.toLocaleString("en-US").replace(/,/g, " ");
  const minWithdrawal = 20000;

  useEffect(() => {
    if (isSuccess) {
      alert("Withdrawal created successfully!");
      setAmount(0);
    }
    if (isError) {
      alert((error as { data?: { message?: string } })?.data?.message || "An unknown error occurred during withdrawal.");
    }
  }, [isSuccess, isError, error]);

  const isTooMuch = amount > balance;
  const isTooLow = amount < minWithdrawal;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isTooMuch || isTooLow) return;
    createWithdrawal({ amount, details: {} });
  };

  const formatBalance = (num?: number) => {
    if (num === undefined) return "0";
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const canWithdraw = balance >= minWithdrawal;
  const cgpScore = meData?.cgpScore;

  return (
    <div className="withdraw-table-container">
      <div className="deposit-balance-box">
        <div className="deposit-balance-title">Боломжит үлдэгдэл:</div>
        <div className="deposit-balance-amount">{formatBalance(meData?.userBalance?.balance)} ₮</div>
      </div>
      <div className="deposit-balance-box">
        <div className="deposit-balance-title">CGP оноо:</div>
        <div className="deposit-balance-amount">{cgpScore}</div>
      </div>

      {(meData?.bankName || meData?.accountNumber) && (
        <div className="withdraw-bank-info">
          <div className="withdraw-bank-info-title">Холбосон дансны мэдээлэл</div>
          <div className="withdraw-bank-info-row">
            <span className="withdraw-bank-info-label">Банк:</span>
            <span className="withdraw-bank-info-value">{meData?.bankName || "—"}</span>
          </div>
          <div className="withdraw-bank-info-row">
            <span className="withdraw-bank-info-label">Дансны дугаар:</span>
            <span className="withdraw-bank-info-value">{meData?.accountNumber || "—"}</span>
          </div>
        </div>
      )}

      {canWithdraw ? (
        <form className="withdraw-form" onSubmit={handleSubmit}>
          <input
            id="withdraw-amount"
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
            min={minWithdrawal}
            max={balance}
            className={`withdraw-input ${isTooMuch || isTooLow ? "input-error" : ""}`}
            placeholder={isTooMuch ? "Хэт их" : isTooLow ? "Хэт бага" : formatNumber(minWithdrawal)}
          />
          <button type="submit" disabled={isTooMuch || isTooLow} className="withdraw-submit-btn">
            Татах
          </button>
        </form>
      ) : (
        <div className="withdraw-disabled-text">Боломжгүй: Хамгийн бага аккаунт баланс зөрчигдсөн</div>
      )}
    </div>
  );
}

export default WithdrawTable;
