import {
  cre,
  type CronPayload,
  type HTTPSendRequester,
  type Runtime,
  ConsensusAggregationByFields,
  median,
  identical,
  Runner,
  hexToBase64,
  bytesToHex,
  TxStatus,
  encodeCallMsg,
  LATEST_BLOCK_NUMBER,
} from "@chainlink/cre-sdk";
import { encodeFunctionData, decodeFunctionResult } from "viem";

// --- Config ---
export type Config = {
  schedule: string;
  symbol: string; // e.g. "AAPL"
  contractAddress: string;
  marketId: string;
  chainSelector: number;
};

// --- Contract ABI ---
const PREDICTION_MARKET_ABI = [
  {
    name: "getCurrentRound",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "marketId", type: "bytes32" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "resolveRound",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "marketId", type: "bytes32" },
      { name: "roundNum", type: "uint256" },
      { name: "winningChoice", type: "uint8" },
    ],
    outputs: [],
  },
] as const;

// --- Types ---
export interface StockPriceResult {
  price: number;
  previousClose: number;
  symbol: string;
  outcome: string; // "UP" or "DOWN"
}

// --- HTTP fetcher ---
export const fetchStockPrice = (
  sendRequester: HTTPSendRequester,
  url: string,
  symbol: string
): StockPriceResult => {
  const response = sendRequester
    .sendRequest({
      method: "GET",
      url,
      headers: { "User-Agent": "Mozilla/5.0" },
    })
    .result();

  if (response.statusCode !== 200) {
    throw new Error(`Yahoo Finance API returned status ${response.statusCode}`);
  }

  const body = Buffer.from(response.body).toString("utf-8");
  const data = JSON.parse(body);

  const result = data?.chart?.result?.[0];
  if (!result) {
    throw new Error(`No chart data for ${symbol}`);
  }

  const meta = result.meta;
  const price = meta.regularMarketPrice;
  const previousClose = meta.chartPreviousClose || meta.previousClose;

  if (price === undefined || previousClose === undefined) {
    throw new Error(`Missing price data for ${symbol}`);
  }

  const outcome = price >= previousClose ? "UP" : "DOWN";

  return { price, previousClose, symbol, outcome };
};

// --- Handler ---
export const onCronTrigger = (
  runtime: Runtime<Config>,
  _payload: CronPayload
): string => {
  runtime.log("Stock price workflow triggered");

  const { contractAddress, marketId, chainSelector, symbol } = runtime.config;

  // 1. Fetch stock price from Yahoo Finance
  const httpClient = new cre.capabilities.HTTPClient();
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;

  const result = httpClient
    .sendRequest(
      runtime,
      fetchStockPrice,
      ConsensusAggregationByFields<StockPriceResult>({
        price: median,
        previousClose: median,
        symbol: identical,
        outcome: identical,
      })
    )(url, symbol)
    .result();

  runtime.log(
    `${result.symbol}: $${result.price.toFixed(2)} (prev close: $${result.previousClose.toFixed(2)}), outcome=${result.outcome}`
  );

  // 2. Read current on-chain round
  const evmClient = new cre.capabilities.EVMClient(BigInt(chainSelector));

  const getCurrentRoundData = encodeFunctionData({
    abi: PREDICTION_MARKET_ABI,
    functionName: "getCurrentRound",
    args: [marketId as `0x${string}`],
  });

  const callMsg = encodeCallMsg({
    from: "0x0000000000000000000000000000000000000000",
    to: contractAddress as `0x${string}`,
    data: getCurrentRoundData,
  });

  const readResponse = evmClient
    .callContract(runtime, { call: callMsg, blockNumber: LATEST_BLOCK_NUMBER })
    .result();

  const currentRound = decodeFunctionResult({
    abi: PREDICTION_MARKET_ABI,
    functionName: "getCurrentRound",
    data: bytesToHex(readResponse.data),
  });

  runtime.log(`On-chain round: ${currentRound}`);

  // 3. Encode resolveRound call (UP = choice 0, DOWN = choice 1)
  const winningChoice = result.outcome === "UP" ? 0 : 1;

  const resolveCallData = encodeFunctionData({
    abi: PREDICTION_MARKET_ABI,
    functionName: "resolveRound",
    args: [
      marketId as `0x${string}`,
      BigInt(currentRound as bigint),
      winningChoice,
    ],
  });

  // 4. Generate signed report
  const report = runtime
    .report({
      encodedPayload: hexToBase64(resolveCallData),
      encoderName: "evm",
      signingAlgo: "ecdsa",
      hashingAlgo: "keccak256",
    })
    .result();

  // 5. Write onchain
  const writeResponse = evmClient
    .writeReport(runtime, {
      receiver: contractAddress,
      report: report,
      gasConfig: { gasLimit: "500000" },
    })
    .result();

  if (writeResponse.txStatus !== TxStatus.SUCCESS) {
    throw new Error(`resolveRound failed: ${writeResponse.errorMessage}`);
  }

  const txHash = bytesToHex(writeResponse.txHash || new Uint8Array(32));
  runtime.log(`Resolved! tx: ${txHash}`);

  return JSON.stringify({ ...result, winningChoice, txHash });
};

// --- Workflow init ---
export const initWorkflow = (config: Config) => {
  const cronTrigger = new cre.capabilities.CronCapability();

  return [
    cre.handler(
      cronTrigger.trigger({ schedule: config.schedule }),
      onCronTrigger
    ),
  ];
};

// --- Entry point ---
export async function main() {
  const runner = await Runner.newRunner<Config>();
  await runner.run(initWorkflow);
}
