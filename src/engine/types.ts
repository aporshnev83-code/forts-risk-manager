export type Instrument = 'IMOEXF' | 'MIX' | 'MXI'
export type TradeSide = 'BUY' | 'SELL'

export interface Trade {
  id: string
  date: string
  side: TradeSide
  price: number
  qty: number
}

export interface EngineInput {
  priceStep: number
  tickValueRub: number
  ticksInPoint: number
  goPerContract: number
  markPrice: number
}

export interface FifoMetrics {
  netPosition: number
  openAvgPrice: number
  realizedPnl: number
  unrealizedPnl: number
  totalPnl: number
  marginRequired: number
}
