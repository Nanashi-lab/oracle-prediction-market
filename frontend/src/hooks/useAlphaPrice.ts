import { useState, useEffect, useRef } from 'react'

interface PricePoint {
  time: number
  price: number
}

interface AlphaPriceState {
  currentPrice: number
  targetPrice: number
  roundNumber: number
  roundRemaining: number
  roundDuration: number
  priceHistory: PricePoint[]
  direction: 'up' | 'down' | null
  deltaPercent: number
  connected: boolean
}

export function useAlphaPrice(): AlphaPriceState {
  const [currentPrice, setCurrentPrice] = useState(1000)
  const [targetPrice, setTargetPrice] = useState(1000)
  const [roundNumber, setRoundNumber] = useState(1)
  const [roundRemaining, setRoundRemaining] = useState(300000)
  const [roundDuration, setRoundDuration] = useState(300000)
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([])
  const [direction, setDirection] = useState<'up' | 'down' | null>(null)
  const [deltaPercent, setDeltaPercent] = useState(0)
  const [connected, setConnected] = useState(false)
  const prevPrice = useRef(1000)
  const initialFetched = useRef(false)

  useEffect(() => {
    // Fetch initial history
    fetch('/api/alpha/price')
      .then(res => res.json())
      .then(data => {
        setPriceHistory(data.history)
        setCurrentPrice(data.price)
        setTargetPrice(data.targetPrice)
        setRoundNumber(data.roundNumber)
        setRoundRemaining(data.roundRemaining)
        setRoundDuration(data.roundDuration)
        prevPrice.current = data.price
        initialFetched.current = true
      })
      .catch(() => {})

    // SSE stream
    const es = new EventSource('/api/alpha/stream')

    es.onmessage = (event) => {
      const data = JSON.parse(event.data)
      setConnected(true)

      setCurrentPrice(data.price)
      setTargetPrice(data.targetPrice)
      setRoundNumber(data.roundNumber)
      setRoundRemaining(data.roundRemaining)
      setRoundDuration(data.roundDuration)

      const newDir = data.price >= prevPrice.current ? 'up' : 'down'
      setDirection(newDir)
      setDeltaPercent(((data.price - data.targetPrice) / data.targetPrice) * 100)
      prevPrice.current = data.price

      setPriceHistory(h => {
        const next = [...h, { time: data.time, price: data.price }]
        return next.length > 120 ? next.slice(-120) : next
      })
    }

    es.onerror = () => {
      setConnected(false)
    }

    return () => es.close()
  }, [])

  return {
    currentPrice,
    targetPrice,
    roundNumber,
    roundRemaining,
    roundDuration,
    priceHistory,
    direction,
    deltaPercent,
    connected,
  }
}
