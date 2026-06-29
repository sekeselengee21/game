import React, { memo, useContext, useEffect, useState } from "react";
import { GlobalWebSocketContext } from "../providers/GlobalWebSocketProvider";

const HomepageJackpot: React.FC = () => {
  const { jackpotAmount } = useContext(GlobalWebSocketContext);
  const [currentDigits, setCurrentDigits] = useState<string[]>([]);

  useEffect(() => {
    const newDigits = Math.floor(jackpotAmount).toString().split("");
    setCurrentDigits(newDigits);
  }, [jackpotAmount]);

  return (
    <div className="homepage-jackpot-wrapper">
      <div className="homepage-jackpot-label">
        <span>BAD</span>
        <span>BEAT</span>
      </div>
      <div className="homepage-jackpot-container">
        {currentDigits.map((digit, index) => {
          const topIndex = parseInt(digit, 10);
          const offset = -topIndex * 3;

          return (
            <div key={index} className="homepage-digit-wrapper">
              <div
                className="homepage-digit-column"
                style={{
                  top: `${offset}rem`,
                  transition: "top 0.5s ease-in-out",
                }}
              >
                {Array.from({ length: 10 }, (_, i) => (
                  <div key={i} className="homepage-digit">
                    {i}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default memo(HomepageJackpot);
