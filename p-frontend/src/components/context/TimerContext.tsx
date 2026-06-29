import React, { createContext, useContext, useState, useEffect, useRef } from "react";

const TimerContext = createContext<number>(Date.now());

export const TimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [now, setNow] = useState(Date.now());
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    let lastUpdate = Date.now();

    const update = () => {
      const currentTime = Date.now();
      // Only update every second to reduce re-renders
      if (currentTime - lastUpdate >= 1000) {
        setNow(currentTime);
        lastUpdate = currentTime;
      }
      rafRef.current = requestAnimationFrame(update);
    };

    rafRef.current = requestAnimationFrame(update);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return <TimerContext.Provider value={now}>{children}</TimerContext.Provider>;
};

export const useTimer = () => useContext(TimerContext);
