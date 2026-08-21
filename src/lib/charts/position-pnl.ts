export function positionPnl(
  markPrice: number | null | undefined,
  averagePrice: number,
  quantity: number,
  fallback = 0,
) {
  if (
    markPrice == null ||
    !Number.isFinite(markPrice) ||
    !Number.isFinite(averagePrice) ||
    !Number.isFinite(quantity)
  ) {
    return fallback;
  }

  return (markPrice - averagePrice) * quantity;
}
