import { useEffect, useMemo, useState } from 'react'
import { calculateFifoMetrics, type Instrument, type Trade, type TradeSide } from './engine'
import './styles.css'

const INSTRUMENTS: Instrument[] = ['IMOEXF', 'MIX', 'MXI']

const DEFAULTS: Record<Instrument, { priceStep: number; tickValueRub: number; ticksInPoint: number; goPerContract: number; priceMin: number; priceMax: number; markPrice: number }> = {
  IMOEXF: {
    priceStep: 10,
    tickValueRub: 9.6,
    ticksInPoint: 10,
    goPerContract: 25500,
    priceMin: 280000,
    priceMax: 340000,
    markPrice: 312000,
  },
  MIX: {
    priceStep: 5,
    tickValueRub: 4.8,
    ticksInPoint: 20,
    goPerContract: 13200,
    priceMin: 2700,
    priceMax: 3400,
    markPrice: 3050,
  },
  MXI: {
    priceStep: 1,
    tickValueRub: 1,
    ticksInPoint: 10,
    goPerContract: 12500,
    priceMin: 2600,
    priceMax: 3500,
    markPrice: 3000,
  },
}

const formatRub = (value: number) =>
  new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 2,
  }).format(value)

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const createEmptyTrade = (): Trade => ({
  id: crypto.randomUUID(),
  date: new Date().toISOString().slice(0, 10),
  side: 'BUY',
  price: 0,
  qty: 1,
})

function App() {
  const [instrument, setInstrument] = useState<Instrument>('IMOEXF')
  const [priceStep, setPriceStep] = useState(DEFAULTS.IMOEXF.priceStep)
  const [tickValueRub, setTickValueRub] = useState(DEFAULTS.IMOEXF.tickValueRub)
  const [ticksInPoint, setTicksInPoint] = useState(DEFAULTS.IMOEXF.ticksInPoint)
  const [goPerContract, setGoPerContract] = useState(DEFAULTS.IMOEXF.goPerContract)
  const [priceMin, setPriceMin] = useState(DEFAULTS.IMOEXF.priceMin)
  const [priceMax, setPriceMax] = useState(DEFAULTS.IMOEXF.priceMax)
  const [markPrice, setMarkPrice] = useState(DEFAULTS.IMOEXF.markPrice)
  const [dateFrom, setDateFrom] = useState('2026-01-01')
  const [dateTo, setDateTo] = useState('2026-12-31')

  const [trades, setTrades] = useState<Trade[]>([
    {
      id: crypto.randomUUID(),
      date: '2026-01-15',
      side: 'BUY',
      price: DEFAULTS.IMOEXF.markPrice - DEFAULTS.IMOEXF.priceStep * 100,
      qty: 3,
    },
    {
      id: crypto.randomUUID(),
      date: '2026-01-22',
      side: 'SELL',
      price: DEFAULTS.IMOEXF.markPrice + DEFAULTS.IMOEXF.priceStep * 40,
      qty: 1,
    },
  ])

  useEffect(() => {
    const preset = DEFAULTS[instrument]
    setPriceStep(preset.priceStep)
    setTickValueRub(preset.tickValueRub)
    setTicksInPoint(preset.ticksInPoint)
    setGoPerContract(preset.goPerContract)
    setPriceMin(preset.priceMin)
    setPriceMax(preset.priceMax)
    setMarkPrice(preset.markPrice)
  }, [instrument])

  const safeMin = Math.min(priceMin, priceMax)
  const safeMax = Math.max(priceMin, priceMax)

  useEffect(() => {
    setMarkPrice((current) => clamp(current, safeMin, safeMax))
  }, [safeMin, safeMax])

  const normalizedTrades = useMemo(
    () =>
      trades
        .filter((trade) => trade.qty > 0)
        .map((trade) => ({
          ...trade,
          price: Number.isFinite(trade.price) ? trade.price : 0,
          qty: Number.isFinite(trade.qty) ? trade.qty : 0,
        })),
    [trades],
  )

  const metrics = useMemo(
    () =>
      calculateFifoMetrics(
        {
          priceStep,
          tickValueRub,
          ticksInPoint,
          goPerContract,
          markPrice,
        },
        normalizedTrades,
      ),
    [goPerContract, markPrice, normalizedTrades, priceStep, tickValueRub, ticksInPoint],
  )

  const tickValuePerPoint = tickValueRub * ticksInPoint

  const priceSeries = useMemo(() => {
    const points = 72
    const range = Math.max(1, safeMax - safeMin)
    const base = safeMin + range * 0.54

    return Array.from({ length: points }, (_, index) => {
      const t = index / (points - 1)
      const waveA = Math.sin(t * Math.PI * 2.6) * range * 0.14
      const waveB = Math.cos(t * Math.PI * 7.1) * range * 0.05
      const trend = (t - 0.5) * range * 0.22
      const value = clamp(base + waveA + waveB + trend, safeMin, safeMax)
      return { x: t, value }
    })
  }, [safeMax, safeMin])

  const chartConfig = {
    width: 860,
    height: 340,
    left: 74,
    right: 42,
    top: 22,
    bottom: 46,
  }

  const chartWidth = chartConfig.width - chartConfig.left - chartConfig.right
  const chartHeight = chartConfig.height - chartConfig.top - chartConfig.bottom

  const mapY = (price: number) => {
    if (safeMax === safeMin) {
      return chartConfig.top + chartHeight / 2
    }

    return chartConfig.top + ((safeMax - price) / (safeMax - safeMin)) * chartHeight
  }

  const polyline = priceSeries
    .map((point) => {
      const x = chartConfig.left + point.x * chartWidth
      const y = mapY(point.value)
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')

  const markLineY = mapY(markPrice)

  const updateTrade = <K extends keyof Trade>(id: string, key: K, value: Trade[K]) => {
    setTrades((current) =>
      current.map((trade) => (trade.id === id ? { ...trade, [key]: value } : trade)),
    )
  }

  const addTrade = () => setTrades((current) => [...current, createEmptyTrade()])
  const removeTrade = (id: string) => setTrades((current) => current.filter((trade) => trade.id !== id))

  return (
    <main className="app-shell">
      <header className="app-header">
        <h1>Risk Calculator</h1>
        <p>FORTS FIFO калькулятор риска и результата</p>
      </header>

      <section className="panel grid-controls">
        <label>
          Инструмент
          <select value={instrument} onChange={(event) => setInstrument(event.target.value as Instrument)}>
            {INSTRUMENTS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label>
          Шаг цены
          <input
            type="number"
            value={priceStep}
            min={0.0001}
            step="any"
            onChange={(event) => setPriceStep(Number(event.target.value) || 0)}
          />
        </label>

        <label>
          Стоимость тика (руб)
          <input
            type="number"
            value={tickValueRub}
            min={0}
            step="any"
            onChange={(event) => setTickValueRub(Number(event.target.value) || 0)}
          />
        </label>

        <label>
          Тиков в пункте
          <input
            type="number"
            value={ticksInPoint}
            min={1}
            step={1}
            onChange={(event) => setTicksInPoint(Number(event.target.value) || 1)}
          />
        </label>

        <label>
          ГО на контракт
          <input
            type="number"
            value={goPerContract}
            min={0}
            step="any"
            onChange={(event) => setGoPerContract(Number(event.target.value) || 0)}
          />
        </label>

        <label>
          priceMin
          <input
            type="number"
            value={priceMin}
            step="any"
            onChange={(event) => setPriceMin(Number(event.target.value) || 0)}
          />
        </label>

        <label>
          priceMax
          <input
            type="number"
            value={priceMax}
            step="any"
            onChange={(event) => setPriceMax(Number(event.target.value) || 0)}
          />
        </label>

        <label>
          Дата слева
          <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
        </label>

        <label>
          Дата справа
          <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
        </label>
      </section>

      <section className="panel trades-panel">
        <div className="trades-title">
          <h2>Список сделок</h2>
          <button type="button" onClick={addTrade}>
            +
          </button>
        </div>

        <div className="trades-list">
          {trades.map((trade, index) => (
            <div className="trade-row" key={trade.id}>
              <span className="trade-index">#{index + 1}</span>
              <input
                type="date"
                value={trade.date}
                onChange={(event) => updateTrade(trade.id, 'date', event.target.value)}
              />

              <select
                value={trade.side}
                onChange={(event) => updateTrade(trade.id, 'side', event.target.value as TradeSide)}
              >
                <option value="BUY">BUY</option>
                <option value="SELL">SELL</option>
              </select>

              <input
                type="number"
                value={trade.price}
                step="any"
                placeholder="Цена"
                onChange={(event) => updateTrade(trade.id, 'price', Number(event.target.value) || 0)}
              />

              <input
                type="number"
                value={trade.qty}
                min={1}
                step={1}
                placeholder="Контракты"
                onChange={(event) => updateTrade(trade.id, 'qty', Math.max(1, Number(event.target.value) || 1))}
              />

              <button type="button" onClick={() => removeTrade(trade.id)}>
                -
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="panel chart-panel">
        <div className="chart-wrap">
          <svg viewBox={`0 0 ${chartConfig.width} ${chartConfig.height}`} role="img" aria-label="Price simulation chart">
            <line
              x1={chartConfig.left}
              y1={chartConfig.top}
              x2={chartConfig.left}
              y2={chartConfig.height - chartConfig.bottom}
              className="axis"
            />
            <line
              x1={chartConfig.left}
              y1={chartConfig.height - chartConfig.bottom}
              x2={chartConfig.width - chartConfig.right}
              y2={chartConfig.height - chartConfig.bottom}
              className="axis"
            />

            <polyline points={polyline} className="curve" />

            <line
              x1={chartConfig.left}
              y1={markLineY}
              x2={chartConfig.width - chartConfig.right}
              y2={markLineY}
              className="mark-line"
            />

            <text x={chartConfig.left - 12} y={chartConfig.top + 4} className="chart-label" textAnchor="end">
              {safeMax.toFixed(0)}
            </text>
            <text
              x={chartConfig.left - 12}
              y={chartConfig.height - chartConfig.bottom + 4}
              className="chart-label"
              textAnchor="end"
            >
              {safeMin.toFixed(0)}
            </text>

            <text x={chartConfig.left} y={chartConfig.height - 12} className="chart-label" textAnchor="start">
              {dateFrom}
            </text>
            <text
              x={chartConfig.width - chartConfig.right}
              y={chartConfig.height - 12}
              className="chart-label"
              textAnchor="end"
            >
              {dateTo}
            </text>

            <text x={chartConfig.width - chartConfig.right - 8} y={markLineY - 8} className="chart-label" textAnchor="end">
              mark: {markPrice.toFixed(2)}
            </text>
          </svg>

          <div className="mark-slider-wrap">
            <input
              className="mark-slider"
              type="range"
              min={safeMin}
              max={safeMax}
              step={Math.max(priceStep, 0.0001)}
              value={markPrice}
              onChange={(event) => setMarkPrice(Number(event.target.value))}
            />
          </div>
        </div>
      </section>

      <section className="panel totals-panel">
        <h2>Общая позиция по FIFO и предполагаемый финансовый результат</h2>
        <div className="totals-grid">
          <div>
            <span>Net position</span>
            <strong>{metrics.netPosition}</strong>
          </div>
          <div>
            <span>Open avg price</span>
            <strong>{metrics.openAvgPrice.toFixed(2)}</strong>
          </div>
          <div>
            <span>Realized PnL</span>
            <strong>{formatRub(metrics.realizedPnl)}</strong>
          </div>
          <div>
            <span>Unrealized PnL</span>
            <strong>{formatRub(metrics.unrealizedPnl)}</strong>
          </div>
          <div>
            <span>Total PnL</span>
            <strong>{formatRub(metrics.totalPnl)}</strong>
          </div>
          <div>
            <span>Margin required</span>
            <strong>{formatRub(metrics.marginRequired)}</strong>
          </div>
          <div>
            <span>Tick value / point</span>
            <strong>{tickValuePerPoint.toFixed(2)} RUB</strong>
          </div>
          <div>
            <span>Mark price</span>
            <strong>{markPrice.toFixed(2)}</strong>
          </div>
        </div>
      </section>
    </main>
  )
}

export default App
