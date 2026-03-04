import { Trophy, XCircle, Clock } from 'lucide-react'
import type { UserBet } from '@/data/markets'

interface MyBetsProps {
  bets: UserBet[]
}

function StatusCell({ status }: { status: UserBet['status'] }) {
  const config = {
    Won: { icon: Trophy, class: 'text-oracle-green', bg: 'bg-oracle-green/10' },
    Lost: { icon: XCircle, class: 'text-oracle-red', bg: 'bg-oracle-red/10' },
    Pending: { icon: Clock, class: 'text-oracle-yellow', bg: 'bg-oracle-yellow/10' },
  }

  const { icon: Icon, class: textClass, bg } = config[status]

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full ${bg} px-2.5 py-1 text-xs font-medium ${textClass}`}>
      <Icon className="h-3 w-3" />
      {status}
    </span>
  )
}

export function MyBets({ bets }: MyBetsProps) {
  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-oracle-text">My Bets</h1>
        <p className="mt-2 text-sm text-oracle-muted">
          Track your prediction history and payouts.
        </p>
      </div>

      {bets.length === 0 ? (
        <div className="rounded-xl border border-oracle-border bg-oracle-surface p-16 text-center">
          <p className="text-oracle-muted">No bets placed yet. Head to the markets to get started.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-oracle-border bg-oracle-surface">
          <table className="w-full">
            <thead>
              <tr className="border-b border-oracle-border">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-oracle-muted">Market</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-oracle-muted">Choice</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-oracle-muted">Amount</th>
                <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-oracle-muted">Status</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-oracle-muted">Payout</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-oracle-muted">Time</th>
              </tr>
            </thead>
            <tbody>
              {bets.map(bet => (
                <tr key={bet.id} className="border-b border-oracle-border/50 transition-colors hover:bg-oracle-bg/30">
                  <td className="px-6 py-4 text-sm font-medium text-oracle-text">{bet.marketName}</td>
                  <td className="px-6 py-4 font-mono text-sm text-oracle-cyan">{bet.choice}</td>
                  <td className="px-6 py-4 text-right font-mono text-sm text-oracle-text">{bet.amount} ETH</td>
                  <td className="px-6 py-4 text-center"><StatusCell status={bet.status} /></td>
                  <td className="px-6 py-4 text-right font-mono text-sm">
                    {bet.payout > 0 ? (
                      <span className="text-oracle-green">+{bet.payout} ETH</span>
                    ) : bet.status === 'Lost' ? (
                      <span className="text-oracle-red">-{bet.amount} ETH</span>
                    ) : (
                      <span className="text-oracle-muted">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right text-xs text-oracle-muted">{bet.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary stats */}
      {bets.length > 0 && (
        <div className="mt-6 grid grid-cols-3 gap-4">
          {[
            {
              label: 'Total Wagered',
              value: `Ξ ${bets.reduce((s, b) => s + b.amount, 0).toFixed(2)}`,
              color: 'text-oracle-text',
            },
            {
              label: 'Total Won',
              value: `Ξ ${bets.filter(b => b.status === 'Won').reduce((s, b) => s + b.payout, 0).toFixed(2)}`,
              color: 'text-oracle-green',
            },
            {
              label: 'Win Rate',
              value: `${bets.filter(b => b.status !== 'Pending').length > 0
                ? Math.round((bets.filter(b => b.status === 'Won').length / bets.filter(b => b.status !== 'Pending').length) * 100)
                : 0}%`,
              color: 'text-oracle-cyan',
            },
          ].map((stat, i) => (
            <div key={i} className="rounded-xl border border-oracle-border bg-oracle-surface p-4 text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-oracle-muted">{stat.label}</p>
              <p className={`mt-1 font-mono text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
