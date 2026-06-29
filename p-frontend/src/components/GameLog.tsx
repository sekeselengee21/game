import { useState } from "react";

export type GameLogEntry = {
  id: string | number;
  message: string;
};

interface GameLogProps {
  events: GameLogEntry[];
}

export default function GameLog({ events }: GameLogProps) {
  const [visible, setVisible] = useState(false);

  const toggleLog = () => setVisible((prev) => !prev);

  return (
    <div className="game-log-container">
      <button className="game-log-toggle" onClick={toggleLog}>
        {visible ? "▼ Hide History" : "▲ Show History"}
      </button>

      {visible && (
        <div className="game-log">
          {events.map((entry) => (
            <div key={entry.id} className="log-entry">
              {entry.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
