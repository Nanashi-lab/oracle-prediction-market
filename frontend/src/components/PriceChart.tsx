import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface PricePoint {
  time: number
  price: number
}

interface PriceChartProps {
  data: PricePoint[]
  color: string
}

export function PriceChart({ data, color }: PriceChartProps) {
  if (data.length === 0) return null

  const minPrice = Math.min(...data.map(d => d.price))
  const maxPrice = Math.max(...data.map(d => d.price))
  const padding = (maxPrice - minPrice) * 0.1 || 1

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
          <XAxis dataKey="time" hide />
          <YAxis
            domain={[minPrice - padding, maxPrice + padding]}
            hide
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#12121a',
              border: '1px solid #1e1e2e',
              borderRadius: '8px',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '12px',
              color: '#e8e8f0',
            }}
            formatter={(value: number | undefined) => [`$${(value ?? 0).toFixed(2)}`, 'Price']}
            labelFormatter={() => ''}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke={color}
            strokeWidth={2}
            dot={false}
            animationDuration={0}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
