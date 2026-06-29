import React, { memo, useContext, useEffect, useState, useRef } from "react";
import { GlobalWebSocketContext } from "../providers/GlobalWebSocketProvider";

const JackpotText: React.FC = () => {
  const { jackpotAmount } = useContext(GlobalWebSocketContext);
  const [currentDigits, setCurrentDigits] = useState<(number | string)[]>([]);
  const prevDigitsRef = useRef<(number | string)[]>([]);

  useEffect(() => {
    const formatted = jackpotAmount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const newDigits: (number | string)[] = formatted.split("").map((char) => {
      return char === "," || char === "." ? char : Number(char);
    });

    const maxLength = Math.max(prevDigitsRef.current.length, newDigits.length);
    const paddedNew = [...Array(maxLength - newDigits.length).fill(0), ...newDigits];

    setCurrentDigits(paddedNew);
    prevDigitsRef.current = paddedNew;
  }, [jackpotAmount]);

  return (
    <div className="jackpot-container">
      {currentDigits.map((digit, index) => {
        if (digit === "," || digit === ".") {
          return (
            <div key={index} className="digit" style={{ width: "0.4ch", textAlign: "center" }}>
              {digit}
            </div>
          );
        }

        const topIndex = digit as number;

        return (
          <div key={index} className="digit-wrapper" style={{ width: "1ch", overflow: "hidden" }}>
            <div
              className="digit-column"
              style={{
                transform: `translateY(-${topIndex * 2}rem)`,
                transition: "transform 0.5s ease-in-out",
              }}
            >
              {Array.from({ length: 10 }, (_, i) => (
                <div key={i} className="digit" style={{ height: "2rem", lineHeight: "2rem", textAlign: "center" }}>
                  {i}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default memo(JackpotText);
