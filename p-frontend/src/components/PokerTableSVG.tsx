import React from "react";

const PokerTable = () => {
  return (
    <div className="poker-table-wrapper">
      <div className="poker-table" />
      <div className="felt-color" />
      <div className="felt-shadow" />
      <div className="--detail-in-table">
        <div className="--logo-in-table"></div>
      </div>
    </div>
  );
};

export default React.memo(PokerTable);
