import { useState } from "react";
import { type User, useUpdateMeMutation } from "../../api/user";

interface MyRegisterInterface {
  isModalVisible: boolean;
  isAuthenticated: boolean;
  closeModal: () => void;
  userInfo?: User;
}

function MyRegisterModal({ closeModal, userInfo }: MyRegisterInterface) {
  const [username, setUsername] = useState(userInfo?.username ?? "");
  const [email, setEmail] = useState(userInfo?.email ?? "");
  const [bankName, setBankName] = useState(userInfo?.bankName ?? "");
  const [accountNumber, setAccountNumber] = useState(userInfo?.accountNumber ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [updateMe, { isLoading }] = useUpdateMeMutation();

  const handleSave = async () => {
    setError("");
    try {
      await updateMe({ username, email, bankName, accountNumber } as User).unwrap();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Хадгалахад алдаа гарлаа.");
    }
  };

  const balance = userInfo?.userBalance?.balance ?? 0;

  return (
    <div className="ufm-bottom-sheet">
      <div className="utf-header">
        <div className="utf-header-icon logo" />
        <div className="utf-header-name">Миний бүртгэл</div>
        <div className="utf-header-icon close" onClick={closeModal} />
      </div>

      <div className="myreg-body">
        {/* Avatar + balance */}
        <div className="myreg-avatar-row">
          {userInfo?.avatar || userInfo?.profileUrl ? (
            <img
              className="myreg-avatar"
              src={userInfo.avatar || userInfo.profileUrl}
              alt="avatar"
            />
          ) : (
            <div className="myreg-avatar-placeholder" />
          )}
          <div className="myreg-meta">
            <div className="myreg-balance">{balance.toLocaleString("en-US")} ₮</div>
            <div className="myreg-uid">ID: {userInfo?.userId}</div>
            <div className="myreg-cgp">CGP: {userInfo?.cgpScore ?? 0}</div>
          </div>
        </div>

        {/* Editable fields */}
        <div className="myreg-fields">
          <div className="myreg-field">
            <label className="myreg-label">Хэрэглэгчийн нэр</label>
            <input
              className="myreg-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Хэрэглэгчийн нэр"
            />
          </div>

          <div className="myreg-field">
            <label className="myreg-label">Имэйл</label>
            <input
              className="myreg-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Имэйл хаяг"
            />
          </div>

          <div className="myreg-field">
            <label className="myreg-label">Банкны нэр</label>
            <input
              className="myreg-input"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="Банкны нэр"
            />
          </div>

          <div className="myreg-field">
            <label className="myreg-label">Дансны дугаар</label>
            <input
              className="myreg-input"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="Дансны дугаар"
            />
          </div>
        </div>

        {error && <div className="myreg-error">{error}</div>}

        <button
          className={`myreg-save-btn ${saved ? "saved" : ""}`}
          onClick={handleSave}
          disabled={isLoading}
        >
          {isLoading ? "Хадгалж байна..." : saved ? "Хадгалагдлаа ✓" : "Хадгалах"}
        </button>
      </div>
    </div>
  );
}

export default MyRegisterModal;
