export function stackToBB(amount: number, bigBlind: number, decimals = 2): number {
  if (!bigBlind || bigBlind <= 0) return amount;
  return parseFloat((amount / bigBlind).toFixed(decimals));
}

export function formatStack(amount: number, showAsBB = false, bigBlind = 1, decimals = 2): string {
  const displayAmount = showAsBB ? stackToBB(amount, bigBlind, decimals) : amount;
  if (displayAmount >= 1_000_000) return (displayAmount / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (displayAmount >= 1_000) return (displayAmount / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return displayAmount.toString();
}
