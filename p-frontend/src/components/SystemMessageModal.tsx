import { useContext } from "react";
import { GlobalWebSocketContext } from "../providers/GlobalWebSocketProvider";

export default function SystemMessageModal() {
  const { systemMessage, clearSystemMessage } = useContext(GlobalWebSocketContext);

  if (!systemMessage) return null;

  return (
    <div className="system-modal-overlay" onClick={clearSystemMessage}>
      <div className="system-modal" onClick={(e) => e.stopPropagation()}>
        <div className="system-modal-header">
          <span className="system-modal-title">Системийн мэдэгдэл</span>
        </div>
        <div className="system-modal-body">
          <p>{systemMessage}</p>
        </div>
        <button className="system-modal-close-btn" onClick={clearSystemMessage}>
          Хаах
        </button>
      </div>
    </div>
  );
}
