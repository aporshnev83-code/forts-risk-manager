import type { EngineInput, FifoMetrics, Trade } from './types'

interface Lot {
  price: number
  qty: number
}

const pnlFromPriceDiff = (
  priceDifference: number,
  priceStep: number,
  tickValueRub: number,
  qty: number,
): number => {
  if (priceStep <= 0 || tickValueRub <= 0 || qty <= 0) {
    return 0
  }

  const ticks = priceDifference / priceStep
  return ticks * tickValueRub * qty
}

const weightedAverage = (lots: Lot[]): number => {
  if (lots.length === 0) {
    return 0
  }

  const totalQty = lots.reduce((sum, lot) => sum + lot.qty, 0)
  if (totalQty === 0) {
    return 0
  }

  const weighted = lots.reduce((sum, lot) => sum + lot.price * lot.qty, 0)
  return weighted / totalQty
}

export const calculateFifoMetrics = (
  input: EngineInput,
  trades: Trade[],
): FifoMetrics => {
  const longLots: Lot[] = []
  const shortLots: Lot[] = []
  let realizedPnl = 0

  for (const trade of trades) {
    const tradeQty = Number.isFinite(trade.qty) ? Math.max(0, trade.qty) : 0
    const tradePrice = Number.isFinite(trade.price) ? trade.price : 0

    if (tradeQty <= 0) {
      continue
    }

    if (trade.side === 'BUY') {
      let qtyToProcess = tradeQty

      while (qtyToProcess > 0 && shortLots.length > 0) {
        const firstShort = shortLots[0]
        const closedQty = Math.min(qtyToProcess, firstShort.qty)
        const priceDifference = firstShort.price - tradePrice

        realizedPnl += pnlFromPriceDiff(
          priceDifference,
          input.priceStep,
          input.tickValueRub,
          closedQty,
        )

        firstShort.qty -= closedQty
        qtyToProcess -= closedQty

        if (firstShort.qty === 0) {
          shortLots.shift()
        }
      }

      if (qtyToProcess > 0) {
        longLots.push({ price: tradePrice, qty: qtyToProcess })
      }
    } else {
      let qtyToProcess = tradeQty

      while (qtyToProcess > 0 && longLots.length > 0) {
        const firstLong = longLots[0]
        const closedQty = Math.min(qtyToProcess, firstLong.qty)
        const priceDifference = tradePrice - firstLong.price

        realizedPnl += pnlFromPriceDiff(
          priceDifference,
          input.priceStep,
          input.tickValueRub,
          closedQty,
        )

        firstLong.qty -= closedQty
        qtyToProcess -= closedQty

        if (firstLong.qty === 0) {
          longLots.shift()
        }
      }

      if (qtyToProcess > 0) {
        shortLots.push({ price: tradePrice, qty: qtyToProcess })
      }
    }
  }

  const longQty = longLots.reduce((sum, lot) => sum + lot.qty, 0)
  const shortQty = shortLots.reduce((sum, lot) => sum + lot.qty, 0)
  const netPosition = longQty - shortQty

  const openAvgPrice =
    netPosition > 0
      ? weightedAverage(longLots)
      : netPosition < 0
        ? weightedAverage(shortLots)
        : 0

  let unrealizedPnl = 0
  if (netPosition > 0) {
    unrealizedPnl = pnlFromPriceDiff(
      input.markPrice - openAvgPrice,
      input.priceStep,
      input.tickValueRub,
      netPosition,
    )
  } else if (netPosition < 0) {
    unrealizedPnl = pnlFromPriceDiff(
      openAvgPrice - input.markPrice,
      input.priceStep,
      input.tickValueRub,
      Math.abs(netPosition),
    )
  }

  const totalPnl = realizedPnl + unrealizedPnl
  const marginRequired = Math.abs(netPosition) * Math.max(0, input.goPerContract)

  return {
    netPosition,
    openAvgPrice,
    realizedPnl,
    unrealizedPnl,
    totalPnl,
    marginRequired,
  }
}
