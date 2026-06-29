import { type User, useClaimBonusMutation } from "../../api/user";
import { toast } from "react-toastify";
import formatAmount from "../../utils/formatNumber";
import { useState, useEffect } from "react";

interface BonusModalInterface {
  isModalVisible: boolean;
  isAuthenticated: boolean;
  closeModal: () => void;
  refetch: () => void;
  userInfo?: User | undefined;
}

function BonusModal({ closeModal, userInfo, refetch }: BonusModalInterface) {
  const [claimBonus, { isLoading }] = useClaimBonusMutation();
  const [shake, setShake] = useState(false);
  const bonusBalance = userInfo?.userBalance.bonusBalance;

  const handleClaim = async () => {
    if (userInfo?.userBalance?.bonusBalance && userInfo.userBalance.bonusBalance > 0) {
      try {
        const updatedBalance = await claimBonus().unwrap();
        refetch();
        toast.success(`Bonus claimed! New balance: ${updatedBalance.balance}`);
      } catch (err) {
        toast.error("Failed to claim bonus. Please try again.");
        console.error("Failed to claim bonus:", err);
      }
    } else {
      toast("No bonus available to claim.");
    }
  };

  const triggerShake = () => {
    setShake(false);
    requestAnimationFrame(() => {
      setShake(true);
      setTimeout(() => setShake(false), 600);
    });
  };

  useEffect(() => {
    if (!bonusBalance || bonusBalance <= 0) return;

    triggerShake();

    const interval = setInterval(() => {
      triggerShake();
    }, 3000);

    return () => clearInterval(interval);
  }, [bonusBalance]);

  return (
    <div className="ufm-bottom-sheet">
      <div className="utf-header">
        <div className="utf-header-icon logo"></div>
        <div className="utf-header-name">Миний бонус</div>
        <div className="utf-header-icon close" onClick={closeModal}></div>
      </div>
      <div className="bonus-card">
        <div className={`bonus-amount ${shake ? "shake" : ""}`}>{formatAmount(bonusBalance || 0)}</div>
        <div className="bonus-claim-btn" onClick={handleClaim}>
          {isLoading ? "Авч байна..." : "Авах"}
        </div>
      </div>
    </div>
  );
}

export default BonusModal;
