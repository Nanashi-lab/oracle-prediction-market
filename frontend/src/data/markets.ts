export interface Choice {
  label: string
  percentage: number
  color: string
}

export interface RecentBet {
  wallet: string
  choice: string
  amount: number
  timestamp: string
}

export interface RoundResult {
  round: number
  outcome: string
  totalStaked: number
  timestamp: string
}

export interface Market {
  id: string
  name: string
  icon: string
  category: string
  description: string
  choices: Choice[]
  totalStaked: number
  deadline: number
  status: 'OPEN' | 'LOCKED' | 'RESOLVED'
  basePrice: number
  priceUnit: string
  recentBets: RecentBet[]
  roundHistory: RoundResult[]
}

const now = Date.now()
const HOUR = 3600_000
const MINUTE = 60_000

export const alphaMarket: Market = {
  id: 'alpha',
  name: 'ALPHA / USD',
  icon: 'α',
  category: 'Crypto',
  description: 'Will Alpha close above the target price at round end?',
  choices: [
    { label: 'UP', percentage: 50, color: '#00ff88' },
    { label: 'DOWN', percentage: 50, color: '#ff4444' },
  ],
  totalStaked: 15.3,
  deadline: now + 5 * MINUTE,
  status: 'OPEN',
  basePrice: 1000,
  priceUnit: '$',
  recentBets: [
    { wallet: '0xaB12...7cD3', choice: 'UP', amount: 2.0, timestamp: '1m ago' },
    { wallet: '0x3eF4...9aB1', choice: 'DOWN', amount: 1.5, timestamp: '2m ago' },
    { wallet: '0x8cD2...4eF6', choice: 'UP', amount: 0.8, timestamp: '3m ago' },
    { wallet: '0x1aB5...6cD8', choice: 'DOWN', amount: 3.0, timestamp: '5m ago' },
    { wallet: '0x5eF9...2aB4', choice: 'UP', amount: 0.5, timestamp: '7m ago' },
    { wallet: '0x7cD1...3eF5', choice: 'UP', amount: 1.2, timestamp: '9m ago' },
    { wallet: '0x2aB8...8cD2', choice: 'DOWN', amount: 0.6, timestamp: '11m ago' },
    { wallet: '0x4eF3...1aB7', choice: 'UP', amount: 2.7, timestamp: '14m ago' },
  ],
  roundHistory: [
    { round: 12, outcome: 'UP', totalStaked: 14.2, timestamp: '5m ago' },
    { round: 11, outcome: 'DOWN', totalStaked: 11.8, timestamp: '10m ago' },
    { round: 10, outcome: 'UP', totalStaked: 16.5, timestamp: '15m ago' },
    { round: 9, outcome: 'UP', totalStaked: 9.3, timestamp: '20m ago' },
    { round: 8, outcome: 'DOWN', totalStaked: 12.1, timestamp: '25m ago' },
  ],
}

export const markets: Market[] = [
  {
    id: 'btc-usd',
    name: 'BTC / USD',
    icon: '₿',
    category: 'Crypto',
    description: 'Will Bitcoin close above $68,000 at round end?',
    choices: [
      { label: 'UP', percentage: 62, color: '#00ff88' },
      { label: 'DOWN', percentage: 38, color: '#ff4444' },
    ],
    totalStaked: 4.2,
    deadline: now + 2 * HOUR + 14 * MINUTE,
    status: 'OPEN',
    basePrice: 67842.5,
    priceUnit: '$',
    recentBets: [
      { wallet: '0x7a3F...e9B2', choice: 'UP', amount: 0.5, timestamp: '2m ago' },
      { wallet: '0xd1C4...3fA8', choice: 'DOWN', amount: 0.2, timestamp: '3m ago' },
      { wallet: '0x9eB1...7c4D', choice: 'UP', amount: 1.0, timestamp: '5m ago' },
      { wallet: '0x2fA6...8dE3', choice: 'UP', amount: 0.3, timestamp: '7m ago' },
      { wallet: '0xb8D2...1aF5', choice: 'DOWN', amount: 0.8, timestamp: '9m ago' },
      { wallet: '0x4cE7...6bA1', choice: 'UP', amount: 0.1, timestamp: '12m ago' },
      { wallet: '0x6aF3...2eC9', choice: 'DOWN', amount: 0.4, timestamp: '15m ago' },
      { wallet: '0x1dB8...5fD7', choice: 'UP', amount: 0.6, timestamp: '18m ago' },
    ],
    roundHistory: [
      { round: 42, outcome: 'UP', totalStaked: 3.8, timestamp: '2h ago' },
      { round: 41, outcome: 'DOWN', totalStaked: 5.1, timestamp: '4h ago' },
      { round: 40, outcome: 'UP', totalStaked: 2.9, timestamp: '6h ago' },
      { round: 39, outcome: 'UP', totalStaked: 4.4, timestamp: '8h ago' },
      { round: 38, outcome: 'DOWN', totalStaked: 3.2, timestamp: '10h ago' },
    ],
  },
  {
    id: 'eth-usd',
    name: 'ETH / USD',
    icon: 'Ξ',
    category: 'Crypto',
    description: 'Will Ethereum close above $3,500 at round end?',
    choices: [
      { label: 'UP', percentage: 55, color: '#00ff88' },
      { label: 'DOWN', percentage: 45, color: '#ff4444' },
    ],
    totalStaked: 8.7,
    deadline: now + 1 * HOUR + 42 * MINUTE,
    status: 'OPEN',
    basePrice: 3487.2,
    priceUnit: '$',
    recentBets: [
      { wallet: '0x3bE4...9cA1', choice: 'DOWN', amount: 1.2, timestamp: '1m ago' },
      { wallet: '0x8fD7...2eB6', choice: 'UP', amount: 0.5, timestamp: '2m ago' },
      { wallet: '0xc1A3...7dF4', choice: 'UP', amount: 0.8, timestamp: '4m ago' },
      { wallet: '0x5eC9...3aB2', choice: 'DOWN', amount: 0.3, timestamp: '6m ago' },
      { wallet: '0xa2F6...8cD1', choice: 'UP', amount: 2.0, timestamp: '8m ago' },
      { wallet: '0x7dB1...4eA5', choice: 'DOWN', amount: 0.6, timestamp: '11m ago' },
      { wallet: '0xe4C8...1fB3', choice: 'UP', amount: 0.4, timestamp: '14m ago' },
      { wallet: '0x9aD5...6cE7', choice: 'DOWN', amount: 0.9, timestamp: '17m ago' },
    ],
    roundHistory: [
      { round: 38, outcome: 'UP', totalStaked: 7.2, timestamp: '2h ago' },
      { round: 37, outcome: 'UP', totalStaked: 6.5, timestamp: '4h ago' },
      { round: 36, outcome: 'DOWN', totalStaked: 9.1, timestamp: '6h ago' },
      { round: 35, outcome: 'DOWN', totalStaked: 5.8, timestamp: '8h ago' },
      { round: 34, outcome: 'UP', totalStaked: 8.3, timestamp: '10h ago' },
    ],
  },
  {
    id: 'aapl',
    name: 'AAPL Stock',
    icon: '',
    category: 'Stocks',
    description: 'Will Apple close above $192 at market close?',
    choices: [
      { label: 'UP', percentage: 48, color: '#00ff88' },
      { label: 'DOWN', percentage: 52, color: '#ff4444' },
    ],
    totalStaked: 3.1,
    deadline: now + 5 * HOUR + 30 * MINUTE,
    status: 'OPEN',
    basePrice: 191.45,
    priceUnit: '$',
    recentBets: [
      { wallet: '0x6bA2...4dC8', choice: 'DOWN', amount: 0.4, timestamp: '3m ago' },
      { wallet: '0xf1E5...8aB3', choice: 'UP', amount: 0.2, timestamp: '5m ago' },
      { wallet: '0x2cD9...7eF1', choice: 'DOWN', amount: 0.6, timestamp: '8m ago' },
      { wallet: '0x8aF4...1bC6', choice: 'UP', amount: 1.5, timestamp: '10m ago' },
      { wallet: '0xd3B7...5eA2', choice: 'DOWN', amount: 0.3, timestamp: '14m ago' },
      { wallet: '0x4eC1...9fD5', choice: 'UP', amount: 0.1, timestamp: '18m ago' },
      { wallet: '0xa7F6...2cB8', choice: 'DOWN', amount: 0.7, timestamp: '22m ago' },
      { wallet: '0x1dE3...6aF9', choice: 'UP', amount: 0.3, timestamp: '25m ago' },
    ],
    roundHistory: [
      { round: 15, outcome: 'DOWN', totalStaked: 2.4, timestamp: '1d ago' },
      { round: 14, outcome: 'UP', totalStaked: 3.6, timestamp: '2d ago' },
      { round: 13, outcome: 'UP', totalStaked: 2.8, timestamp: '3d ago' },
      { round: 12, outcome: 'DOWN', totalStaked: 4.1, timestamp: '4d ago' },
      { round: 11, outcome: 'UP', totalStaked: 3.3, timestamp: '5d ago' },
    ],
  },
  {
    id: 'nfl-game',
    name: 'NFL: Chiefs vs Ravens',
    icon: '🏈',
    category: 'Sports',
    description: 'Who will win the AFC Championship?',
    choices: [
      { label: 'Chiefs', percentage: 57, color: '#ff4444' },
      { label: 'Ravens', percentage: 43, color: '#aa66ff' },
    ],
    totalStaked: 12.4,
    deadline: now + 24 * HOUR,
    status: 'OPEN',
    basePrice: 0,
    priceUnit: '',
    recentBets: [
      { wallet: '0xc4D8...1eA3', choice: 'Chiefs', amount: 2.0, timestamp: '5m ago' },
      { wallet: '0x7aF2...9bC5', choice: 'Ravens', amount: 1.5, timestamp: '8m ago' },
      { wallet: '0xe1B6...3dF8', choice: 'Chiefs', amount: 0.8, timestamp: '12m ago' },
      { wallet: '0x5cA9...7eD1', choice: 'Ravens', amount: 3.0, timestamp: '15m ago' },
      { wallet: '0x2fE4...6aC7', choice: 'Chiefs', amount: 0.5, timestamp: '20m ago' },
      { wallet: '0x8dB3...4fC2', choice: 'Chiefs', amount: 1.2, timestamp: '25m ago' },
      { wallet: '0xb6A1...2eD9', choice: 'Ravens', amount: 0.7, timestamp: '30m ago' },
      { wallet: '0x3eF5...8bA4', choice: 'Chiefs', amount: 2.7, timestamp: '35m ago' },
    ],
    roundHistory: [
      { round: 5, outcome: 'Chiefs', totalStaked: 10.2, timestamp: '1w ago' },
      { round: 4, outcome: 'Ravens', totalStaked: 8.7, timestamp: '2w ago' },
      { round: 3, outcome: 'Chiefs', totalStaked: 11.5, timestamp: '3w ago' },
      { round: 2, outcome: 'Chiefs', totalStaked: 9.1, timestamp: '4w ago' },
      { round: 1, outcome: 'Ravens', totalStaked: 7.8, timestamp: '5w ago' },
    ],
  },
  {
    id: 'weather-nyc',
    name: 'NYC Rain Tomorrow',
    icon: '🌧️',
    category: 'Weather',
    description: 'Will it rain in New York City tomorrow?',
    choices: [
      { label: 'Yes', percentage: 35, color: '#00d4ff' },
      { label: 'No', percentage: 65, color: '#ffaa00' },
    ],
    totalStaked: 1.8,
    deadline: now + 18 * HOUR,
    status: 'OPEN',
    basePrice: 0,
    priceUnit: '',
    recentBets: [
      { wallet: '0xd2E7...5aC1', choice: 'No', amount: 0.3, timestamp: '10m ago' },
      { wallet: '0x6bF4...8dA3', choice: 'Yes', amount: 0.2, timestamp: '15m ago' },
      { wallet: '0xa1C9...3eB6', choice: 'No', amount: 0.5, timestamp: '20m ago' },
      { wallet: '0x4eD2...7fC8', choice: 'No', amount: 0.1, timestamp: '25m ago' },
      { wallet: '0x8aB5...1cE4', choice: 'Yes', amount: 0.4, timestamp: '30m ago' },
      { wallet: '0xf3A8...6dB1', choice: 'No', amount: 0.2, timestamp: '40m ago' },
      { wallet: '0x2cF6...9eA7', choice: 'Yes', amount: 0.1, timestamp: '50m ago' },
      { wallet: '0x5dE1...4bC3', choice: 'No', amount: 0.3, timestamp: '1h ago' },
    ],
    roundHistory: [
      { round: 30, outcome: 'No', totalStaked: 1.5, timestamp: '1d ago' },
      { round: 29, outcome: 'Yes', totalStaked: 2.1, timestamp: '2d ago' },
      { round: 28, outcome: 'No', totalStaked: 1.2, timestamp: '3d ago' },
      { round: 27, outcome: 'No', totalStaked: 1.8, timestamp: '4d ago' },
      { round: 26, outcome: 'Yes', totalStaked: 2.4, timestamp: '5d ago' },
    ],
  },
  {
    id: 'fed-rate',
    name: 'Fed Interest Rate',
    icon: '🏛️',
    category: 'News',
    description: 'What will the Fed do at the next FOMC meeting?',
    choices: [
      { label: 'Cut', percentage: 28, color: '#00ff88' },
      { label: 'Hold', percentage: 52, color: '#ffaa00' },
      { label: 'Hike', percentage: 20, color: '#ff4444' },
    ],
    totalStaked: 6.5,
    deadline: now + 72 * HOUR,
    status: 'OPEN',
    basePrice: 5.25,
    priceUnit: '%',
    recentBets: [
      { wallet: '0x9cA4...2eF7', choice: 'Hold', amount: 1.0, timestamp: '2m ago' },
      { wallet: '0x3dB8...6aC1', choice: 'Cut', amount: 0.5, timestamp: '5m ago' },
      { wallet: '0xe7F2...1bD5', choice: 'Hold', amount: 0.8, timestamp: '8m ago' },
      { wallet: '0x1aE6...4cB9', choice: 'Hike', amount: 0.3, timestamp: '12m ago' },
      { wallet: '0x5fC3...8dA2', choice: 'Hold', amount: 1.5, timestamp: '18m ago' },
      { wallet: '0xb2D1...7eF4', choice: 'Cut', amount: 0.6, timestamp: '22m ago' },
      { wallet: '0x8eA5...3fC8', choice: 'Hold', amount: 0.4, timestamp: '28m ago' },
      { wallet: '0x4bF9...9dE6', choice: 'Cut', amount: 1.4, timestamp: '35m ago' },
    ],
    roundHistory: [
      { round: 8, outcome: 'Hold', totalStaked: 5.8, timestamp: '6w ago' },
      { round: 7, outcome: 'Hold', totalStaked: 7.2, timestamp: '12w ago' },
      { round: 6, outcome: 'Hike', totalStaked: 4.9, timestamp: '18w ago' },
      { round: 5, outcome: 'Hold', totalStaked: 6.1, timestamp: '24w ago' },
      { round: 4, outcome: 'Cut', totalStaked: 8.3, timestamp: '30w ago' },
    ],
  },
  {
    id: 'ai-consensus',
    name: 'Global GDP Growth',
    icon: '🌍',
    category: 'Economy',
    description: 'Will global GDP growth exceed 3% in 2025? Resolved by dual-model AI consensus — GPT-4o and Gemini must both agree or the round stays unresolved.',
    choices: [
      { label: 'Yes', percentage: 41, color: '#00ff88' },
      { label: 'No', percentage: 59, color: '#ff4444' },
    ],
    totalStaked: 4.8,
    deadline: now + 48 * HOUR,
    status: 'OPEN',
    basePrice: 0,
    priceUnit: '',
    recentBets: [
      { wallet: '0xb3E1...7aF4', choice: 'Yes', amount: 0.8, timestamp: '3m ago' },
      { wallet: '0x5dC6...2eB9', choice: 'No', amount: 1.2, timestamp: '6m ago' },
      { wallet: '0xa8F3...4cD7', choice: 'Yes', amount: 0.3, timestamp: '10m ago' },
      { wallet: '0x2eA5...9fB1', choice: 'No', amount: 0.6, timestamp: '14m ago' },
      { wallet: '0x7cD9...1aE3', choice: 'No', amount: 0.5, timestamp: '19m ago' },
      { wallet: '0xf4B2...8dC6', choice: 'Yes', amount: 1.0, timestamp: '24m ago' },
      { wallet: '0x1aF7...5eD2', choice: 'No', amount: 0.2, timestamp: '30m ago' },
      { wallet: '0x6eC4...3bA8', choice: 'Yes', amount: 0.4, timestamp: '38m ago' },
    ],
    roundHistory: [
      { round: 6, outcome: 'No', totalStaked: 3.9, timestamp: '2d ago' },
      { round: 5, outcome: 'Yes', totalStaked: 5.2, timestamp: '4d ago' },
      { round: 4, outcome: 'No', totalStaked: 4.1, timestamp: '6d ago' },
      { round: 3, outcome: 'No', totalStaked: 3.5, timestamp: '8d ago' },
      { round: 2, outcome: 'Yes', totalStaked: 6.0, timestamp: '10d ago' },
    ],
  },
  {
    id: 'ondemand',
    name: 'SpaceX Starship Launch',
    icon: '🚀',
    category: 'Events',
    description: 'Will SpaceX Starship complete a successful orbital flight this month? Resolved on-demand by an authorized operator via signed HTTP request with ECDSA authentication.',
    choices: [
      { label: 'Yes', percentage: 50, color: '#00ff88' },
      { label: 'No', percentage: 50, color: '#ff4444' },
    ],
    totalStaked: 2.3,
    deadline: now + 12 * HOUR,
    status: 'OPEN',
    basePrice: 0,
    priceUnit: '',
    recentBets: [
      { wallet: '0xd1A5...8eC2', choice: 'Yes', amount: 0.5, timestamp: '8m ago' },
      { wallet: '0x4fB3...1aD7', choice: 'No', amount: 0.3, timestamp: '15m ago' },
      { wallet: '0x9eC8...5bF1', choice: 'Yes', amount: 0.7, timestamp: '22m ago' },
      { wallet: '0x3aD6...7cE4', choice: 'No', amount: 0.2, timestamp: '30m ago' },
      { wallet: '0x8bF2...4dA9', choice: 'Yes', amount: 0.1, timestamp: '40m ago' },
      { wallet: '0xe5C7...2fB3', choice: 'No', amount: 0.4, timestamp: '50m ago' },
      { wallet: '0x1dA4...6eC8', choice: 'Yes', amount: 0.3, timestamp: '1h ago' },
      { wallet: '0x7eB9...3aC5', choice: 'No', amount: 0.1, timestamp: '1h ago' },
    ],
    roundHistory: [
      { round: 3, outcome: 'Yes', totalStaked: 1.8, timestamp: '1d ago' },
      { round: 2, outcome: 'No', totalStaked: 2.5, timestamp: '3d ago' },
      { round: 1, outcome: 'Yes', totalStaked: 1.2, timestamp: '5d ago' },
    ],
  },
]

export interface UserBet {
  id: string
  marketId: string
  marketName: string
  choice: string
  amount: number
  status: 'Won' | 'Lost' | 'Pending'
  payout: number
  timestamp: string
}

export const initialUserBets: UserBet[] = [
  { id: 'b1', marketId: 'btc-usd', marketName: 'BTC / USD', choice: 'UP', amount: 0.5, status: 'Won', payout: 0.95, timestamp: '2h ago' },
  { id: 'b2', marketId: 'eth-usd', marketName: 'ETH / USD', choice: 'DOWN', amount: 0.3, status: 'Lost', payout: 0, timestamp: '4h ago' },
  { id: 'b3', marketId: 'nfl-game', marketName: 'NFL: Chiefs vs Ravens', choice: 'Chiefs', amount: 1.0, status: 'Pending', payout: 0, timestamp: '1h ago' },
  { id: 'b4', marketId: 'weather-nyc', marketName: 'NYC Rain Tomorrow', choice: 'No', amount: 0.2, status: 'Won', payout: 0.36, timestamp: '1d ago' },
  { id: 'b5', marketId: 'fed-rate', marketName: 'Fed Interest Rate', choice: 'Hold', amount: 0.8, status: 'Pending', payout: 0, timestamp: '30m ago' },
  { id: 'b6', marketId: 'aapl', marketName: 'AAPL Stock', choice: 'UP', amount: 0.4, status: 'Lost', payout: 0, timestamp: '1d ago' },
  { id: 'b7', marketId: 'ai-consensus', marketName: 'Global GDP Growth', choice: 'No', amount: 0.6, status: 'Won', payout: 1.14, timestamp: '2d ago' },
  { id: 'b8', marketId: 'ondemand', marketName: 'SpaceX Starship Launch', choice: 'Yes', amount: 0.3, status: 'Pending', payout: 0, timestamp: '4h ago' },
]
