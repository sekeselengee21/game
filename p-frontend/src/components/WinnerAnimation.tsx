function WinnerAnimation({ winningAmount, formatStack }: { winningAmount: number; formatStack: (num: number) => string }) {
  return (
    <div className="winner-container">
      <div className="winner-plus winner-plus-animate">+ {formatStack(winningAmount)}</div>
    </div>
  );
}

export default WinnerAnimation;
