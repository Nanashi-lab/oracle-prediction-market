import { markets } from '@/data/markets'
import { MarketCard } from '@/components/MarketCard'
import { FeaturedMarketCard } from '@/components/FeaturedMarketCard'
import { TrendingUp } from 'lucide-react'

export function Home() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <TrendingUp className="h-6 w-6 text-oracle-cyan" />
          <h1 className="text-2xl font-bold text-oracle-text">Live Markets</h1>
        </div>
        <p className="mt-2 text-sm text-oracle-muted">
          Predict outcomes. Stake ETH. Win big.
        </p>
      </div>

      {/* Featured Alpha Market */}
      <div className="mb-8">
        <FeaturedMarketCard />
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {markets.map(market => (
          <MarketCard key={market.id} market={market} />
        ))}
      </div>
    </div>
  )
}
