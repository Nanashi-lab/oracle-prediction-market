import {
  cre,
  type Runtime,
  type HTTPPayload,
  consensusIdenticalAggregation,
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
  contractAddress: string;
  chainSelector: number;
  authorizedPublicKey: string;
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
export interface SettlementRequest {
  marketId: string;
  roundNum: number;
  winningChoice: number;
}

// --- Parse and validate the HTTP payload ---
export const parseSettlementRequest = (payload: HTTPPayload): SettlementRequest => {
  const inputJson = Buffer.from(payload.input).toString("utf-8");
  const parsed = JSON.parse(inputJson);

  if (!parsed.marketId || typeof parsed.marketId !== "string") {
    throw new Error("Missing or invalid marketId (expected bytes32 hex string)");
  }
  if (typeof parsed.roundNum !== "number" || parsed.roundNum < 0) {
    throw new Error("Missing or invalid roundNum (expected non-negative number)");
  }
  if (typeof parsed.winningChoice !== "number" || parsed.winningChoice < 0) {
    throw new Error("Missing or invalid winningChoice (expected non-negative number)");
  }

  return {
    marketId: parsed.marketId,
    roundNum: parsed.roundNum,
    winningChoice: parsed.winningChoice,
  };
};

// --- Handler ---
export const onHttpTrigger = (
  runtime: Runtime<Config>,
  payload: HTTPPayload
): string => {
  runtime.log("On-demand settlement workflow triggered via HTTP");

  const { contractAddress, chainSelector } = runtime.config;

  // 1. Parse the incoming request
  const request = parseSettlementRequest(payload);
  runtime.log(
    `Settlement request: market=${request.marketId}, round=${request.roundNum}, choice=${request.winningChoice}`
  );

  // 2. Read current on-chain round to verify
  const evmClient = new cre.capabilities.EVMClient(BigInt(chainSelector));

  const getCurrentRoundData = encodeFunctionData({
    abi: PREDICTION_MARKET_ABI,
    functionName: "getCurrentRound",
    args: [request.marketId as `0x${string}`],
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

  runtime.log(`On-chain current round: ${currentRound}`);

  // 3. Encode resolveRound calldata
  const resolveCallData = encodeFunctionData({
    abi: PREDICTION_MARKET_ABI,
    functionName: "resolveRound",
    args: [
      request.marketId as `0x${string}`,
      BigInt(request.roundNum),
      request.winningChoice,
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

  return JSON.stringify({
    marketId: request.marketId,
    roundNum: request.roundNum,
    winningChoice: request.winningChoice,
    txHash,
  });
};

// --- Workflow init ---
export const initWorkflow = (config: Config) => {
  const httpTrigger = new cre.capabilities.HTTPCapability();

  return [
    cre.handler(
      httpTrigger.trigger({
        authorizedKeys: [
          {
            type: "KEY_TYPE_ECDSA_EVM",
            publicKey: config.authorizedPublicKey,
          },
        ],
      }),
      onHttpTrigger
    ),
  ];
};

// --- Entry point ---
export async function main() {
  const runner = await Runner.newRunner<Config>();
  await runner.run(initWorkflow);
}
