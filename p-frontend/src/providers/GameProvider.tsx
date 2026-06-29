import { createContext, useContext } from "react";
import { useTexasTable } from "../hooks/useTexasTable";

const GameContext = createContext<ReturnType<typeof useTexasTable> | null>(null);

export const GameProvider = ({ tableId, children }: { tableId: string; children: React.ReactNode }) => {
  const game = useTexasTable(tableId);
  return <GameContext.Provider value={game}>{children}</GameContext.Provider>;
};

export const useGame = () => {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
};
