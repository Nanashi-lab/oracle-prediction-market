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
  alphaApiUrl: string;
  contractAddress: string;
  marketId: string;
  chainSelector: number;
};

// --- Contract ABI (only the functions we need) ---
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
export interface AlphaPriceResponse {
  price: number;
  targetPrice: number;
  roundNumber: number;
  roundRemaining: number;
  roundDuration: number;
  time: number;
}

export interface AlphaResult {
  price: number;
  targetPrice: number;
  roundNumber: number;
  outcome: string; // "UP" or "DOWN"
}

// --- HTTP fetcher (runs per-node, consensus aggregates results) ---
export const fetchAlphaPrice = (
  sendRequester: HTTPSendRequester,
  url: string
): AlphaResult => {
  const response = sendRequester
    .sendRequest({ method: "GET", url })
    .result();

  if (response.statusCode !== 200) {
    throw new Error(`Alpha API returned status ${response.statusCode}`);
  }

  const body = Buffer.from(response.body).toString("utf-8");
  const data: AlphaPriceResponse = JSON.parse(body);

  const outcome = data.price >= data.targetPrice ? "UP" : "DOWN";

  return {
    price: data.price,
    targetPrice: data.targetPrice,
    roundNumber: data.roundNumber,
    outcome,
  };
};

// --- Handler ---
export const onCronTrigger = (
  runtime: Runtime<Config>,
  _payload: CronPayload
): string => {
  runtime.log("Alpha workflow triggered");

  const { contractAddress, marketId, chainSelector } = runtime.config;

  // 1. Fetch price from Alpha server
  const httpClient = new cre.capabilities.HTTPClient();

  const result = httpClient
    .sendRequest(
      runtime,
      fetchAlphaPrice,
      ConsensusAggregationByFields<AlphaResult>({
        price: median,
        targetPrice: median,
        roundNumber: median,
        outcome: identical,
      })
    )(runtime.config.alphaApiUrl)
    .result();

  runtime.log(`Round ${result.roundNumber}: price=$${result.price.toFixed(2)}, target=$${result.targetPrice.toFixed(2)}, outcome=${result.outcome}`);

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

  // 3. Encode resolveRound call
  const winningChoice = result.outcome === "UP" ? 0 : 1;

  const resolveCallData = encodeFunctionData({
    abi: PREDICTION_MARKET_ABI,
    functionName: "resolveRound",
    args: [marketId as `0x${string}`, BigInt(currentRound as bigint), winningChoice],
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
