import { logger } from "../utils/logger";
import { createContext, useEffect, useRef, useCallback, useState } from "react";
import { useSelector } from "react-redux";
import { store } from "../app/store";
import { setUserBalance } from "../providers/auth-slice";
import { useMeQuery, userApi } from "../api/user";
import { adminApi } from "../api/admin";

const backendURL = import.meta.env.VITE_BACKEND_URL.replace(/\/api\/?$/, "");
const websocketURL = backendURL.replace(/^http/, "ws") + "/ws/global";

const jackpotAPIURL = backendURL + "/api/v1/jackpot/current";

interface GlobalWSContextType {
  ws: WebSocket | null;
  jackpotAmount: number;
  userInfo?: {
    userId: number;
    username: string;
    isAdmin?: boolean;
    balance?: number;
    role: string;
    avatar?: string;
  } | null;
  chatMessages: {
    id: number;
    username: string;
    message: string;
    createdAt: string;
  }[];
  sendChatMessage?: (text: string) => boolean;
  clearChatMessages: () => void;

  adminNotifications: number;
  resetAdminNotifications: () => void;

  unreadChatCount: number;
  resetUnreadChatCount: () => void;

  systemMessage: string | null;
  clearSystemMessage: () => void;
}

export const GlobalWebSocketContext = createContext<GlobalWSContextType>({
  ws: null,
  jackpotAmount: 0,
  chatMessages: [],
  clearChatMessages: () => {},
  adminNotifications: 0,
  resetAdminNotifications: () => {},
  unreadChatCount: 0,
  resetUnreadChatCount: () => {},
  systemMessage: null,
  clearSystemMessage: () => {},
});

export function GlobalWebSocketProvider({ children }: { children: React.ReactNode }) {
  const ws = useRef<WebSocket | null>(null);
  const [wsState, setWsState] = useState<WebSocket | null>(null);
  const [jackpotAmount, setJackpotAmount] = useState<number>(0);
  const [chatMessages, setChatMessages] = useState<{ id: number; username: string; message: string; createdAt: string }[]>([]);

  const [adminNotifications, setAdminNotifications] = useState(0);
  const [systemMessage, setSystemMessage] = useState<string | null>(null);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  // Prevents counting history messages (sent right after AUTH) as unread
  const historyLoadedRef = useRef(false);
  const resetUnreadChatCount = useCallback(() => setUnreadChatCount(0), []);
  const clearChatMessages = useCallback(() => setChatMessages([]), []);

  const clearSystemMessage = useCallback(() => setSystemMessage(null), []);

  const reconnectDelay = 2000;
  const maxReconnectAttempts = 5;
  const reconnectAttempts = useRef(0);

  // Subscribe to Redux auth state so this provider re-renders after login and
  // picks up the fresh token from localStorage (value is not used directly).
  useSelector((state: any) => state.auth.isAuthenticated);
  const token = localStorage.getItem("accessToken");
  const { data: userInfo } = useMeQuery(undefined, { skip: !token });
  const userRef = useRef(userInfo);
  userRef.current = userInfo;

  // Clear stale messages when a different user logs in
  const prevUserIdRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    const uid = userInfo?.userId;
    if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== uid) {
      setChatMessages([]);
    }
    prevUserIdRef.current = uid;
  }, [userInfo?.userId]);

  // ----------------- Reset admin notifications -----------------
  const resetAdminNotifications = useCallback(() => {
    setAdminNotifications(0);
  }, []);

  // ----------------- Fetch initial jackpot -----------------
  useEffect(() => {
    async function fetchInitialJackpot() {
      try {
        const res = await fetch(jackpotAPIURL);
        if (!res.ok) throw new Error("Failed to fetch jackpot");
        const data = await res.json();
        setJackpotAmount(data.amount ?? 0);
      } catch (err) {
        logger.error("Failed to fetch initial jackpot:", err);
      }
    }
    fetchInitialJackpot();
  }, []);

  // ----------------- WebSocket connection -----------------
  const establishWebSocketConnection = useCallback((delay = 0) => {
    if (!userRef.current?.userId) return;
    if (ws.current && (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING)) return;

    setTimeout(() => {
      const socket = new WebSocket(websocketURL);
      ws.current = socket;
      setWsState(socket);

      socket.onopen = () => {
        reconnectAttempts.current = 0;
        const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
        if (token) {
          socket.send(JSON.stringify({ type: "AUTH", token }));
        }
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          // ----------------- Balance update -----------------
          if (message.type === "BALANCE_UPDATE" && message.data?.balance != null) {
            if (message.data.userId === userRef.current?.userId) {
              store.dispatch(setUserBalance(message.data.balance));
              // Also refresh useMeQuery so any component reading userInfo.userBalance
              // (e.g. the cashier modal) reflects the new balance without a page refresh.
              store.dispatch(userApi.util.invalidateTags(["Me"]));
            }
          }

          // ----------------- Jackpot update -----------------
          if (message.type === "GAME" && message.action === "JACKPOT_UPDATE") {
            setJackpotAmount(message.amount ?? 0);
          }

          // ----------------- Auth success: allow 2 s for history batch then count live msgs -----------------
          if (message.type === "AUTH_SUCCESS") {
            historyLoadedRef.current = false;
            setTimeout(() => { historyLoadedRef.current = true; }, 2000);
          }

          // ----------------- Chat messages -----------------
          if (message.type === "CHAT_MESSAGE" && message.data) {
            setChatMessages((prev) => [
              ...prev,
              {
                id: message.data.id,
                username: message.data.username,
                message: message.data.message,
                createdAt: message.data.createdAt,
              },
            ]);
            if (historyLoadedRef.current) {
              setUnreadChatCount((prev) => prev + 1);
            }
          }

          // ----------------- Admin deposit/withdrawal notifications -----------------
          if (
            message.type === "ADMIN_DEPOSIT_NOTIFICATION" ||
            message.type === "ADMIN_WITHDRAWAL_NOTIFICATION"
          ) {
            if (userRef.current?.role === "ADMIN") {
              setAdminNotifications((prev) => prev + 1);
              store.dispatch(adminApi.util.invalidateTags(["deposits", "withdrawals"]));
            }
          }

          // ----------------- Deposit approved (player side) -----------------
          if (message.type === "DEPOSIT_APPROVED") {
            store.dispatch(userApi.util.invalidateTags(["DepositList", "Me"]));
            store.dispatch(adminApi.util.invalidateTags(["deposits"]));
          }

          // ----------------- User deposit status update (legacy / deny) -----------------
          if (message.type === "DEPOSIT_STATUS_UPDATE") {
            store.dispatch(adminApi.util.invalidateTags(["deposits", "withdrawals"]));
            store.dispatch(userApi.util.invalidateTags(["DepositList", "Me"]));
          }

          // ----------------- System message (admin broadcast) -----------------
          if (message.type === "SYSTEM_MESSAGE" && message.data?.message) {
            setSystemMessage(message.data.message);
          }
        } catch (error) {
          logger.error("❌ Failed to parse WebSocket message", error);
        }
      };

      socket.onclose = () => {
        ws.current = null;
        setWsState(null);

        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          const nextDelay = reconnectDelay * reconnectAttempts.current;
          setTimeout(() => establishWebSocketConnection(nextDelay), nextDelay);
        } else {
          logger.warn("⚠️ Max reconnection attempts reached.");
        }
      };
    }, delay);
  }, []);

  // ----------------- Send chat message -----------------
  const sendChatMessage = useCallback((text: string): boolean => {
    if (!userRef.current || ws.current?.readyState !== WebSocket.OPEN) return false;

    ws.current.send(
      JSON.stringify({
        type: "CHAT_MESSAGE",
        data: {
          username: userRef.current.username,
          message: text,
        },
      }),
    );
    return true;
  }, []);

  // ----------------- Initialize WebSocket -----------------
  useEffect(() => {
    if (userInfo?.userId) {
      establishWebSocketConnection(0);
    }

    return () => {
      // Graceful cleanup to handle React Strict Mode
      if (ws.current) {
        const currentState = ws.current.readyState;
        const socketToClose = ws.current;
        ws.current = null;
        setWsState(null);

        try {
          if (currentState === WebSocket.CONNECTING) {
            // Wait for connection to establish or fail naturally
            setTimeout(() => {
              if (socketToClose.readyState === WebSocket.OPEN) {
                socketToClose.close(1000, "Component unmounting");
              }
            }, 10);
          } else if (currentState === WebSocket.OPEN) {
            socketToClose.close(1000, "Component unmounting");
          }
        } catch (error) {
          logger.error("Error closing global WebSocket:", error);
        }
      }
    };
  }, [userInfo, establishWebSocketConnection]);

  return (
    <GlobalWebSocketContext.Provider
      value={{
        ws: wsState,
        jackpotAmount,
        userInfo,
        chatMessages,
        sendChatMessage,
        clearChatMessages,
        adminNotifications,
        resetAdminNotifications,
        unreadChatCount,
        resetUnreadChatCount,
        systemMessage,
        clearSystemMessage,
      }}
    >
      {children}
    </GlobalWebSocketContext.Provider>
  );
}
