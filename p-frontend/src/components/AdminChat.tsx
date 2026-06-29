import { logger } from "../utils/logger";
import { useContext, useState, useRef, useEffect } from "react";
import { GlobalWebSocketContext } from "../providers/GlobalWebSocketProvider";
import { IoSend } from "react-icons/io5";
import { useDeleteChatHistoryMutation } from "../api/admin";

const COOLDOWN_SECONDS = 30;
const PLAYER_MAX_CHARS = 30;

const AVATAR_COLORS = ["#c8192e", "#e05c1a", "#2563eb", "#7c3aed", "#0891b2", "#059669", "#d97706"];

function avatarColor(username: string) {
  let hash = 0;
  for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

interface AdminChatProps {
  onClose?: () => void;
}

export default function AdminChat({ onClose }: AdminChatProps) {
  const { chatMessages, sendChatMessage, clearChatMessages, userInfo } = useContext(GlobalWebSocketContext);
  const [deleteChatHistory] = useDeleteChatHistoryMutation();
  const [text, setText] = useState("");
  const isAdmin = userInfo?.role === "ADMIN";
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const COOLDOWN_KEY = `chat_cooldown_end_${userInfo?.userId ?? "guest"}`;

  const getRemainingSeconds = () => {
    const end = parseInt(localStorage.getItem(COOLDOWN_KEY) ?? "0", 10);
    return Math.max(0, Math.ceil((end - Date.now()) / 1000));
  };

  const [cooldown, setCooldown] = useState(() => getRemainingSeconds());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Clear interval and localStorage when cooldown reaches 0
  useEffect(() => {
    if (cooldown === 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      localStorage.removeItem(COOLDOWN_KEY);
    }
  }, [cooldown, COOLDOWN_KEY]);

  // On mount, resume any active cooldown that survived a refresh
  useEffect(() => {
    const remaining = getRemainingSeconds();
    if (remaining > 0) {
      setCooldown(remaining);
      timerRef.current = setInterval(() => {
        setCooldown(getRemainingSeconds());
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCooldown = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const endTime = Date.now() + COOLDOWN_SECONDS * 1000;
    localStorage.setItem(COOLDOWN_KEY, String(endTime));
    setCooldown(COOLDOWN_SECONDS);
    timerRef.current = setInterval(() => {
      setCooldown(getRemainingSeconds());
    }, 1000);
  };

  const handleSendMessage = () => {
    if (!text.trim()) return;
    if (!isAdmin && cooldown > 0) return;
    logger.log("Sending chat message:", text);
    const sent = sendChatMessage?.(text.trim());
    if (sent === false) return;
    setText("");
    if (!isAdmin) startCooldown();
    inputRef.current?.focus();
  };

  const inputDisabled = !isAdmin && cooldown > 0;
  const cooldownPct = (cooldown / COOLDOWN_SECONDS) * 100;

  return (
    <div className="ac-root">
      {/* Header */}
      <div className="ac-header">
        <div className="ac-header-dot" />
        <span className="ac-header-title">Лобби чат</span>
        <div className="ac-header-actions">
          {isAdmin && chatMessages.length > 0 && (
            <button
              className="ac-header-clear"
              onClick={async () => {
                try {
                  await deleteChatHistory().unwrap();
                } catch (e) {
                  logger.error("Failed to delete chat history", e);
                }
                clearChatMessages();
              }}
              aria-label="Clear chat history"
              title="Чат устгах"
            >
              🗑
            </button>
          )}
          <button className="ac-header-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
      </div>

      {/* Messages */}
      <div className="ac-messages">
        {chatMessages.length === 0 ? (
          <div className="ac-empty">
            <div className="ac-empty-icon">💬</div>
            <p>Одоохондоо мессеж байхгүй байна</p>
          </div>
        ) : (
          chatMessages.map((msg, index) => {
            const isOwn = msg.username === userInfo?.username;
            const initial = msg.username?.[0]?.toUpperCase() ?? "?";
            const color = avatarColor(msg.username ?? "");

            return (
              <div key={`${msg.id}-${index}`} className={`ac-message ${isOwn ? "ac-message--own" : ""}`}>
                <div className="ac-avatar" style={{ background: color }}>
                  {initial}
                </div>
                <div className="ac-bubble">
                  <div className="ac-meta">
                    <span className="ac-username">{msg.username}</span>
                    <span className="ac-time">
                      {msg.createdAt ? msg.createdAt.slice(11, 16) : ""}
                    </span>
                  </div>
                  <div className="ac-text">{msg.message}</div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Cooldown bar */}
      {!isAdmin && cooldown > 0 && (
        <div className="ac-cooldown-bar">
          <div className="ac-cooldown-fill" style={{ width: `${cooldownPct}%` }} />
          <span className="ac-cooldown-label">{cooldown}с дараа бичнэ үү</span>
        </div>
      )}

      {/* Input */}
      <div className="ac-input-row">
        <input
          ref={inputRef}
          className="ac-input"
          type="text"
          value={text}
          onChange={(e) => {
            const val = e.target.value;
            if (!isAdmin && val.length > PLAYER_MAX_CHARS) return;
            setText(val);
          }}
          maxLength={isAdmin ? undefined : PLAYER_MAX_CHARS}
          placeholder={inputDisabled ? `${cooldown}с дараа бичнэ үү...` : "Мессеж бичих..."}
          disabled={inputDisabled}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSendMessage();
          }}
        />
        <button className="ac-send-btn" onClick={handleSendMessage} disabled={inputDisabled}>
          <IoSend size={16} />
        </button>
      </div>
      {!isAdmin && (
        <div className="ac-char-count" style={{ color: text.length >= PLAYER_MAX_CHARS ? "#c8192e" : undefined }}>
          {text.length}/{PLAYER_MAX_CHARS}
        </div>
      )}
    </div>
  );
}
