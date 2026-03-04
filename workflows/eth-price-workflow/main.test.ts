import { describe, expect } from "bun:test";
import { newTestRuntime, test, HttpActionsMock, EvmMock } from "@chainlink/cre-sdk/test";
import { encodeFunctionResult } from "viem";
import { onCronTrigger, initWorkflow, type Config, type CryptoApiResponse } from "./main";

const CHAIN_SELECTOR = BigInt(99911155111);

const ABI = [
  {
    name: "getCurrentRound",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "marketId", type: "bytes32" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

function setupEvmMock(roundNumber: bigint) {
  const evmMock = EvmMock.testInstance(CHAIN_SELECTOR);

  const encodedRound = encodeFunctionResult({
    abi: ABI,
    functionName: "getCurrentRound",
    result: roundNumber,
  });
  const hexBytes = encodedRound.slice(2);
  const bytes = new Uint8Array(hexBytes.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
  const base64Data = Buffer.from(bytes).toString("base64");

  evmMock.callContract = (_input) => ({
    data: base64Data,
  });

  evmMock.writeReport = (_input) => ({
    txStatus: "TX_STATUS_SUCCESS",
    txHash: Buffer.from(new Uint8Array(32)).toString("base64"),
  });
}

const mockCoinGeckoResponse = (coinId: string, price: number): CryptoApiResponse => ({
  [coinId]: { usd: price },
});

const makeConfig = (coinId: string): Config => ({
  schedule: "0 */5 * * * *",
  coinId,
  apiUrl: "https://api.coingecko.com/api/v3/simple/price",
  contractAddress: "0xE9170EfBDB9B1B11d155B047a62EFfCCB09080F3",
  marketId: "0x0000000000000000000000000000000000000000000000000000000000000001",
  chainSelector: 99911155111,
});

describe("onCronTrigger", () => {
  test("returns UP when BTC price is above baseline", async () => {
    const runtime = newTestRuntime();
    runtime.config = makeConfig("bitcoin");

    const httpMock = HttpActionsMock.testInstance();
    httpMock.sendRequest = (_input) => ({
      statusCode: 200,
      body: new TextEncoder().encode(JSON.stringify(mockCoinGeckoResponse("bitcoin", 68100))),
      headers: {},
      multiHeaders: {},
    });

    setupEvmMock(BigInt(1));

    const result = onCronTrigger(runtime, { scheduledExecutionTime: new Date() });
    const parsed = JSON.parse(result);

    expect(parsed.coinId).toBe("bitcoin");
    expect(parsed.price).toBe(68100);
    expect(parsed.outcome).toBe("UP");
  });

  test("returns DOWN when ETH price is below baseline", async () => {
    const runtime = newTestRuntime();
    runtime.config = makeConfig("ethereum");

    const httpMock = HttpActionsMock.testInstance();
    httpMock.sendRequest = (_input) => ({
      statusCode: 200,
      body: new TextEncoder().encode(JSON.stringify(mockCoinGeckoResponse("ethereum", 3490))),
      headers: {},
      multiHeaders: {},
    });

    setupEvmMock(BigInt(1));

    const result = onCronTrigger(runtime, { scheduledExecutionTime: new Date() });
    const parsed = JSON.parse(result);

    expect(parsed.coinId).toBe("ethereum");
    expect(parsed.price).toBe(3490);
    expect(parsed.outcome).toBe("DOWN");
  });
});

describe("initWorkflow", () => {
  test("returns one handler with correct cron schedule", async () => {
    const handlers = initWorkflow(makeConfig("bitcoin"));

    expect(handlers).toBeArray();
    expect(handlers).toHaveLength(1);
    expect(handlers[0].trigger.config.schedule).toBe("0 */5 * * * *");
  });
});
