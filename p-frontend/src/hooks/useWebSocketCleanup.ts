import { useEffect, useRef } from 'react';

/**
 * Custom hook to ensure WebSocket connections are properly cleaned up
 * Prevents memory leaks from orphaned connections
 */
export function useWebSocketCleanup(ws: WebSocket | null) {
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    cleanupRef.current = () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };

    return () => {
      cleanupRef.current?.();
    };
  }, [ws]);
}

/**
 * Custom hook to manage timeouts with automatic cleanup
 * Prevents memory leaks from orphaned timeouts
 */
export function useTimeout(callback: () => void, delay: number | null) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;

    timeoutRef.current = setTimeout(() => savedCallback.current(), delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [delay]);

  const clear = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  return clear;
}
