import { useState, useEffect, useRef, useCallback } from 'react'

interface PricePoint {
  time: number
  price: number
}

export function usePriceSimulation(basePrice: number) {
  const [currentPrice, setCurrentPrice] = useState(basePrice)
  const [delta, setDelta] = useState(0)
  const [deltaPercent, setDeltaPercent] = useState(0)
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>(() => {
    const history: PricePoint[] = []
    let price = basePrice
    for (let i = 60; i > 0; i--) {
      price += price * (Math.random() * 0.002 - 0.001)
      history.push({ time: Date.now() - i * 1000, price })
    }
    return history
  })
  const [direction, setDirection] = useState<'up' | 'down' | null>(null)
  const prevPrice = useRef(basePrice)

  const tick = useCallback(() => {
    setCurrentPrice(prev => {
      const change = prev * (Math.random() * 0.002 - 0.001)
      const newPrice = prev + change
      const newDelta = newPrice - basePrice
      const newDeltaPercent = (newDelta / basePrice) * 100

      setDelta(newDelta)
      setDeltaPercent(newDeltaPercent)
      setDirection(newPrice >= prevPrice.current ? 'up' : 'down')
      prevPrice.current = newPrice

      setPriceHistory(h => {
        const next = [...h, { time: Date.now(), price: newPrice }]
        return next.length > 120 ? next.slice(-120) : next
      })

      return newPrice
    })
  }, [basePrice])

  useEffect(() => {
    if (basePrice === 0) return
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [tick, basePrice])

  return { currentPrice, delta, deltaPercent, priceHistory, direction }
}
