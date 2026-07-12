/* eslint-disable react-refresh/only-export-components -- app entrypoint bootstraps RootWrapper/App inline; the only-export-components rule affects dev-time Fast Refresh only, not the build. */
import { StrictMode, useEffect, useState, useContext, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "./app/store";
import { GlobalWebSocketProvider, GlobalWebSocketContext } from "./providers/GlobalWebSocketProvider";
import { DesktopSettingsProvider } from "./components/context/DesktopSettingsContext";

import HomePageLoading from "./components/HomePageLoading";
import { useFetchTablesQuery } from "./api/user";
import "./styles/global.css";
import "./styles/layout.css";
import "./styles/components.css";
import "./styles/game.css";
import "./styles/admin.css";

const App = lazy(() => import("./app/app"));

function RootWrapper() {
  const { ws, userInfo } = useContext(GlobalWebSocketContext);
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showLoading, setShowLoading] = useState(true);

  const {
    data: tableData = [],
    isError: isTablesError,
    isFetching,
  } = useFetchTablesQuery();

  useEffect(() => {
    const interval = setInterval(() => {
      if (ready) {
        setProgress((prev) => Math.min(prev + 5, 100));
      } else if (ws && userInfo?.userId) {
        setProgress((prev) => Math.min(prev + 2, 95));
      }
    }, 40);
    return () => clearInterval(interval);
  }, [ready, ws, userInfo]);

  useEffect(() => {
    const hasUser = !!userInfo?.userId;
    const tablesSettled = (!isFetching && Array.isArray(tableData)) || isTablesError;
    const isWsOpen = ws?.readyState === WebSocket.OPEN;

    if (!hasUser) {
      if (tablesSettled) setReady(true);
    } else {
      if (tablesSettled && isWsOpen) setReady(true);
      else if (!isWsOpen) {
        const handleOpen = () => {
          if (tablesSettled) setReady(true);
        };
        ws?.addEventListener("open", handleOpen);
        return () => ws?.removeEventListener("open", handleOpen);
      }
    }
  }, [ws, userInfo, isFetching, tableData, isTablesError]);

  useEffect(() => {
    if (progress >= 100) {
      const timer = setTimeout(() => setShowLoading(false), 300);
      return () => clearTimeout(timer);
    }
  }, [progress]);

  if (showLoading) return <HomePageLoading progress={progress} />;

  return (
    <Suspense fallback={<HomePageLoading progress={progress} />}>
      <App initialTables={tableData} />
    </Suspense>
  );
}

function Root() {
  return (
    <Provider store={store}>
      <GlobalWebSocketProvider>
        <DesktopSettingsProvider>
          <RootWrapper />
        </DesktopSettingsProvider>
      </GlobalWebSocketProvider>
    </Provider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
