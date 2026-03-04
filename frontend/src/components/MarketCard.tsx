import { useNavigate } from 'react-router-dom'
import { Clock, TrendingUp, TrendingDown } from 'lucide-react'
import { useCountdown } from '@/hooks/useCountdown'
import { usePriceSimulation } from '@/hooks/usePriceSimulation'
import type { Market } from '@/data/markets'

function StatusBadge({ status }: { status: Market['status'] }) {
  const styles = {
    OPEN: 'bg-oracle-green/15 text-oracle-green border-oracle-green/30',
    LOCKED: 'bg-oracle-yellow/15 text-oracle-yellow border-oracle-yellow/30',
    RESOLVED: 'bg-oracle-muted/15 text-oracle-muted border-oracle-muted/30',
  }

  return (
    <span className={`rounded-full border px-2 py-0.5 font-mono text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  )
}

function ProgressBar({ choices }: { choices: Market['choices'] }) {
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-oracle-bg">
      {choices.map((choice, i) => (
        <div
          key={i}
          className="transition-all duration-500"
          style={{
            width: `${choice.percentage}%`,
            backgroundColor: choice.color,
            opacity: 0.8,
          }}
        />
      ))}
    </div>
  )
}

const CRYPTO_IDS = new Set(['btc-usd', 'eth-usd'])

export function MarketCard({ market }: { market: Market }) {
  const navigate = useNavigate()
  const { formatted, isUrgent } = useCountdown(market.deadline)
  const isCrypto = CRYPTO_IDS.has(market.id)
  const { currentPrice, deltaPercent } = usePriceSimulation(
    isCrypto ? market.basePrice : 0
  )

  const categoryColors: Record<string, string> = {
    Crypto: 'text-oracle-cyan border-oracle-cyan/30',
    Stocks: 'text-oracle-green border-oracle-green/30',
    Sports: 'text-oracle-purple border-oracle-purple/30',
    Weather: 'text-oracle-yellow border-oracle-yellow/30',
    News: 'text-oracle-muted border-oracle-muted/30',
  }

  return (
    <button
      onClick={() => navigate(`/market/${market.id}`)}
      className="group flex w-full cursor-pointer flex-col gap-4 rounded-xl border border-oracle-border bg-oracle-surface p-5 text-left transition-all hover:border-oracle-cyan/40 hover:bg-oracle-surface/80"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{market.icon}</span>
          <div>
            <h3 className="text-base font-semibold text-oracle-text">{market.name}</h3>
            <span className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-xs ${categoryColors[market.category] ?? ''}`}>
              {market.category}
            </span>
          </div>
        </div>
        <StatusBadge status={market.status} />
      </div>

      {/* Current vs Target for BTC/ETH */}
      {isCrypto && (
        <div className="flex items-center justify-between rounded-lg border border-oracle-border bg-oracle-bg/50 px-3 py-2">
          <div>
            <span className="text-xs text-oracle-muted">Current</span>
            <div className="flex items-center gap-1">
              <span className="font-mono text-sm font-bold text-oracle-text">
                ${currentPrice.toFixed(2)}
              </span>
              <span className={`flex items-center font-mono text-xs ${deltaPercent >= 0 ? 'text-oracle-green' : 'text-oracle-red'}`}>
                {deltaPercent >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {deltaPercent >= 0 ? '+' : ''}{deltaPercent.toFixed(2)}%
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-oracle-muted">Target</span>
            <div className="font-mono text-sm font-bold text-oracle-yellow">
              ${market.basePrice.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      <div>
        <div className="mb-2 flex justify-between">
          {market.choices.map((choice, i) => (
            <span key={i} className="font-mono text-xs font-medium" style={{ color: choice.color }}>
              {choice.label} {choice.percentage}%
            </span>
          ))}
        </div>
        <ProgressBar choices={market.choices} />
      </div>

      <div className="flex items-center justify-between">
        <span className="font-mono text-sm text-oracle-muted">
          Ξ {market.totalStaked.toFixed(1)} staked
        </span>
        <span className={`flex items-center gap-1 font-mono text-sm ${isUrgent ? 'countdown-urgent' : 'text-oracle-muted'}`}>
          <Clock className="h-3.5 w-3.5" />
          {formatted}
        </span>
      </div>
    </button>
  )
}
