import { useState, useEffect, useRef } from "react";
import type { GameCard, GamePlayer } from "../../api/game";
import PokerCard from "./poker-card";
import { IoSend } from "react-icons/io5";

interface Chat {
  id: number;
  username: string;
  message: string;
  cards?: GameCard[];
}
type TabType = "chat" | "admin" | "emoji";
const CHAT_LEVELS = [{ level: 1, name: "Soldier", minCgp: 100_000 }] as const;

function getChatLevel(cgp: number) {
  for (let i = CHAT_LEVELS.length - 1; i >= 0; i--) {
    if (cgp >= CHAT_LEVELS[i].minCgp) return CHAT_LEVELS[i];
  }
  return null;
}

function PokerChat({
  messages = [],
  sendChat,
  destinedCommunityCards = [],
  player,

  cgpScore = 0,
}: {
  messages?: Chat[];
  sendChat?: (message: string) => void;
  destinedCommunityCards?: GameCard[];
  subscribe?: () => void;
  player: GamePlayer | undefined;
  lastAction?: {
    username: string;
    message: string;
  } | null;
  winners?: {
    username: string;
    amount: number;
    cards: GameCard[];
  }[];
  cgpScore?: number;
}) {
  const [inputValue, setInputValue] = useState<string>("");
  const [activeTab, setActiveTab] = useState<TabType>("chat");
  const chatBoxRef = useRef<HTMLDivElement>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const emojis = ["😀", "😂", "😍", "😎", "😭", "🔥", "👍", "👎", "❤️", "🎉", "😡", "🤯", "🥶", "😴", "💰", "🃏", "♠️", "♥️", "♣️", "♦️"];
  const CHAT_MAX_LENGTH = 15;
  const handleEmojiClick = (emoji: string) => {
    setInputValue((prev) =>
      Array.from(prev + emoji)
        .slice(0, CHAT_MAX_LENGTH)
        .join(""),
    );
  };
  const handleSendMessage = () => {
    const trimmed = inputValue.trim();
    if (trimmed === "") return;
    sendChat?.(Array.from(trimmed).slice(0, CHAT_MAX_LENGTH).join(""));
    setInputValue("");
  };

  const isAdmin = player?.user?.role === "ADMIN";
  const chatLevelInfo = getChatLevel(cgpScore);
  const canChat = isAdmin || chatLevelInfo !== null;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!isChatOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (chatBoxRef.current && !chatBoxRef.current.contains(event.target as Node)) {
        setIsChatOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isChatOpen]);

  return (
    <div className={`chat-box-toggle ${isChatOpen ? "open" : ""}`}>
      <div className="toggle-chat-btn" onClick={() => setIsChatOpen((prev) => !prev)} title="Chat" data-name="Чат" />

      <div ref={chatBoxRef} className="chat-box">
        <div className="tab-header">
          <button className={`tab-button ${activeTab === "chat" ? "active" : ""}`} onClick={() => setActiveTab("chat")}>
            Чат
          </button>
          <button className={`tab-button ${activeTab === "emoji" ? "active" : ""}`} onClick={() => setActiveTab("emoji")}>
            Emoji
          </button>
          {isAdmin && (
            <button className={`tab-button ${activeTab === "admin" ? "active" : ""}`} onClick={() => setActiveTab("admin")}>
              Админ
            </button>
          )}
        </div>

        <div className="tab-content">
          {activeTab === "chat" && (
            <div className="chat-messages">
              {messages.map((chat) => (
                <div key={chat.id} className="chat-message">
                  <p>
                    <span>{chat.username}:</span> {chat.message}
                  </p>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
          {activeTab === "emoji" && (
            <div className="emoji-grid">
              {emojis.map((emoji, index) => (
                <span key={index} className="emoji-item" onClick={() => handleEmojiClick(emoji)}>
                  {emoji}
                </span>
              ))}
            </div>
          )}
          {activeTab === "admin" && isAdmin && (
            <div className="admin-cards">
              {destinedCommunityCards?.map((card, index) => (
                <div key={index} className="admin-card">
                  <PokerCard info={card} />
                </div>
              ))}
            </div>
          )}
        </div>

        {!isAdmin && chatLevelInfo && (
          <div className="chat-level-badge">
            Lv.{chatLevelInfo.level} {chatLevelInfo.name}
          </div>
        )}
        <div className="chat-input-row">
          {canChat ? (
            <div className="chat-input-wrapper">
              <input
                className="chat-input"
                placeholder="Таны сэтгэгдэл..."
                value={inputValue}
                maxLength={CHAT_MAX_LENGTH}
                onChange={(e) => setInputValue(Array.from(e.target.value).slice(0, CHAT_MAX_LENGTH).join(""))}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              />
              <button className="send-button" onClick={handleSendMessage}>
                <IoSend size={14} />
              </button>
            </div>
          ) : (
            <div className="chat-locked">🔒 100,000 CGP-тэй болсны дараа чатлах боломжтой (Lv.1 Soldier)</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PokerChat;
export type { Chat };
