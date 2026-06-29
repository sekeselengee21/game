import type { GameState } from "../../../types/gameTypes";
import { useState, useEffect } from "react";
import { useMeQuery } from "../../../api/user";
import avatar1 from "../../../assets/image/avatar/6820.png";
import avatar2 from "../../../assets/image/avatar/6821.png";
import avatar3 from "../../../assets/image/avatar/6825.png";
import avatar4 from "../../../assets/image/avatar/6832.png";
import avatar5 from "../../../assets/image/avatar/6834.png";
import avatar6 from "../../../assets/image/avatar/6836.png";
import avatar7 from "../../../assets/image/avatar/6837.png";
import avatar8 from "../../../assets/image/avatar/6838.png";

const BOT_AVATARS = [avatar1, avatar2, avatar3, avatar4, avatar5, avatar6, avatar7, avatar8];

function TexasTableRechargeForm({
  recharge,
  takeSeat,
  gameState,
  modalType,
  selectedSeat,
  rechargeAmount = gameState.minBuyIn,
  setRechargeAmount,
  isActuallySeated,
}: {
  recharge: (amount: number) => void;
  takeSeat: (seatIndex: number, amount: number, isBot?: boolean, botName?: string, isGoodBot?: boolean, botAvatar?: string) => void;
  gameState: GameState;
  modalType: string;
  selectedSeat: number;
  rechargeAmount: number;
  setRechargeAmount: (value: number) => void;
  isActuallySeated: boolean;
  open?: boolean;
}) {
  const [role, setRole] = useState<"PLAYER" | "BOT" | "GOOD_BOT">("PLAYER");
  const [botName, setBotName] = useState("");
  const [botAvatar, setBotAvatar] = useState<string | null>(null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  const finalModalType = modalType === "RECHARGE" || isActuallySeated ? "RECHARGE" : "SIT";
  const [amountStr, setAmountStr] = useState(rechargeAmount.toString());
  const parsedAmount = parseInt(amountStr || "0", 10);
  const isRechargeTooLow = parsedAmount < gameState.minBuyIn;

  const isDisabled = (finalModalType === "RECHARGE" && !isActuallySeated && gameState.seats.length === 0) || isRechargeTooLow;

  const token = localStorage.getItem("accessToken");
  const { data: me } = useMeQuery(undefined, { skip: !token });
  const isAdmin = me?.role === "ADMIN" || me?.role === "SUPER_ADMIN";

  useEffect(() => {
    setAmountStr(rechargeAmount.toString());
  }, [rechargeAmount]);

  return (
    <form
      className="recharge-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (finalModalType === "RECHARGE") {
          recharge(rechargeAmount);
        } else {
          const chosenSeat = selectedSeat > 0 ? selectedSeat : 0;
          const isBot = role === "BOT" || role === "GOOD_BOT";
          const isGoodBot = role === "GOOD_BOT";
          takeSeat(chosenSeat, rechargeAmount, isBot, isBot ? botName : undefined, isGoodBot, isBot ? (botAvatar ?? undefined) : undefined);
        }
      }}
    >
      {modalType === "TAKE_SEAT" && isAdmin && (
        <div className="role-toggle">
          <div className="bot-type-buttons">
            <button
              type="button"
              className={`bot-type-btn ${role === "PLAYER" ? "active" : ""}`}
              onClick={() => setRole("PLAYER")}
            >
              Тоглогч
            </button>
            <button
              type="button"
              className={`bot-type-btn ${role === "BOT" ? "active" : ""}`}
              onClick={() => setRole("BOT")}
            >
              Бот
            </button>
            <button
              type="button"
              className={`bot-type-btn good-bot ${role === "GOOD_BOT" ? "active" : ""}`}
              onClick={() => setRole("GOOD_BOT")}
            >
              Про бот
            </button>
          </div>

          {(role === "BOT" || role === "GOOD_BOT") && (
            <div className="bot-name-row">
              <input
                type="text"
                placeholder="Нэр"
                value={botName}
                onChange={(e) => setBotName(e.target.value)}
                className="bot-name-input"
                required
              />
              <button
                type="button"
                className="bot-avatar-btn"
                onClick={() => setShowAvatarPicker((p) => !p)}
              >
                {botAvatar ? (
                  <img src={botAvatar} alt="avatar" className="bot-avatar-preview" />
                ) : (
                  "Аватар"
                )}
              </button>
            </div>
          )}

          {showAvatarPicker && (role === "BOT" || role === "GOOD_BOT") && (
            <div className="bot-avatar-picker">
              {BOT_AVATARS.map((img) => (
                <img
                  key={img}
                  src={img}
                  alt="avatar"
                  className={`bot-avatar-option ${botAvatar === img ? "selected" : ""}`}
                  onClick={() => {
                    setBotAvatar(img);
                    setShowAvatarPicker(false);
                  }}
                />
              ))}
              <label className="bot-avatar-upload-btn" title="Upload image">
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      const img = new Image();
                      img.onload = () => {
                        const SIZE = 128;
                        const canvas = document.createElement("canvas");
                        canvas.width = SIZE;
                        canvas.height = SIZE;
                        const ctx = canvas.getContext("2d")!;
                        const scale = Math.min(SIZE / img.width, SIZE / img.height);
                        const w = img.width * scale;
                        const h = img.height * scale;
                        ctx.drawImage(img, (SIZE - w) / 2, (SIZE - h) / 2, w, h);
                        setBotAvatar(canvas.toDataURL("image/jpeg", 0.85));
                        setShowAvatarPicker(false);
                      };
                      img.src = ev.target?.result as string;
                    };
                    reader.readAsDataURL(file);
                    e.target.value = "";
                  }}
                />
                📁
              </label>
            </div>
          )}
        </div>
      )}

      {/* Balance Display */}
      <div className="recharge-balance-display">
        <div className="balance-item">
          <span className="balance-label">Үлдэгдэл</span>
          <span className="balance-value">{gameState.usableBalance.toLocaleString("en-US")}</span>
        </div>
        <div className="balance-item">
          <span className="balance-label">Ул</span>
          <span className="balance-value">
            {gameState.smallBlind}/{gameState.bigBlind}
          </span>
        </div>
      </div>

      {/* Amount Slider */}
      <div className="recharge-slider-container">
        <div className="slider-labels-horizontal">
          <span>{gameState.minBuyIn.toLocaleString("en-US")}</span>
          <span>{gameState.maxBuyIn.toLocaleString("en-US")}</span>
        </div>
        <input
          type="range"
          className="recharge-amount-slider"
          min={gameState.minBuyIn}
          max={Math.min(gameState.maxBuyIn, gameState.usableBalance)}
          step={gameState.bigBlind}
          value={rechargeAmount}
          onChange={(e) => {
            const value = parseInt(e.target.value, 10);
            setRechargeAmount(value);
            setAmountStr(value.toString());
          }}
        />
      </div>

      {/* Amount Input */}
      <div className="recharge-amount-input-wrapper">
        <label className="input-label">Мөнгөн дүн</label>
        <input
          type="number"
          className="recharge-amount-input no-spin"
          min={gameState.minBuyIn}
          max={Math.min(gameState.maxBuyIn, gameState.usableBalance)}
          value={amountStr}
          onChange={(e) => {
            const val = e.target.value;
            if (val === "") {
              setAmountStr("");
              return;
            }
            let parsed = parseInt(val, 10);
            if (parsed < 0) parsed = 0;
            if (parsed > Math.min(gameState.maxBuyIn, gameState.usableBalance)) parsed = Math.min(gameState.maxBuyIn, gameState.usableBalance);
            setAmountStr(parsed.toString());
          }}
          onBlur={() => {
            const parsed = parseInt(amountStr, 10);
            const safeValue = isNaN(parsed)
              ? gameState.minBuyIn
              : Math.max(gameState.minBuyIn, Math.min(parsed, gameState.maxBuyIn, gameState.usableBalance));
            setRechargeAmount(safeValue);
            setAmountStr(safeValue.toString());
          }}
        />
      </div>

      {/* Preset Buttons */}
      <div className="recharge-preset-buttons">
        <button
          type="button"
          onClick={() => {
            setRechargeAmount(gameState.minBuyIn);
            setAmountStr(gameState.minBuyIn.toString());
          }}
        >
          Min
        </button>
        <button
          type="button"
          onClick={() => {
            const amount = Math.min(gameState.bigBlind * 40, gameState.maxBuyIn, gameState.usableBalance);
            setRechargeAmount(amount);
            setAmountStr(amount.toString());
          }}
        >
          40BB
        </button>
        <button
          type="button"
          onClick={() => {
            const amount = Math.min(gameState.bigBlind * 70, gameState.maxBuyIn, gameState.usableBalance);
            setRechargeAmount(amount);
            setAmountStr(amount.toString());
          }}
        >
          70BB
        </button>
        <button
          type="button"
          onClick={() => {
            const amount = Math.min(gameState.maxBuyIn, gameState.usableBalance);
            setRechargeAmount(amount);
            setAmountStr(amount.toString());
          }}
        >
          Max
        </button>
      </div>

      {/* Submit Section */}
      <div className="submit-section">
        <button className="submit-btn" type="submit" disabled={isDisabled}>
          {finalModalType === "RECHARGE" ? "Цэнэглэх" : "Суух"}
        </button>
        {isRechargeTooLow && <p className="warning-text">Ширээний доод лимит {gameState.minBuyIn.toLocaleString()}.</p>}
      </div>
    </form>
  );
}

export default TexasTableRechargeForm;
