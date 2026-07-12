import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { GameTable } from "../api/admin";
import type { GameCard } from "../api/game";

const STORAGE_KEY = "myPokerTables";

function loadFromStorage(): GameTable[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToStorage(tables: GameTable[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tables));
  } catch {
    /* intentionally empty */
  }
}

interface MyTablesCtx {
  myTables: GameTable[];
  addTable: (table: GameTable) => void;
  removeTable: (secureId: string) => void;
  tableCards: Record<string, GameCard[]>;
  setTableCards: (secureId: string, cards: GameCard[]) => void;
  isOpen: boolean;
  openSheet: () => void;
  closeSheet: () => void;
}

const MyTablesContext = createContext<MyTablesCtx | null>(null);

export function MyTablesProvider({ children }: { children: ReactNode }) {
  const [myTables, setMyTables] = useState<GameTable[]>(loadFromStorage);
  const [tableCards, setTableCardsMap] = useState<Record<string, GameCard[]>>({});
  const [isOpen, setIsOpen] = useState(false);

  const addTable = useCallback((table: GameTable) => {
    setMyTables((prev) => {
      if (prev.some((t) => t.secureId === table.secureId)) return prev;
      const updated = [...prev, table];
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const removeTable = useCallback((secureId: string) => {
    setMyTables((prev) => {
      const updated = prev.filter((t) => t.secureId !== secureId);
      saveToStorage(updated);
      return updated;
    });
    setTableCardsMap((prev) => {
      const next = { ...prev };
      delete next[secureId];
      return next;
    });
  }, []);

  const setTableCards = useCallback((secureId: string, cards: GameCard[]) => {
    setTableCardsMap((prev) => ({ ...prev, [secureId]: cards }));
  }, []);

  const openSheet = useCallback(() => setIsOpen(true), []);
  const closeSheet = useCallback(() => setIsOpen(false), []);

  return (
    <MyTablesContext.Provider
      value={{ myTables, addTable, removeTable, tableCards, setTableCards, isOpen, openSheet, closeSheet }}
    >
      {children}
    </MyTablesContext.Provider>
  );
}

export function useMyTables() {
  const ctx = useContext(MyTablesContext);
  if (!ctx) throw new Error("useMyTables must be inside MyTablesProvider");
  return ctx;
}
