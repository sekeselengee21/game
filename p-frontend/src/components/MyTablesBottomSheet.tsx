import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useMyTables } from "../providers/MyTablesProvider";
import type { GameTable } from "../api/admin";

interface Props {
  currentSecureId?: string;
}

export default function MyTablesBottomSheet({ currentSecureId }: Props) {
  const { myTables, isOpen, closeSheet, removeTable } = useMyTables();
  const navigate = useNavigate();
  const [rendered, setRendered] = useState(false);
  const [visible, setVisible] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Mount → animate in; close → animate out → unmount
  useEffect(() => {
    if (isOpen) {
      setRendered(true);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => setVisible(true)),
      );
    } else {
      setVisible(false);
      const t = setTimeout(() => setRendered(false), 320);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  if (!rendered) return null;

  const goToTable = (secureId: string, table: GameTable) => {
    if (secureId === currentSecureId) {
      closeSheet();
      return;
    }
    navigate(`/table/${secureId}`, { state: { table } });
    closeSheet();
  };

  return (
    <div
      className={`mts-overlay ${visible ? "mts-overlay--open" : ""}`}
      onClick={closeSheet}
    >
      <div
        ref={sheetRef}
        className={`mts-sheet ${visible ? "mts-sheet--up" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="mts-handle" />

        <div className="mts-header">
          <span className="mts-title">Миний ширээнүүд</span>
          <button className="mts-close-btn" onClick={closeSheet}>
            ✕
          </button>
        </div>

        {myTables.length === 0 ? (
          <div className="mts-empty">Нэвтэрсэн ширээ байхгүй</div>
        ) : (
          <div className="mts-list">
            {myTables.map((table) => {
              const isCurrent = table.secureId === currentSecureId;
              return (
                <div
                  key={table.secureId}
                  className={`mts-item ${isCurrent ? "mts-item--active" : ""}`}
                  onClick={() => goToTable(table.secureId, table)}
                >
                  <div className="mts-item-dot" />
                  <div className="mts-item-info">
                    <span className="mts-item-name">{table.tableName}</span>
                    <span className="mts-item-meta">
                      {table.smallBlind}/{table.bigBlind} ·{" "}
                      {table.activePlayers ?? 0} тоглогч
                    </span>
                  </div>
                  {isCurrent && (
                    <span className="mts-item-current-label">Одоо</span>
                  )}
                  <button
                    className="mts-item-remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTable(table.secureId);
                    }}
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
