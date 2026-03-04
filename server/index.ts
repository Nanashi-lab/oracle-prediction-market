import express from 'express'
import cors from 'cors'

const app = express()
app.use(cors())
app.use(express.json())

// --- Alpha price state ---
const ROUND_DURATION = 5 * 60 * 1000 // 5 minutes
const MAX_HISTORY = 300

let currentPrice = 1000
let volatility = 0.001 // ±0.1%
let bias = 0 // -1 to 1
let paused = false

let roundStart = Date.now()
let targetPrice = currentPrice
let roundNumber = 1

interface PricePoint {
  time: number
  price: number
}

const priceHistory: PricePoint[] = []

// Seed 60s of history
for (let i = 60; i > 0; i--) {
  const change = currentPrice * (Math.random() * 2 * volatility - volatility)
  currentPrice += change
  priceHistory.push({ time: Date.now() - i * 1000, price: currentPrice })
}
targetPrice = priceHistory[0].price

// SSE clients
const sseClients = new Set<express.Response>()

function tick() {
  if (paused) return

  // Random walk
  const random = Math.random() * 2 - 1 + bias * 0.5
  const change = currentPrice * random * volatility
  currentPrice = Math.max(1, currentPrice + change)

  const now = Date.now()
  priceHistory.push({ time: now, price: currentPrice })
  if (priceHistory.length > MAX_HISTORY) priceHistory.shift()

  // Check round end
  if (now - roundStart >= ROUND_DURATION) {
    roundNumber++
    roundStart = now
    targetPrice = currentPrice
  }

  const roundElapsed = now - roundStart
  const roundRemaining = Math.max(0, ROUND_DURATION - roundElapsed)

  const payload = {
    price: currentPrice,
    targetPrice,
    roundNumber,
    roundRemaining,
    roundDuration: ROUND_DURATION,
    time: now,
  }

  // Broadcast to SSE clients
  for (const client of sseClients) {
    client.write(`data: ${JSON.stringify(payload)}\n\n`)
  }
}

setInterval(tick, 1000)

// --- Routes ---

app.get('/api/alpha/price', (_req, res) => {
  const now = Date.now()
  const roundElapsed = now - roundStart
  const roundRemaining = Math.max(0, ROUND_DURATION - roundElapsed)

  res.json({
    price: currentPrice,
    targetPrice,
    roundNumber,
    roundRemaining,
    roundDuration: ROUND_DURATION,
    history: priceHistory.slice(-120),
    time: now,
  })
})

app.get('/api/alpha/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  })

  // Send initial state
  const now = Date.now()
  const roundRemaining = Math.max(0, ROUND_DURATION - (now - roundStart))
  const initial = {
    price: currentPrice,
    targetPrice,
    roundNumber,
    roundRemaining,
    roundDuration: ROUND_DURATION,
    time: now,
  }
  res.write(`data: ${JSON.stringify(initial)}\n\n`)

  sseClients.add(res)

  req.on('close', () => {
    sseClients.delete(res)
  })
})

app.post('/api/alpha/control', (req, res) => {
  const { action, value } = req.body

  switch (action) {
    case 'bias':
      bias = Math.max(-1, Math.min(1, Number(value) || 0))
      res.json({ bias })
      break
    case 'volatility':
      volatility = Math.max(0.0001, Math.min(0.01, Number(value) || 0.001))
      res.json({ volatility })
      break
    case 'pause':
      paused = true
      res.json({ paused })
      break
    case 'resume':
      paused = false
      res.json({ paused })
      break
    case 'reset':
      currentPrice = 1000
      targetPrice = 1000
      roundStart = Date.now()
      roundNumber = 1
      priceHistory.length = 0
      priceHistory.push({ time: Date.now(), price: currentPrice })
      bias = 0
      volatility = 0.001
      paused = false
      res.json({ reset: true })
      break
    default:
      res.status(400).json({ error: 'Unknown action' })
  }
})

const PORT = 3001
app.listen(PORT, () => {
  console.log(`Alpha server running on http://localhost:${PORT}`)
})
