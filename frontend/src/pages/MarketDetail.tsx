import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Clock, TrendingUp, TrendingDown, Zap } from 'lucide-react'
import { markets, alphaMarket } from '@/data/markets'
import { useCountdown } from '@/hooks/useCountdown'
import { usePriceSimulation } from '@/hooks/usePriceSimulation'
import { useAlphaPrice } from '@/hooks/useAlphaPrice'
import { useToast } from '@/components/Toast'
import { PriceChart } from '@/components/PriceChart'
import { useWallet } from '@/context/WalletContext'
import { useContract, useRoundInfo, useMyBet, usePastRounds } from '@/hooks/useContract'
import { ALPHA_MARKET_ID } from '@/config/contract'
import type { UserBet } from '@/data/markets'

interface MarketDetailProps {
  onPlaceBet: (bet: UserBet) => void
}

function formatRoundTime(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}

export function MarketDetail({ onPlaceBet }: MarketDetailProps) {
  const { id } = useParams<{ id: string }>()
  const isAlpha = id === 'alpha'
  const market = isAlpha ? alphaMarket : markets.find(m => m.id === id)
  const { showToast } = useToast()
  const { isConnected } = useWallet()
  const { placeBet: placeBetOnChain, claimWinnings } = useContract()
  const { roundInfo, refresh: refreshRound } = useRoundInfo(ALPHA_MARKET_ID)
  const { myBet, refresh: refreshMyBet } = useMyBet(ALPHA_MARKET_ID, roundInfo?.currentRound ?? null)
  const { pastRounds, refresh: refreshPastRounds } = usePastRounds(ALPHA_MARKET_ID, roundInfo?.currentRound ?? null)
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const [betting, setBetting] = useState(false)
  const [claimingRound, setClaimingRound] = useState<number | null>(null)
  const [flashClass, setFlashClass] = useState('')
  const prevPriceRef = useRef(0)

  const hasPrice = market ? market.basePrice > 0 : false

  // Use API prices for Alpha, simulated for others
  const simulated = usePriceSimulation(isAlpha ? 0 : (market?.basePrice ?? 0))
  const alpha = useAlphaPrice()

  const currentPrice = isAlpha ? alpha.currentPrice : simulated.currentPrice
  const deltaPercent = isAlpha ? alpha.deltaPercent : simulated.deltaPercent
  const priceHistory = isAlpha ? alpha.priceHistory : simulated.priceHistory
  const direction = isAlpha ? alpha.direction : simulated.direction

  const { formatted, isUrgent } = useCountdown(market?.deadline ?? 0)

  // Price flash effect
  useEffect(() => {
    if (!hasPrice) return
    if (prevPriceRef.current !== 0 && currentPrice !== prevPriceRef.current) {
      setFlashClass(currentPrice > prevPriceRef.current ? 'price-flash-up' : 'price-flash-down')
      const timeout = setTimeout(() => setFlashClass(''), 400)
      return () => clearTimeout(timeout)
    }
    prevPriceRef.current = currentPrice
  }, [currentPrice, hasPrice])

  if (!market) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-16 text-center">
        <p className="text-oracle-muted">Market not found.</p>
        <Link to="/" className="mt-4 inline-block text-oracle-cyan">Back to markets</Link>
      </div>
    )
  }

  const handlePlaceBet = async () => {
    if (!selectedChoice || !amount || parseFloat(amount) <= 0) {
      showToast('Please select a choice and enter an amount', 'error')
      return
    }

    if (isAlpha && !isConnected) {
      showToast('Connect your wallet first', 'error')
      return
    }

    if (isAlpha) {
      // Real on-chain bet for Alpha market
      const choiceIndex = market.choices.findIndex(c => c.label === selectedChoice)
      if (choiceIndex === -1) return

      setBetting(true)
      try {
        await placeBetOnChain(ALPHA_MARKET_ID, choiceIndex, amount)
        showToast(`Bet placed on-chain: ${amount} ETH on ${selectedChoice}`)
        refreshRound()
        refreshMyBet()
      } catch (err: any) {
        const msg = err?.reason || err?.message || 'Transaction failed'
        showToast(msg, 'error')
      } finally {
        setBetting(false)
      }
    }

    // Also track in local state for the My Bets page
    const bet: UserBet = {
      id: `b-${Date.now()}`,
      marketId: market.id,
      marketName: market.name,
      choice: selectedChoice,
      amount: parseFloat(amount),
      status: 'Pending',
      payout: 0,
      timestamp: 'Just now',
    }
    onPlaceBet(bet)
    setSelectedChoice(null)
    setAmount('')
  }

  const handleClaim = async (roundNum: number) => {
    if (!isConnected) {
      showToast('Connect your wallet first', 'error')
      return
    }
    setClaimingRound(roundNum)
    try {
      await claimWinnings(ALPHA_MARKET_ID, roundNum)
      showToast(`Winnings claimed for round #${roundNum}!`)
      refreshPastRounds()
    } catch (err: any) {
      const msg = err?.reason || err?.message || 'Claim failed'
      showToast(msg, 'error')
    } finally {
      setClaimingRound(null)
    }
  }

  const presets = [0.1, 0.5, 1.0]

  const categoryColors: Record<string, string> = {
    Crypto: 'text-oracle-cyan border-oracle-cyan/30',
    Stocks: 'text-oracle-green border-oracle-green/30',
    Sports: 'text-oracle-purple border-oracle-purple/30',
    Weather: 'text-oracle-yellow border-oracle-yellow/30',
    News: 'text-oracle-muted border-oracle-muted/30',
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link to="/" className="rounded-lg border border-oracle-border p-2 text-oracle-muted transition-colors hover:border-oracle-cyan hover:text-oracle-cyan">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <span className="text-2xl">{market.icon}</span>
        <h1 className="text-2xl font-bold text-oracle-text">{market.name}</h1>
        {isAlpha && <Zap className="h-5 w-5 text-oracle-cyan" />}
        <span className={`rounded-full border px-2 py-0.5 text-xs ${categoryColors[market.category] ?? ''}`}>
          {market.category}
        </span>
        <span className={`ml-auto rounded-full border px-2 py-0.5 font-mono text-xs font-medium ${
          market.status === 'OPEN' ? 'border-oracle-green/30 bg-oracle-green/15 text-oracle-green' : 'border-oracle-muted/30 bg-oracle-muted/15 text-oracle-muted'
        }`}>
          {market.status}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column - Chart + Price */}
        <div className="lg:col-span-2 space-y-6">
          {/* Price display + chart (only for priced markets) */}
          {hasPrice && (
            <div className="rounded-xl border border-oracle-border bg-oracle-surface p-6">
              {/* Current vs Target for Alpha */}
              {isAlpha ? (
                <div className="mb-4 grid grid-cols-3 gap-4">
                  <div className={`rounded-lg border border-oracle-border bg-oracle-bg/50 p-3 ${flashClass}`}>
                    <span className="text-xs text-oracle-muted">Current Price</span>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="font-mono text-2xl font-bold text-oracle-text">
                        ${currentPrice.toFixed(2)}
                      </span>
                      <span className={`flex items-center gap-0.5 font-mono text-xs ${
                        deltaPercent >= 0 ? 'text-oracle-green' : 'text-oracle-red'
                      }`}>
                        {deltaPercent >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {deltaPercent >= 0 ? '+' : ''}{deltaPercent.toFixed(3)}%
                      </span>
                    </div>
                  </div>
                  <div className="rounded-lg border border-oracle-border bg-oracle-bg/50 p-3">
                    <span className="text-xs text-oracle-muted">Target Price</span>
                    <div className="mt-1">
                      <span className="font-mono text-2xl font-bold text-oracle-yellow">
                        ${alpha.targetPrice.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="rounded-lg border border-oracle-border bg-oracle-bg/50 p-3">
                    <span className="text-xs text-oracle-muted">Round #{alpha.roundNumber}</span>
                    <div className="mt-1 font-mono text-2xl font-bold text-oracle-text">
                      {formatRoundTime(alpha.roundRemaining)}
                    </div>
                  </div>
                </div>
              ) : (
                <div className={`mb-4 flex items-baseline gap-4 rounded-lg p-2 ${flashClass}`}>
                  <span className="font-mono text-3xl font-bold text-oracle-text">
                    {market.priceUnit}{currentPrice.toFixed(2)}
                  </span>
                  <span className={`flex items-center gap-1 font-mono text-sm font-medium ${
                    deltaPercent >= 0 ? 'text-oracle-green' : 'text-oracle-red'
                  }`}>
                    {deltaPercent >= 0 ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                    {deltaPercent >= 0 ? '+' : ''}{deltaPercent.toFixed(3)}%
                  </span>
                </div>
              )}
              <PriceChart
                data={priceHistory}
                color={direction === 'up' || deltaPercent >= 0 ? '#00ff88' : '#ff4444'}
              />
            </div>
          )}

          {/* Description for non-priced markets */}
          {!hasPrice && (
            <div className="rounded-xl border border-oracle-border bg-oracle-surface p-6">
              <p className="text-lg text-oracle-text">{market.description}</p>
              <div className="mt-4 flex justify-between">
                {market.choices.map((choice, i) => (
                  <div key={i} className="text-center">
                    <span className="font-mono text-2xl font-bold" style={{ color: choice.color }}>
                      {choice.percentage}%
                    </span>
                    <p className="mt-1 text-sm text-oracle-muted">{choice.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Countdown */}
          {!isAlpha && (
            <div className="rounded-xl border border-oracle-border bg-oracle-surface p-6 text-center">
              <div className="flex items-center justify-center gap-2 text-oracle-muted">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-medium">Round Closes In</span>
              </div>
              <div className={`mt-2 font-mono text-4xl font-bold ${isUrgent ? 'countdown-urgent' : 'text-oracle-text'}`}>
                {formatted}
              </div>
            </div>
          )}

          {/* Recent Bets */}
          <div className="rounded-xl border border-oracle-border bg-oracle-surface p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-oracle-muted">
              Recent Bets
            </h3>
            <div className="space-y-2">
              {market.recentBets.map((bet, i) => {
                const choice = market.choices.find(c => c.label === bet.choice)
                return (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-oracle-bg/50 px-4 py-2.5">
                    <span className="font-mono text-xs text-oracle-muted">{bet.wallet}</span>
                    <span className="font-mono text-xs font-medium" style={{ color: choice?.color }}>
                      {bet.choice}
                    </span>
                    <span className="font-mono text-xs text-oracle-text">{bet.amount} ETH</span>
                    <span className="text-xs text-oracle-muted">{bet.timestamp}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Past Rounds — on-chain data for Alpha, mock for others */}
          {isAlpha && pastRounds.length > 0 ? (
            <div className="rounded-xl border border-oracle-border bg-oracle-surface p-6">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-oracle-muted">
                Past Rounds (On-Chain)
              </h3>
              <div className="space-y-2">
                {pastRounds.map((round) => {
                  const outcomeLabel = round.winningChoice === 0 ? 'UP' : 'DOWN'
                  const outcomeColor = round.winningChoice === 0 ? '#00ff88' : '#ff4444'
                  const won = round.myBet && round.resolved && round.myBet.choice === round.winningChoice
                  const lost = round.myBet && round.resolved && round.myBet.choice !== round.winningChoice
                  const canClaim = won && !round.myBet!.claimed

                  return (
                    <div key={round.roundNum} className="rounded-lg bg-oracle-bg/50 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-oracle-muted">Round #{round.roundNum}</span>
                        {round.resolved ? (
                          <span
                            className="rounded-full px-2 py-0.5 font-mono text-xs font-medium"
                            style={{ color: outcomeColor, backgroundColor: `${outcomeColor}15` }}
                          >
                            {outcomeLabel}
                          </span>
                        ) : (
                          <span className="rounded-full bg-oracle-yellow/10 px-2 py-0.5 font-mono text-xs font-medium text-oracle-yellow">
                            PENDING
                          </span>
                        )}
                        <span className="font-mono text-xs text-oracle-text">
                          {parseFloat(round.totalPool).toFixed(4)} ETH
                        </span>
                      </div>

                      {round.myBet && (
                        <div className="mt-2 flex items-center justify-between border-t border-oracle-border/50 pt-2">
                          <span className="text-xs text-oracle-muted">
                            Your bet: {round.myBet.amount} ETH on {round.myBet.choice === 0 ? 'UP' : 'DOWN'}
                          </span>
                          {canClaim && (
                            <button
                              onClick={() => handleClaim(round.roundNum)}
                              disabled={claimingRound === round.roundNum}
                              className="cursor-pointer rounded-lg bg-oracle-green/20 px-3 py-1 text-xs font-semibold text-oracle-green transition-all hover:bg-oracle-green/30 disabled:opacity-50"
                            >
                              {claimingRound === round.roundNum ? 'Claiming...' : 'Claim Winnings'}
                            </button>
                          )}
                          {round.myBet.claimed && (
                            <span className="text-xs text-oracle-green">Claimed</span>
                          )}
                          {lost && !round.myBet!.claimed && (
                            <span className="text-xs text-oracle-red">Lost</span>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-oracle-border bg-oracle-surface p-6">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-oracle-muted">
                Round History
              </h3>
              <div className="space-y-2">
                {market.roundHistory.map((round, i) => {
                  const choice = market.choices.find(c => c.label === round.outcome)
                  return (
                    <div key={i} className="flex items-center justify-between rounded-lg bg-oracle-bg/50 px-4 py-2.5">
                      <span className="font-mono text-xs text-oracle-muted">Round #{round.round}</span>
                      <span
                        className="rounded-full px-2 py-0.5 font-mono text-xs font-medium"
                        style={{ color: choice?.color, backgroundColor: `${choice?.color}15` }}
                      >
                        {round.outcome}
                      </span>
                      <span className="font-mono text-xs text-oracle-text">Ξ {round.totalStaked.toFixed(1)}</span>
                      <span className="text-xs text-oracle-muted">{round.timestamp}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right column - Bet Panel */}
        <div className="space-y-6">
          <div className="sticky top-24 rounded-xl border border-oracle-border bg-oracle-surface p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-oracle-muted">
              Place Your Bet
            </h3>

            {/* Choice buttons */}
            <div className="mb-5 flex flex-col gap-2">
              {market.choices.map((choice, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedChoice(choice.label)}
                  className={`flex cursor-pointer items-center justify-between rounded-lg border px-4 py-3 font-medium transition-all ${
                    selectedChoice === choice.label
                      ? 'border-transparent'
                      : 'border-oracle-border bg-oracle-bg/50 text-oracle-muted hover:border-oracle-border hover:text-oracle-text'
                  }`}
                  style={
                    selectedChoice === choice.label
                      ? { backgroundColor: `${choice.color}20`, borderColor: `${choice.color}50`, color: choice.color }
                      : undefined
                  }
                >
                  <span>{choice.label}</span>
                  <span className="font-mono text-sm">{choice.percentage}%</span>
                </button>
              ))}
            </div>

            {/* Amount input */}
            <div className="mb-4">
              <label className="mb-2 block text-xs font-medium text-oracle-muted">Amount (ETH)</label>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full rounded-lg border border-oracle-border bg-oracle-bg px-4 py-3 font-mono text-oracle-text outline-none transition-colors focus:border-oracle-cyan placeholder:text-oracle-muted/50"
              />
              <div className="mt-2 flex gap-2">
                {presets.map(preset => (
                  <button
                    key={preset}
                    onClick={() => setAmount(preset.toString())}
                    className="cursor-pointer rounded-md border border-oracle-border bg-oracle-bg/50 px-3 py-1 font-mono text-xs text-oracle-muted transition-colors hover:border-oracle-cyan hover:text-oracle-text"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Wallet warning for Alpha */}
            {isAlpha && !isConnected && (
              <div className="mb-3 rounded-lg border border-oracle-yellow/30 bg-oracle-yellow/5 px-3 py-2 text-xs text-oracle-yellow">
                Connect your wallet to place on-chain bets
              </div>
            )}

            {/* Already bet warning */}
            {isAlpha && myBet?.exists && (
              <div className="mb-3 rounded-lg border border-oracle-cyan/30 bg-oracle-cyan/5 px-3 py-2 text-xs text-oracle-cyan">
                You already bet {myBet.amount} ETH on {market.choices[myBet.choice]?.label} this round
              </div>
            )}

            {/* Place bet button */}
            <button
              onClick={handlePlaceBet}
              disabled={!selectedChoice || !amount || betting || (isAlpha && myBet?.exists)}
              className="w-full cursor-pointer rounded-lg bg-oracle-cyan px-4 py-3 font-semibold text-oracle-bg transition-all hover:bg-oracle-cyan/90 disabled:cursor-not-allowed disabled:opacity-30"
            >
              {betting ? 'Confirming...' : isAlpha ? 'Place Bet (On-Chain)' : 'Place Bet'}
            </button>

            {/* On-chain pool info for Alpha */}
            {isAlpha && roundInfo && (
              <div className="mt-4 space-y-2">
                <div className="text-center font-mono text-xs text-oracle-muted">
                  Round #{roundInfo.currentRound} — On-Chain Pool
                </div>
                <div className="flex justify-between rounded-lg bg-oracle-bg/50 px-3 py-2">
                  <span className="text-xs text-oracle-green">UP Pool</span>
                  <span className="font-mono text-xs text-oracle-text">{parseFloat(roundInfo.choicePools[0] || '0').toFixed(4)} ETH</span>
                </div>
                <div className="flex justify-between rounded-lg bg-oracle-bg/50 px-3 py-2">
                  <span className="text-xs text-oracle-red">DOWN Pool</span>
                  <span className="font-mono text-xs text-oracle-text">{parseFloat(roundInfo.choicePools[1] || '0').toFixed(4)} ETH</span>
                </div>
                <div className="flex justify-between rounded-lg bg-oracle-bg/50 px-3 py-2">
                  <span className="text-xs text-oracle-muted">Total</span>
                  <span className="font-mono text-xs font-medium text-oracle-text">{parseFloat(roundInfo.totalPool).toFixed(4)} ETH</span>
                </div>
              </div>
            )}

            {/* Fallback staked info for non-Alpha */}
            {!isAlpha && (
              <div className="mt-4 text-center font-mono text-xs text-oracle-muted">
                Ξ {market.totalStaked.toFixed(1)} total staked this round
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
