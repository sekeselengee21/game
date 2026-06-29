import { useRef } from "react";
import { useNavigate } from "react-router";
import { useMyTables } from "../providers/MyTablesProvider";
import { useIsMobile } from "../hooks/useIsMobile";

interface Props {
  currentSecureId: string;
}

export default function TopTableSwitcher({ currentSecureId }: Props) {
  const { myTables, openSheet } = useMyTables();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const listRef = useRef<HTMLDivElement>(null);

  if (!isMobile) return null;

  const currentIdx = myTables.findIndex((t) => t.secureId === currentSecureId);

  return (
    <div className="tts-bar">
      <div ref={listRef} className="tts-tabs">
        {myTables.map((table) => {
          const isActive = table.secureId === currentSecureId;
          return (
            <button
              key={table.secureId}
              className={`tts-tab ${isActive ? "tts-tab--active" : ""}`}
              onClick={() => {
                if (!isActive)
                  navigate(`/table/${table.secureId}`, { state: { table } });
              }}
            >
            </button>
          );
        })}
      </div>

      {myTables.length > 3 && (
        <button className="tts-more-btn" onClick={openSheet}>
          {currentIdx + 1}/{myTables.length}
        </button>
      )}

      <button className="tts-add-btn" onClick={() => navigate("/")}>
        +
      </button>
    </div>
  );
}
