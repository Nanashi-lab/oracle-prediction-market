import {
  cre,
  type CronPayload,
  type Runtime,
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
  schedule: string;
  city: string;
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
export interface WeatherResult {
  isRaining: boolean;
  description: string;
  weatherCode: number;
}

// --- Weather fetcher (uses ConfidentialHTTPClient) ---
export const fetchWeather = (
  runtime: Runtime<Config>,
  apiKey: string
): WeatherResult => {
  const { city } = runtime.config;
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;

  const client = new cre.capabilities.ConfidentialHTTPClient();
  const response = client
    .sendRequest(runtime, {
      request: {
        url,
        method: "GET",
      },
    })
    .result();

  if (response.statusCode !== 200) {
    const errorBody = Buffer.from(response.body).toString("utf-8");
    throw new Error(`OpenWeatherMap API returned status ${response.statusCode}: ${errorBody}`);
  }

  const body = Buffer.from(response.body).toString("utf-8");
  const data = JSON.parse(body);

  // Weather condition codes: 2xx = thunderstorm, 3xx = drizzle, 5xx = rain, 6xx = snow
  // See: https://openweathermap.org/weather-conditions
  const weatherCode: number = data.weather?.[0]?.id ?? 800;
  const description: string = data.weather?.[0]?.description ?? "unknown";

  // Rain = codes 200-531 (thunderstorm, drizzle, rain) or 600-622 (snow)
  const isRaining = weatherCode >= 200 && weatherCode < 600;

  return { isRaining, description, weatherCode };
};

// --- Handler ---
export const onCronTrigger = (
  runtime: Runtime<Config>,
  _payload: CronPayload
): string => {
  runtime.log("Weather workflow triggered");

  const { contractAddress, marketId, chainSelector } = runtime.config;

  // 1. Fetch weather using ConfidentialHTTPClient (API key stays protected)
  const apiKey = runtime.getSecret({ id: "OPEN_WEATHER_API_KEY" }).result();
  const weather = fetchWeather(runtime, apiKey.value);

  runtime.log(`Weather in ${runtime.config.city}: ${weather.description} (code: ${weather.weatherCode}), raining: ${weather.isRaining}`);

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

  // 3. Map weather result to choice index
  // YES (raining) = choice 0, NO (not raining) = choice 1
  const winningChoice = weather.isRaining ? 0 : 1;

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

  return JSON.stringify({ ...weather, winningChoice, txHash });
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
