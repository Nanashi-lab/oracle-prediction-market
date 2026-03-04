import { useNavigate } from 'react-router-dom'
import { TrendingUp, TrendingDown, Zap, Clock } from 'lucide-react'
import { useAlphaPrice } from '@/hooks/useAlphaPrice'
import { PriceChart } from '@/components/PriceChart'
import { useState, useEffect, useRef } from 'react'

function formatRoundTime(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}

export function FeaturedMarketCard() {
  const navigate = useNavigate()
  const {
    currentPrice,
    targetPrice,
    roundNumber,
    roundRemaining,
    priceHistory,
    direction,
    deltaPercent,
    connected,
  } = useAlphaPrice()

  const [flashClass, setFlashClass] = useState('')
  const prevPriceRef = useRef(currentPrice)

  useEffect(() => {
    if (prevPriceRef.current !== 0 && currentPrice !== prevPriceRef.current) {
      setFlashClass(currentPrice > prevPriceRef.current ? 'price-flash-up' : 'price-flash-down')
      const timeout = setTimeout(() => setFlashClass(''), 400)
      prevPriceRef.current = currentPrice
      return () => clearTimeout(timeout)
    }
    prevPriceRef.current = currentPrice
  }, [currentPrice])

  const isUp = currentPrice >= targetPrice
  const roundTimeFormatted = formatRoundTime(roundRemaining)
  const isUrgent = roundRemaining < 30000

  return (
    <button
      onClick={() => navigate('/market/alpha')}
      className="featured-glow group relative w-full cursor-pointer overflow-hidden rounded-2xl border border-oracle-cyan/30 bg-oracle-surface p-6 text-left transition-all hover:border-oracle-cyan/60"
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-oracle-cyan/15 text-xl font-bold text-oracle-cyan">
            α
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-oracle-text">ALPHA / USD</h2>
              <Zap className="h-4 w-4 text-oracle-cyan" />
              <span className="rounded-full bg-oracle-cyan/15 px-2 py-0.5 text-xs font-medium text-oracle-cyan">
                FEATURED
              </span>
            </div>
            <span className="text-xs text-oracle-muted">
              Round #{roundNumber} {connected ? '• Live' : '• Connecting...'}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className={`flex items-center gap-1 font-mono text-sm ${isUrgent ? 'countdown-urgent' : 'text-oracle-muted'}`}>
            <Clock className="h-3.5 w-3.5" />
            {roundTimeFormatted}
          </div>
          <span className="rounded-full border border-oracle-green/30 bg-oracle-green/15 px-2 py-0.5 font-mono text-xs font-medium text-oracle-green">
            OPEN
          </span>
        </div>
      </div>

      {/* Prices row */}
      <div className="mb-4 grid grid-cols-3 gap-4">
        {/* Current Price */}
        <div className={`rounded-xl border border-oracle-border bg-oracle-bg/50 p-4 ${flashClass}`}>
          <span className="text-xs font-medium text-oracle-muted">Current Price</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-oracle-text">
              ${currentPrice.toFixed(2)}
            </span>
            <span className={`flex items-center gap-0.5 font-mono text-xs font-medium ${
              deltaPercent >= 0 ? 'text-oracle-green' : 'text-oracle-red'
            }`}>
              {deltaPercent >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {deltaPercent >= 0 ? '+' : ''}{deltaPercent.toFixed(3)}%
            </span>
          </div>
        </div>

        {/* Target Price */}
        <div className="rounded-xl border border-oracle-border bg-oracle-bg/50 p-4">
          <span className="text-xs font-medium text-oracle-muted">Target Price</span>
          <div className="mt-1">
            <span className="font-mono text-2xl font-bold text-oracle-yellow">
              ${targetPrice.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Prediction */}
        <div className={`rounded-xl border p-4 ${
          isUp
            ? 'border-oracle-green/30 bg-oracle-green/5'
            : 'border-oracle-red/30 bg-oracle-red/5'
        }`}>
          <span className="text-xs font-medium text-oracle-muted">Signal</span>
          <div className="mt-1 flex items-center gap-2">
            {isUp ? (
              <TrendingUp className="h-6 w-6 text-oracle-green" />
            ) : (
              <TrendingDown className="h-6 w-6 text-oracle-red" />
            )}
            <span className={`font-mono text-2xl font-bold ${isUp ? 'text-oracle-green' : 'text-oracle-red'}`}>
              {isUp ? 'UP' : 'DOWN'}
            </span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-oracle-border bg-oracle-bg/30 p-2">
        <PriceChart
          data={priceHistory}
          color={direction === 'up' || deltaPercent >= 0 ? '#00ff88' : '#ff4444'}
        />
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between text-xs text-oracle-muted">
        <span className="font-mono">Ξ 15.3 staked</span>
        <span className="text-oracle-cyan group-hover:underline">View Market →</span>
      </div>
    </button>
  )
}
