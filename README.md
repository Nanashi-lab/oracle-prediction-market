# Oracle — Decentralized Prediction Market Platform

A decentralized prediction market where users bet on real-world outcomes using crypto. **Chainlink CRE** (Compute Runtime Environment) is the oracle layer — it fetches real-world data, verifies it cryptographically across a decentralized network, and writes the result onchain. The smart contract then automatically pays winners.

Built for the [Chainlink Convergence Hackathon](https://chain.link/hackathon) (Feb 6 – Mar 8, 2025).

**Track:** Prediction Markets | **Bonus:** Tenderly Virtual TestNets

---

## Architecture

```
User places bet via MetaMask (Frontend)
        ↓
Smart Contract holds funds (Tenderly Virtual TestNet)
        ↓
Round timer expires / Event fires / Admin triggers
        ↓
CRE Workflow fires (cron / EVM log / HTTP trigger)
        ↓
CRE fetches result from external API (HTTP / AI / Confidential)
        ↓
CRE writes verified result onchain (signed report → EVM write)
        ↓
Smart Contract reads result → pays winners automatically
        ↓
Frontend updates (wallet balance changes, round resolved)
```

---

## Project Structure

```
chainlink/
├── frontend/      React + Vite — trading terminal UI, MetaMask wallet integration
├── server/        Express API — Alpha price feed (random walk simulation)
├── contracts/     Solidity + Hardhat — PredictionMarket.sol, deploy & resolve scripts
└── workflows/     CRE workflows — 10 oracle pipelines covering all trigger types
```

---

## Markets & CRE Workflows

| # | Market | Workflow | Trigger | Data Source | CRE Features |
|---|--------|----------|---------|-------------|--------------|
| 1 | Alpha (dev) | `alpha-workflow` | Cron | Internal server | HTTPClient, EVM read/write, median consensus |
| 2 | BTC/USD | `crypto-price-workflow` | Cron | CoinGecko API | HTTPClient, EVM read/write, median consensus |
| 3 | ETH/USD | `eth-price-workflow` | Cron | CoinGecko API | HTTPClient, EVM read/write, median consensus |
| 4 | AAPL Stock | `stock-price-workflow` | Cron | Yahoo Finance | HTTPClient, EVM read/write, median consensus |
| 5 | NFL Game | `sports-workflow` | EVM Log | Gemini AI + Google Search | LogTrigger, Secrets, AI grounding, identical consensus |
| 6 | NYC Weather | `weather-workflow` | Cron | OpenWeatherMap | **ConfidentialHTTPClient**, Secrets, identical consensus |
| 7 | Fed Rate | `ai-news-workflow` | Cron | Gemini AI + Google Search | HTTPClient, Secrets, AI grounding, identical consensus |
| 8 | AI Consensus | `multi-model-workflow` | Cron | Gemini + OpenAI | Multi-model FBA pattern, dual Secrets, identical consensus |
| 9 | On-Demand | `ondemand-workflow` | HTTP | Admin request payload | **HTTP Trigger**, ECDSA auth, EVM read/write |
| 10 | Audit Trail | `audit-trail-workflow` | EVM Log | Onchain events → Firestore | LogTrigger, Secrets, Firebase REST API |

**All 3 CRE trigger types demonstrated:** Cron (scheduled), EVM Log (event-driven), HTTP Inbound (user-initiated).

---

## Tech Stack

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS
- **Smart Contracts:** Solidity 0.8.24 + Hardhat
- **CRE Workflows:** TypeScript (CRE SDK)
- **Blockchain:** Tenderly Virtual TestNet (chain ID `99911155111`)
- **Wallet:** MetaMask (connected to Tenderly network)
- **AI:** Google Gemini (with Search grounding) + OpenAI GPT-4o
- **External APIs:** CoinGecko, Yahoo Finance, OpenWeatherMap, Firebase/Firestore

---

## Quick Start

### Prerequisites

- Node.js 24 (`nvm use` — `.nvmrc` included)
- MetaMask browser extension
- [CRE CLI](https://docs.chain.link/cre/getting-started/overview) (for workflow simulation)

### Run the Platform

```bash
# Terminal 1 — API server (must start first)
cd server && npm install && npm run dev

# Terminal 2 — Frontend (opens at http://localhost:5173)
cd frontend && npm install && npm run dev

# Terminal 3 — Auto-resolve oracle (resolves rounds on-chain)
cd contracts && npm install && npx hardhat run scripts/auto-resolve.ts --network tenderly
```

### Simulate a CRE Workflow

```bash
cd workflows
cp .env.example .env   # Add your API keys

# Install deps for a workflow
cd alpha-workflow && bun install && cd ..

# Simulate (requires server running for alpha-workflow)
cre workflow simulate alpha-workflow --target=staging-settings
```

### Run Workflow Tests

```bash
cd workflows/alpha-workflow
bun test
```

---

## Deployed Contract (Tenderly Virtual TestNet)

- **Contract:** `0xE9170EfBDB9B1B11d155B047a62EFfCCB09080F3`
- **Owner/Oracle:** `0x3ee04776dd69D5D0E1E9D18e9D1012F271808eF3`
- **Network:** Tenderly Virtual Sepolia (chain ID `99911155111`)

See [Tenderly.md](./Tenderly.md) for full network details and market IDs.

---

## Chainlink Files

All files that use Chainlink CRE:

| File | Purpose |
|------|---------|
| [`workflows/alpha-workflow/main.ts`](./workflows/alpha-workflow/main.ts) | Alpha price oracle — cron + HTTP + EVM read/write |
| [`workflows/crypto-price-workflow/main.ts`](./workflows/crypto-price-workflow/main.ts) | BTC price oracle — CoinGecko + EVM |
| [`workflows/eth-price-workflow/main.ts`](./workflows/eth-price-workflow/main.ts) | ETH price oracle — CoinGecko + EVM |
| [`workflows/stock-price-workflow/main.ts`](./workflows/stock-price-workflow/main.ts) | AAPL stock oracle — Yahoo Finance + EVM |
| [`workflows/sports-workflow/main.ts`](./workflows/sports-workflow/main.ts) | Sports oracle — EVM Log trigger + Gemini AI |
| [`workflows/weather-workflow/main.ts`](./workflows/weather-workflow/main.ts) | Weather oracle — ConfidentialHTTPClient + OpenWeatherMap |
| [`workflows/ai-news-workflow/main.ts`](./workflows/ai-news-workflow/main.ts) | AI news oracle — Gemini + Google Search grounding |
| [`workflows/multi-model-workflow/main.ts`](./workflows/multi-model-workflow/main.ts) | Multi-model AI — Gemini + OpenAI dual consensus |
| [`workflows/ondemand-workflow/main.ts`](./workflows/ondemand-workflow/main.ts) | On-demand settlement — HTTP trigger + ECDSA auth |
| [`workflows/audit-trail-workflow/main.ts`](./workflows/audit-trail-workflow/main.ts) | Audit trail — EVM Log trigger + Firestore |
| [`workflows/project.yaml`](./workflows/project.yaml) | CRE project config (RPCs, experimental chains) |
| [`workflows/secrets.yaml`](./workflows/secrets.yaml) | CRE secrets definitions |
| [`contracts/contracts/PredictionMarket.sol`](./contracts/contracts/PredictionMarket.sol) | Solidity prediction market contract |

---

## Environment Variables

Copy `workflows/.env.example` to `workflows/.env` and fill in your keys:

| Variable | Required By | Source |
|----------|-------------|--------|
| `GEMINI_API_KEY` | ai-news, sports, multi-model | [Google AI Studio](https://aistudio.google.com/apikey) |
| `OPENAI_API_KEY` | multi-model | [OpenAI](https://platform.openai.com/api-keys) |
| `OPEN_WEATHER_API_KEY` | weather | [OpenWeatherMap](https://openweathermap.org/api) |
| `FIREBASE_API_KEY` | audit-trail | [Firebase Console](https://console.firebase.google.com) |
| `FIREBASE_PROJECT_ID` | audit-trail | Firebase Console |

---

## License

Built for the Chainlink Convergence Hackathon 2025.
