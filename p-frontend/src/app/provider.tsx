/* eslint-disable react-refresh/only-export-components -- this composition root exports TableDataContext alongside AppProvider; the only-export-components rule affects dev-time Fast Refresh only, not the build. */
import { Provider } from "react-redux";
import { store } from "./store";
import { createContext, useState } from "react";
import type { ReactNode } from "react";
import type { GameTable } from "../api/admin";
import { MyTablesProvider } from "../providers/MyTablesProvider";

export const TableDataContext = createContext<GameTable[] | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
  initialTables?: GameTable[];
}

function AppProvider({ children, initialTables }: AppProviderProps) {
  const [tables] = useState<GameTable[] | undefined>(initialTables);

  return (
    <Provider store={store}>
      <TableDataContext.Provider value={tables}>
        <MyTablesProvider>{children}</MyTablesProvider>
      </TableDataContext.Provider>
    </Provider>
  );
}

export default AppProvider;
